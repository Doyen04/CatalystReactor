import { defineConfig } from 'vitest/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
const tsconfig = JSON.parse(readFileSync(resolve(root, 'tsconfig.json'), 'utf8')) as {
    compilerOptions?: { baseUrl?: string, paths?: Record<string, string[]> }
}
const baseUrl = tsconfig.compilerOptions?.baseUrl ?? '.'
const paths = tsconfig.compilerOptions?.paths ?? {}

const alias = Object.entries(paths).map(([key, values]) => ({
    find: new RegExp(`^${key.replace(/\*/g, '(.*)')}$`),
    replacement: resolve(root, baseUrl, values[0].replace(/\*/g, '$1')),
}))

export default defineConfig({
    resolve: { alias },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
})
