type RenderRequest = () => void

let current: RenderRequest | null = null

export function setRenderRequest(request: RenderRequest | null): void {
    current = request
}

export function requestRender(): void {
    current?.()
}
