import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import path from 'path'


// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          '@/lib/core': path.resolve(__dirname, './src/lib/core/index.ts'),
          '@/lib/shapes': path.resolve(__dirname, './src/lib/shapes/index.ts'),
          '@/lib/modifiers': path.resolve(__dirname, './src/lib/modifiers/index.ts'),
          '@/lib/tools': path.resolve(__dirname, './src/lib/tools/index.ts'),
        },
      },
})
