import { invoke } from "@tauri-apps/api/core";

// Engine (Stockfish) configuration, backed by Tauri commands.
const inTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** The resolved engine path (stored override, else auto-detected), or null. */
export async function getEnginePath(): Promise<string | null> {
  if (!inTauri) return null;
  return await invoke<string | null>("get_engine_path");
}

/** Store an explicit engine path override. */
export async function setEnginePath(path: string): Promise<void> {
  if (!inTauri) return;
  await invoke("set_engine_path", { path });
}

/** Launch the engine to confirm it speaks UCI. Returns null on success, else an error message. */
export async function verifyEngine(path: string): Promise<string | null> {
  if (!inTauri) return "Engine verification requires the desktop app.";
  try {
    await invoke("verify_engine", { path });
    return null;
  } catch (e) {
    return String(e);
  }
}
