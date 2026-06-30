# Varianta

A chess opening **repertoire trainer** — build your repertoire, drill it with spaced
repetition, and explore lines. Built as a **Tauri 2** desktop app with a **Vue 3 +
Vite** frontend and a Rust backend. It's also the shell for *Gambit* (game-import +
engine analysis), whose Rust crates will live alongside the storage crate under
`crates/`.

## Prerequisites

- **bun** (package manager + task runner)
- **Rust** ≥ 1.85 (the workspace is edition 2024)
- **macOS** (current target; Tauri can target Windows/Linux later)
- The repo lives on an exFAT external drive, so Cargo's build output is redirected
  to an APFS disk image mounted at `/Volumes/Build`. Mount it with **`mount-build`**
  (installed at `~/.local/bin`) — once per login session. Without it, Rust builds
  fail trying to write to `/Volumes/Build`. See [Why the build volume?](#why-the-build-volume).

## Quick start

```sh
mount-build          # once per login session — mounts the build cache
bun install (or npm install)          # once, or after dependency changes
bun run tauri dev (or npm run tauri dev)    # launch the desktop app (hot-reloading Vue UI in a native window)
```

## Commands

| Command | What it does |
|---|---|
| `bun run tauri dev` | Run the **desktop app** (Vite dev server + Rust shell, hot reload) |
| `bun run dev` | Run **only the Vue frontend** in a browser at `localhost:5173` (no native backend) |
| `bun run tauri build` | Produce a distributable bundle *(currently blocked — see Known issues)* |
| `bun run build` | Type-check + build the frontend *(currently blocked — see Known issues)* |
| `cargo test --workspace` | Run Rust tests (needs `mount-build` first) |
| `cargo check --workspace` | Type-check the Rust workspace (needs `mount-build` first) |

## Project layout

```
.
├── src/                      # Vue 3 frontend (components, composables, services)
├── src-tauri/                # Tauri app crate — window + command handlers
├── crates/
│   └── varianta-storage/     # Local SQLite persistence (repertoire) via dbkit-rs
├── Cargo.toml                # Rust workspace root
├── gambit_product_spec.md    # Spec for the Gambit analysis platform (future)
└── .cargo/config.toml        # Machine-local: redirects build target to /Volumes/Build
```

The frontend talks to the Rust backend through Tauri **commands** (`invoke(...)`).
Storage commands today: `get_user_lines`, `add_line`, `add_opening`.

## Data location

The local database is created at the macOS app data dir:

```
~/Library/Application Support/com.agene.varianta/varianta.db
```

It's a plain SQLite file (schema: `user_openings`, `user_lines`) — identical to the
old browser sql.js schema, so an exported sql.js database imports without conversion.

## Status

- ✅ Tauri 2 shell wrapping the Vue app; Cargo workspace ready for Gambit crates
- ✅ Native SQLite storage backend (`varianta-storage` on `dbkit-rs`), with commands + tests
- 🚧 Wiring the UI (`useUserLinesDb.ts`) to the native commands — in progress; until
  then the desktop window uses the legacy browser sql.js storage

### Known issues

- `bun run tauri build` / `bun run build` fail the `vue-tsc` type-check on two
  pre-existing errors (`App.vue` unused `totalMoves`, `Drill.vue` `MoveStep` vs
  `string`). `tauri dev` is unaffected (the dev server skips type-checking).

## Why the build volume?

macOS writes AppleDouble (`._*`) companion files for extended attributes on exFAT,
and `tauri-build` panics when it globs one as a permission file. The internal disk
lacks the space to host the build cache. The fix is a shared **APFS sparse image**
(native xattrs, no `._*` files) on the external drive, mounted at `/Volumes/Build`
via `mount-build`. Build artifacts there; source stays on the repo drive.
