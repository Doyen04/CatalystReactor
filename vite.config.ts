import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { ViteAliases } from 'vite-aliases'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        ViteAliases({
            dir: 'src',
            prefix: '@',
            deep: true,
        }),
    ],
    server: {
        watch: {
            usePolling: true,
        },
    },
})
