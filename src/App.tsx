import './App.css'

import Canvas from './component/Canvas'
import PropertyBar from './component/PropertyBar'
import SideBar from './component/SideBar'
import { EditorProvider } from '@/lib/bridge/EditorProvider'

function App() {
    return (
        <div className="main-container">
            <header className={'header'}>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-600 rounded-md rotate-12 flex items-center justify-center text-[10px] text-white">CR</div>
                    <span>Catalyst Reactor</span>
                </div>
            </header>
            <EditorProvider>
                <main className={'workspace'}>
                    <SideBar />
                    <Canvas />
                    <PropertyBar />
                </main>
            </EditorProvider>
        </div>
    )
}

export default App
