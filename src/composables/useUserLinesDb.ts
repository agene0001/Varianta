// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - sql.js has no types
import initSqlJs from "sql.js";
import type { Opening, Line } from "../types/chess";
import {
  parsePgnFile,
  openingNameToId,
  isBuiltInOpeningId,
} from "../utils/pgnParser";

const IDB_NAME = "chessreps-db";
const IDB_STORE = "sqlite";

export interface StoredUserLines {
  linesByOpening: Record<string, Line[]>;
  newOpenings: Opening[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null;
let initPromise: Promise<void> | null = null;

/** Initialize SQLite (load WASM, create/load DB from IndexedDB). Call once on app mount. */
export async function initUserLinesDb(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const SQL = await initSqlJs({
      // Load from our own /public so we don't depend on sql.js.org's CDN
      // (which currently 404s on these wasm paths).
      locateFile: (file: string) => `/${file}`,
    });

    const saved = await loadFromIndexedDB();
    db = saved ? new SQL.Database(saved) : new SQL.Database();

    db.run(`
      CREATE TABLE IF NOT EXISTS user_openings (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT ''
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS user_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        opening_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        moves_json TEXT NOT NULL
      )
    `);

    if (!saved) {
      await migrateFromLocalStorage();
    }
  })();

  return initPromise;
}

async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(IDB_STORE)) {
        idb.close();
        resolve(null);
        return;
      }
      const tx = idb.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const getReq = store.get("db");
      getReq.onsuccess = () => resolve(getReq.result ?? null);
      getReq.onerror = () => resolve(null);
      tx.oncomplete = () => idb.close();
    };
    req.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore(IDB_STORE);
    };
  });
}

async function saveToIndexedDB(): Promise<void> {
  if (!db) return;
  const data = db.export();
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const idb = req.result;
      const tx = idb.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(data, "db");
      tx.oncomplete = () => {
        idb.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
    req.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore(IDB_STORE);
    };
  });
}

/** Migrate legacy localStorage data into SQLite (one-time). */
async function migrateFromLocalStorage(): Promise<void> {
  try {
    const raw = localStorage.getItem("chessreps-user-lines");
    if (!raw) return;
    const data = JSON.parse(raw) as StoredUserLines;
    for (const [openingId, lines] of Object.entries(data.linesByOpening)) {
      for (const line of lines) {
        insertLine(openingId, line);
      }
    }
    for (const opening of data.newOpenings) {
      db!.run(
        "INSERT OR IGNORE INTO user_openings (id, name, description) VALUES (?, ?, ?)",
        [opening.id, opening.name, opening.description]
      );
      for (const line of opening.lines) {
        insertLine(opening.id, line);
      }
    }
    localStorage.removeItem("chessreps-user-lines");
    await saveToIndexedDB();
  } catch {
    // ignore migration errors
  }
}

function insertLine(openingId: string, line: Line): void {
  db!.run(
    "INSERT INTO user_lines (opening_id, name, description, moves_json) VALUES (?, ?, ?, ?)",
    [openingId, line.name, line.description ?? "", JSON.stringify(line.moves)]
  );
}

function ensureDb() {
  if (!db) throw new Error("Database not initialized. Call initUserLinesDb() first.");
  return db;
}

/** Load all user lines from the database. */
export function loadUserLines(): StoredUserLines {
  const database = ensureDb();
  const result: StoredUserLines = { linesByOpening: {}, newOpenings: [] };
  const linesByUserOpening: Record<string, Line[]> = {};

  const userOpeningIds = new Set<string>();
  const openRows = database.exec("SELECT id FROM user_openings");
  if (openRows.length > 0 && openRows[0].values) {
    for (const row of openRows[0].values) {
      userOpeningIds.add(row[0] as string);
    }
  }

  const lineRows = database.exec(
    "SELECT opening_id, name, description, moves_json FROM user_lines ORDER BY id"
  );
  if (lineRows.length > 0 && lineRows[0].values) {
    for (const row of lineRows[0].values) {
      const [openingId, name, description, movesJson] = row;
      const line: Line = {
        name: name as string,
        description: (description as string) || "",
        moves: JSON.parse(movesJson as string),
      };
      if (userOpeningIds.has(openingId as string)) {
        linesByUserOpening[openingId as string] =
          linesByUserOpening[openingId as string] ?? [];
        linesByUserOpening[openingId as string].push(line);
      } else {
        result.linesByOpening[openingId as string] =
          result.linesByOpening[openingId as string] ?? [];
        result.linesByOpening[openingId as string].push(line);
      }
    }
  }

  const openInfo = database.exec(
    "SELECT id, name, description FROM user_openings"
  );
  if (openInfo.length > 0 && openInfo[0].values) {
    for (const row of openInfo[0].values) {
      const [id, name, description] = row;
      result.newOpenings.push({
        id: id as string,
        name: name as string,
        description: (description as string) || "",
        lines: linesByUserOpening[id as string] ?? [],
      });
    }
  }

  return result;
}

/** Merge file-based openings with user lines from the database. */
export function mergeUserLines(
  fileOpenings: Opening[],
  stored: StoredUserLines
): Opening[] {
  const result: Opening[] = fileOpenings.map((o) => ({
    ...o,
    lines: [...o.lines, ...(stored.linesByOpening[o.id] ?? [])],
  }));
  return [...result, ...stored.newOpenings];
}

/** Add a line to an existing (file) opening. */
export async function addLineToExistingOpening(
  openingId: string,
  line: Line
): Promise<void> {
  ensureDb();
  insertLine(openingId, line);
  await saveToIndexedDB();
}

/** Add a new user-created opening with its first line. */
export async function addNewOpening(opening: Opening): Promise<void> {
  const database = ensureDb();
  database.run(
    "INSERT INTO user_openings (id, name, description) VALUES (?, ?, ?)",
    [opening.id, opening.name, opening.description]
  );
  for (const line of opening.lines) insertLine(opening.id, line);
  await saveToIndexedDB();
}

/** Add a line to an existing user-created opening. */
export async function addLineToNewOpening(
  openingId: string,
  line: Line
): Promise<void> {
  ensureDb();
  insertLine(openingId, line);
  await saveToIndexedDB();
}

/** Export user lines as JSON and trigger download. */
export function exportUserLinesAsFile(
  filename = "chessreps-user-lines.json"
): { success: boolean; message: string } {
  const data = loadUserLines();
  const hasAny =
    Object.keys(data.linesByOpening).length > 0 || data.newOpenings.length > 0;
  if (!hasAny) {
    return { success: false, message: "No custom lines to export." };
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  return { success: true, message: "Exported successfully." };
}

/** Convert parsed PGN results to StoredUserLines format. */
function pgnResultsToStoredUserLines(
  results: { openingName: string; line: Line }[]
): StoredUserLines {
  const linesByOpening: Record<string, Line[]> = {};
  const newOpeningsMap: Record<string, { name: string; lines: Line[] }> = {};

  for (const { openingName, line } of results) {
    const id = openingNameToId(openingName);
    if (isBuiltInOpeningId(id)) {
      linesByOpening[id] = linesByOpening[id] ?? [];
      linesByOpening[id].push(line);
    } else {
      if (!newOpeningsMap[id]) {
        newOpeningsMap[id] = { name: openingName, lines: [] };
      }
      newOpeningsMap[id].lines.push(line);
    }
  }

  const newOpenings: Opening[] = Object.entries(newOpeningsMap).map(
    ([id, { name, lines }]) => ({
      id,
      name,
      description: `Imported from Chess.com`,
      lines,
    })
  );

  return { linesByOpening, newOpenings };
}

/** Import user lines from JSON or PGN (Chess.com format). Merges with existing (skips duplicates by move sequence). */
export async function importUserLinesFromFile(file: File): Promise<{
  success: boolean;
  message: string;
  imported: { lines: number; openings: number };
}> {
  ensureDb();
  const text = await file.text();
  let data: StoredUserLines;

  if (text.trim().startsWith("{")) {
    try {
      data = JSON.parse(text) as StoredUserLines;
    } catch {
      return {
        success: false,
        message: "Invalid JSON file.",
        imported: { lines: 0, openings: 0 },
      };
    }
  } else {
    const pgnResults = parsePgnFile(text);
    if (pgnResults.length === 0) {
      return {
        success: false,
        message: "No valid PGN found. Expected Chess.com format with [Opening \"...\"] and moves.",
        imported: { lines: 0, openings: 0 },
      };
    }
    data = pgnResultsToStoredUserLines(pgnResults);
  }

  const existing = loadUserLines();
  const existingSequences = new Set<string>();
  for (const lines of Object.values(existing.linesByOpening)) {
    for (const l of lines) {
      existingSequences.add(l.moves.map((m) => m.san).join(" "));
    }
  }
  for (const o of existing.newOpenings) {
    for (const l of o.lines) {
      existingSequences.add(l.moves.map((m) => m.san).join(" "));
    }
  }

  let linesAdded = 0;
  let openingsAdded = 0;

  for (const [openingId, lines] of Object.entries(data.linesByOpening ?? {})) {
    for (const line of lines) {
      const seq = line.moves.map((m) => m.san).join(" ");
      if (existingSequences.has(seq)) continue;
      insertLine(openingId, line);
      existingSequences.add(seq);
      linesAdded++;
    }
  }

  for (const opening of data.newOpenings ?? []) {
    const exists = existing.newOpenings.some((o) => o.id === opening.id);
    if (!exists) {
      db!.run(
        "INSERT OR IGNORE INTO user_openings (id, name, description) VALUES (?, ?, ?)",
        [opening.id, opening.name, opening.description]
      );
      openingsAdded++;
    }
    for (const line of opening.lines) {
      const seq = line.moves.map((m) => m.san).join(" ");
      if (existingSequences.has(seq)) continue;
      insertLine(opening.id, line);
      existingSequences.add(seq);
      linesAdded++;
    }
  }

  await saveToIndexedDB();
  return {
    success: true,
    message: `Imported ${linesAdded} lines and ${openingsAdded} new openings.`,
    imported: { lines: linesAdded, openings: openingsAdded },
  };
}
