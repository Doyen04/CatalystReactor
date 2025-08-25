import { SolidFill } from '@lib/types/shapes'
import React, { forwardRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import ColorPicker from './ColorPicker'
import { colorValue } from '@/util/getBackgroundFill'

interface SimpleColorInputProps extends Omit<React.HtmlHTMLAttributes<HTMLDivElement>, 'onChange'> {
    fill: string
    onChange: (value: string) => void
}

const SimpleColorInput = forwardRef<HTMLDivElement, SimpleColorInputProps>(({ onChange, className, fill, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className={`relative ${className}`}>
            <aside
                onClick={() => setIsOpen(!isOpen)}
                className={twMerge(`rounded-sm bg-gray-200 flex h-fit w-fit
            items-center gap-1 p-0.5 border border-transparent cursor-pointer
             hover:border-gray-500 hover:focus-within:border-blue-500 
             transition-colors ${className}`)}
            >
                <p className="font-semibold text-gray-700 h-4 w-4 rounded-sm" style={{ background: fill }}></p>
                <div ref={ref} className="w-fit pr-1 bg-transparent text-gray-900 text-xs font-mono border-none focus:outline-none" {...props}>
                    {fill}
                </div>
            </aside>

            {isOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}>
                    <div
                        onClick={e => e.stopPropagation()}
                        className="absolute bottom-10 right-65 z-50 bg-white rounded-lg shadow-lg shadow-gray-500 w-fit h-fit  max-w-[280px] pt-3"
                    >
                        <ColorPicker
                            value={{ type: 'solid', color: fill } as SolidFill}
                            isOpen={isOpen}
                            onColorChange={color => {
                                onChange(colorValue(color.color))
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
})

SimpleColorInput.displayName = 'ColorInput'

export default SimpleColorInput
