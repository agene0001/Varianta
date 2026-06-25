import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// @tauri-apps/cli sets this when running `tauri dev` against a physical device.
const host = process.env.TAURI_DEV_HOST

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  // Tauri expects a fixed port and fails if it's not available.
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: 'ws', host, port: 1421 }
      : undefined,
    watch: {
      // Don't reload the frontend when the Rust backend changes.
      ignored: ['**/src-tauri/**'],
    },
  },

  // Expose TAURI_ENV_* vars to the frontend.
  envPrefix: ['VITE_', 'TAURI_ENV_*'],

  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS/Linux.
    // safari14 is the real floor: chess.js uses BigInt literals (Safari 14+).
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari14',
    // Don't minify for debug builds. Vite 8 (rolldown) picks its default
    // minifier (oxc) when this is `true`; forcing 'esbuild' would require a
    // separate esbuild install.
    minify: !process.env.TAURI_ENV_DEBUG,
    // Produce sourcemaps for debug builds.
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})
