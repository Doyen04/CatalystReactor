import { Canvas, Surface } from 'canvaskit-wasm'
import SceneManager from './SceneManager'
import CanvasKitResources from './CanvasKitResource'
import PaintManager from './PaintManager'
import type InputManager from './InputManager'
import type { InputCallbacks } from './InputManager'
import { FrameScheduler } from '@/engine/render/FrameScheduler'
import { setRenderRequest } from '@/engine/render/renderRequest'

class Renderer {
    sceneManager: SceneManager
    surf: Surface | null
    canvasEl: HTMLCanvasElement
    inputManager: InputManager

    dpr: number = window.devicePixelRatio || 1
    skCnvs: Canvas

    private paintManager: PaintManager
    private scheduler: FrameScheduler
    private bootRafId: number | null = null
    private destroyed = false

    private inputCallbacks?: InputCallbacks

    constructor(canvasEl: HTMLCanvasElement, sceneManager: SceneManager, paintManager: PaintManager, inputManager: InputManager) {
        this.canvasEl = canvasEl
        this.sceneManager = sceneManager
        this.surf = null
        this.paintManager = paintManager
        this.inputManager = inputManager

        this.scheduler = new FrameScheduler(this.drawFrame)
        setRenderRequest(this.requestRender)

        this.setUpEvent()

        this.setUpRendering()
    }

    setUpEvent() {
        this.removeEvent()
        this.addEvent()
    }

    // Stable bound references for targeted unsubscribe
    private boundSetUpRendering = this.setUpRendering.bind(this)

    removeEvent() {
        if (this.inputCallbacks) {
            this.inputManager.unsubscribe(this.inputCallbacks)
            this.inputCallbacks = undefined
        }
    }

    addEvent() {
        this.inputCallbacks = {
            onResize: this.boundSetUpRendering,
        }
        this.inputManager.subscribe(this.inputCallbacks)
    }

    get resource(): CanvasKitResources {
        const resources = CanvasKitResources.getInstance()
        if (resources) {
            return resources
        } else {
            console.log('resources is null')

            return null
        }
    }

    setUpRendering() {
        this.scheduler.stop()
        if (this.bootRafId !== null) {
            cancelAnimationFrame(this.bootRafId)
        }
        this.bootRafId = requestAnimationFrame(() => {
            this.bootRafId = null
            if (this.destroyed) return
            this.makeSurface()
            this.scheduler.start()
        })
    }

    makeSurface() {
        if (!this.resource) {
            console.log('resoures not found in renderer')

            return
        }

        this.dpr = window.devicePixelRatio || 1

        const { width, height } = getComputedStyle(this.canvasEl)
        console.log(width, height)

        this.canvasEl.width = parseInt(width) * this.dpr
        this.canvasEl.height = parseInt(height) * this.dpr // set canvas height

        if (!this.resource.canvasKit) throw new Error('CanvasKit not initialized')

        if (this.surf) {
            this.surf.delete()
            this.surf = null
        }

        try {
            this.surf = this.resource.canvasKit.MakeWebGLCanvasSurface(this.canvasEl)
            console.log(this.surf)

            if (!this.surf) {
                throw new Error('Failed to create WebGL surface - surface is null')
            }

            this.skCnvs = this.surf.getCanvas()
            console.log('WebGL surface created successfully')
        } catch (error) {
            console.error('Failed to create WebGL surface Try fallback to CPU surface', error)

            // Try fallback to CPU surface
            try {
                console.log('Attempting gl v1 surface fallback...')
                this.surf = this.resource.canvasKit.MakeWebGLCanvasSurface(this.canvasEl, null, {
                    majorVersion: 1,
                    minorVersion: 1,
                })

                // this.surf = this.resource.canvasKit.MakeCanvasSurface(this.canvasEl);

                if (!this.surf) {
                    throw new Error('Failed to create gl v1 surface - surface is null')
                }

                this.skCnvs = this.surf.getCanvas()
                console.log('gl v1 surface created successfully as fallback')
            } catch (fallbackError) {
                console.error('Both WebGL and CPU surface creation failed:', fallbackError)
                throw new Error(`Could not create CanvasKit surface: WebGL failed (${error.message}), CPU fallback failed (${fallbackError.message})`)
            }
        }
    }

    requestRender = () => {
        this.scheduler.request()
    }

    private drawFrame = () => {
        if (this.destroyed) return
        this.render()
    }

    render(skCnvs?: Canvas) {
        skCnvs = skCnvs ? skCnvs : this.skCnvs
        if (!this.resource.canvasKit || !this.surf || !skCnvs) {
            console.log('log error with surface')

            return
        }

        skCnvs.clear(this.resource.canvasKit.TRANSPARENT)
        skCnvs!.save()
        skCnvs.scale(this.dpr, this.dpr)

        const rect = this.resource.canvasKit.LTRBRect(10, 10, 250, 100)
        const size = { width: 240, height: 90 }
        skCnvs!.drawRect(
            rect,
            this.paintManager.getPaint({
                color: { type: 'solid', color: [60, 0, 0, 0.3] },
                opacity: 1,
                size,
            })
        )
        skCnvs!.drawRect(
            rect,
            this.paintManager.getPaint({
                color: { type: 'solid', color: [0, 255, 0, 1] },
                opacity: 1,
                size,
                stroke: true,
                strokeWidth: 2,
            })
        )

        this.sceneManager.draw(skCnvs)

        skCnvs!.restore()
        this.surf.flush()
    }

    destroy() {
        this.destroyed = true
        this.scheduler.stop()
        if (this.bootRafId !== null) {
            cancelAnimationFrame(this.bootRafId)
            this.bootRafId = null
        }
        setRenderRequest(null)

        // Clean up surface
        if (this.surf) {
            this.surf.delete()
            this.surf = null
        }
        this.canvasEl = null
        this.sceneManager = null
        this.removeEvent()
    }
}

export default Renderer
