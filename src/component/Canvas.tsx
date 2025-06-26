import style from "./Component.module.css"
import ToolBar from "./ToolBar"

function Canvas() {

    return (
        <div className={style.canvasContainer}>
            <canvas className={style.canvas}>
                Your browser does not support the HTML5 canvas tag.
            </canvas>
            <div className={style.overlay}>
                <ToolBar />
            </div>
        </div>
    )
}

export default Canvas
