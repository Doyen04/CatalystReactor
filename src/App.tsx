import styles from './App.module.css'

import Canvas from './component/Canvas'
import PropertyBar from './component/PropertyBar'
import SideBar from './component/SideBar'

function App() {

    return (
        <div className={styles.container}>
            <header className={styles.header}>
            </header>
            <main className={styles.workspace}>
                <SideBar />
                <Canvas />
                <PropertyBar />
            </main>
        </div>
    )
}

export default App
