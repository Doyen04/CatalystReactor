import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
// import wasm from 'vite-plugin-wasm';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        // wasm(), // Enable WASM support :cite[3]
        viteStaticCopy({ // Copy WASM binaries to build output
            targets: [
                {
                    src: 'node_modules/canvaskit-wasm/bin/canvaskit.wasm',
                    dest: 'assets'
                }
            ]
        })
    ],
    // build: {
    //     commonjsOptions: {
    //         include: ['/canvaskit-wasm/']
    //     },
    //     target: 'esnext'// Required for WASM modules :cite[2]:cite[4]
    // },
})
