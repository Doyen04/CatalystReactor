import './App.css'

import Canvas from './component/Canvas'
import PropertyBar from './component/PropertyBar'
import SideBar from './component/SideBar'

function App() {

    return (
        <div className='main-container'>
            <header className={'header'}>
            </header>
            <main className={'workspace'}>
                <SideBar />
                <Canvas />
                <PropertyBar />
            </main>
        </div>
    )
}

export default App
