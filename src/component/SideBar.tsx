import React, { useState } from 'react'
import './Component.css'
import Tabs from '@ui/Tabs'
import LayersPanel from './LayersPanel'
import { LayoutGrid, Library } from 'lucide-react'

function SideBar() {
    const [activeTab, setActiveTab] = useState('layers')

    const tabs = [
        { id: 'layers', label: 'Layers' },
        { id: 'assets', label: 'Assets' }
    ]

    return (
        <div className={'sidebar'}>
            <div className="flex-1 flex flex-col overflow-hidden">
                <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                
                <div className="flex-1 flex flex-col overflow-hidden bg-[#161616]">
                    {activeTab === 'layers' && <LayersPanel />}
                    {activeTab === 'assets' && (
                        <div className="p-4 text-center text-gray-600 text-xs mt-10">
                            Assets coming soon
                        </div>
                    )}
                </div>
            </div>

            <div className="h-10 border-t border-[#333] flex items-center justify-around text-gray-500">
                <LayoutGrid size={18} className="cursor-pointer hover:text-white transition-colors" />
                <Library size={18} className="cursor-pointer hover:text-white transition-colors" />
            </div>
        </div>
    )
}

export default SideBar

