import React from 'react'

interface Tab {
    id: string
    label: string
}

interface TabsProps {
    tabs: Tab[]
    activeTab: string
    onTabChange: (id: string) => void
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
    return (
        <div className="flex w-full border-b border-[#333]">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}

export default Tabs
