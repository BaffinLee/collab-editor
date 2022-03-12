import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import monacoEditorPlugin from "vite-plugin-monaco-editor"
import checker from 'vite-plugin-checker'
import svgr from '@honkhonk/vite-plugin-svgr'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3124,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3123',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/socket': {
        target: 'ws://localhost:3123',
        ws: true,
      },
    },
    // config for github.dev port forward env
    hmr: process.env.GITHUB_CODESPACE_TOKEN ? {
      clientPort: 443,
    } : undefined,
  },
  plugins: [
    react(),
    monacoEditorPlugin(),
    checker({ typescript: true }),
    svgr(),
  ],
})
