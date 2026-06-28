// One-time migration helper: export your old browser-stored repertoire.
//
// The original app stored your custom lines in the browser's IndexedDB (a
// serialized sql.js SQLite database). The Tauri desktop app uses its own native
// database in a different storage origin, so it can't see that data directly.
// This script pulls the old database out and downloads it as a .sqlite file,
// which you then load via the desktop app's "Import" button.
//
// HOW TO RUN
//   1. Open the OLD app in the SAME browser where you used it
//      (e.g. `bun run dev`, then http://localhost:5173).
//   2. Open DevTools → Console.
//   3. Paste this whole file and press Enter.
//   4. It downloads `varianta-legacy.sqlite` (or tells you there's nothing to export).
//   5. In the desktop app: Import → pick `varianta-legacy.sqlite`.

(async () => {
  const IDB_NAME = "chessreps-db";
  const IDB_STORE = "sqlite";

  const blob = await new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(IDB_STORE)) {
        idb.close();
        resolve(null);
        return;
      }
      const tx = idb.transaction(IDB_STORE, "readonly");
      const getReq = tx.objectStore(IDB_STORE).get("db");
      getReq.onsuccess = () => resolve(getReq.result ?? null);
      getReq.onerror = () => reject(getReq.error);
      tx.oncomplete = () => idb.close();
    };
  });

  if (!blob) {
    console.warn(
      "[varianta] No legacy repertoire database found in this origin's IndexedDB. " +
        "Make sure you're on the same site where you saved your lines."
    );
    return;
  }

  const bytes = blob instanceof Uint8Array ? blob : new Uint8Array(blob);
  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/octet-stream" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "varianta-legacy.sqlite";
  a.click();
  URL.revokeObjectURL(url);
  console.log(
    `[varianta] Exported ${bytes.byteLength} bytes → varianta-legacy.sqlite. ` +
      "Import it in the desktop app."
  );
})();
