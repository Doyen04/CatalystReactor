import './App.css'

import Canvas from './component/Canvas'
import PropertyBar from './component/PropertyBar'
import SideBar from './component/SideBar'
import { CanvasManagerProvider } from './hooks/useCanvasManager'

function App() {
    return (
        <div className="main-container">
            <header className={'header'}>44544ffff</header>
            <CanvasManagerProvider>
                <main className={'workspace'}>
                    <SideBar />
                    <Canvas />
                    <PropertyBar />
                </main>
            </CanvasManagerProvider>
        </div>
    )
}

export default App
