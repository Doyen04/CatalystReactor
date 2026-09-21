import React from 'react'
import { twMerge } from 'tailwind-merge'

interface DirectionControlProps<T> {
    className?: string
    directions: readonly T[]
    applyPosition: (preset: T) => void
}

function DirectionControls<T extends { icon: React.ComponentType<{ className?: string }> } | null>({
    className,
    directions,
    applyPosition,
}: DirectionControlProps<T>) {
    return (
        <div className={twMerge(`flex flex-col items-center gap-1 bg-gray-100 rounded p-1 ${className}`)}>
            <label className="text-xs font-bold text-gray-800 text-left rounded pl-0.5">Direction</label>
            <div className="grid grid-cols-3 gap-y-1 gap-x-0.5">
                {directions.map((preset, index) => (
                    <button
                        key={index}
                        disabled={!preset}
                        onClick={() => applyPosition(preset)}
                        className="w-fit h-fit p-1 text-xs bg-white border border-gray-300 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                    >
                        {preset ? <preset.icon className="w-4 h-4" /> : <div className="w-4 h-4"></div>}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default DirectionControls
