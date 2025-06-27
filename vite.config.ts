import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
// import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        // viteStaticCopy({ // Copy WASM binaries to build output
        //     targets: [
        //         {
        //             src: 'node_modules/canvaskit-wasm/bin/canvaskit.wasm',
        //             dest: 'assets'
        //         }
        //     ]
        // })
    ],
})
