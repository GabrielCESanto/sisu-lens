import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sirv from 'sirv'
import { fileURLToPath } from 'node:url'

// Em desenvolvimento, /data/* serve os Parquet da camada gold gerados pelo ETL (com suporte a Range,
// que o DuckDB-WASM usa para baixar só os pedaços necessários). Em produção, VITE_DATA_URL aponta
// para o dataset no Hugging Face.
const gold = fileURLToPath(new URL('../data/gold', import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'sisu-lens-dados-locais',
      configureServer(server) {
        server.middlewares.use('/data', sirv(gold, { dev: true }))
      },
      configurePreviewServer(server) {
        server.middlewares.use('/data', sirv(gold, { dev: true }))
      },
    },
  ],
})
