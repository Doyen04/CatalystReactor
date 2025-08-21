import { GradientFill, GradientStop } from '@lib/types/shapes'
import { twMerge } from 'tailwind-merge'
import SimpleColorInput from './SimpleColorPicker'
import Input from './Input'
import { Minus, Plus } from 'lucide-react'

interface ColorStopProps {
    className?: string
    gradient: GradientFill
    removeStop(index: number)
    handleStopChange: (
        index: number,
        field: keyof GradientStop,
        value: string | number
    ) => void
    addStop: () => void
}

const ColorStops: React.FC<ColorStopProps> = ({
    className,
    gradient,
    addStop,
    removeStop,
    handleStopChange,
}) => {
    return (
        <div className={twMerge(`flex flex-col gap-1 w-full ${className}`)}>
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">
                    Color Stops
                </label>
                <button
                    onClick={addStop}
                    disabled={gradient.stops.length >= 10}
                    className="p-1 w-6 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add color stop"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto ">
                {gradient.stops.map((stop, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-2 p-1 bg-gray-50 rounded"
                    >
                        <SimpleColorInput
                            fill={stop.color}
                            onChange={fill => {
                                handleStopChange(index, 'color', fill)
                            }}
                        />
                        <div className="flex-1 min-w-0">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={stop.offset}
                                onChange={e =>
                                    handleStopChange(
                                        index,
                                        'offset',
                                        Number(e.target.value)
                                    )
                                }
                                className="w-full"
                            />
                        </div>
                        <Input
                            title="%"
                            className="w-14 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            type="number"
                            min={0}
                            max={100}
                            value={Math.round(stop.offset * 100)}
                            onChange={value =>
                                handleStopChange(index, 'offset', value / 100)
                            }
                        />

                        {gradient.stops.length > 2 && (
                            <button
                                onClick={() => removeStop(index)}
                                className="p-1 rounded hover:bg-red-100 text-red-600"
                                title="Remove color stop"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ColorStops
