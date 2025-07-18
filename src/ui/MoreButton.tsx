import { useToolStore } from '@hooks/useTool'
import { Check, ChevronDown } from 'lucide-react'
import React, { forwardRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    tools: Array<{
        toolName: string
        icon: React.ReactNode
        tip: string
    }>
    tip: string
}

const MoreButton = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ tools, tip, className, children, ...props }, ref) => {

        const { setTool, tool: currentTool } = useToolStore()
        const [isDropdownOpen, setIsDropdownOpen] = useState(false)

        const isActive = tools.some(tool => currentTool.toolName === tool.toolName)

        const baseStyles = 'py-2 px-0.25 rounded-md transition-colors duration-200'
        const activeStyles = isActive
            ? 'border-grey-500 bg-gray-500/50 text-grey-400'
            : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'

        const handleToolSelect = (tool: { toolName: string; icon: React.ReactNode; tip: string }) => {
            if (currentTool.toolName !== tool.toolName) setTool(tool)
            setIsDropdownOpen(false)
        }
        return (
            <div className='relative group flex items-center rounded-sm'>
                <button ref={ref}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={twMerge(`${baseStyles} ${activeStyles}`, className)}
                    {...props}>

                    <ChevronDown className="w-3 h-3" />
                </button>
                {
                    (tip && !isDropdownOpen) &&
                    <span className='hidden absolute left-1/2 -translate-x-1/2 
                    -top-9 group-hover:block rounded-md bg-gray-900 
                    text-white text-xs whitespace-nowrap px-2 py-1 
                    shadow-lg z-50 after:content-[""] after:absolute 
                    after:top-full after:left-1/2 after:-translate-x-1/2 
                    after:border-4 after:border-transparent 
                    after:border-t-gray-900'>
                        {tip}
                    </span>
                }
                {isDropdownOpen && (
                    <div className="absolute bottom-9 left-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 min-w-max">
                        {tools.map((tool, index) => (
                            <button
                                key={tool.toolName}
                                onClick={() => handleToolSelect(tool)}
                                className={twMerge(
                                    "flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 transition-colors",
                                    index === 0 && "rounded-t-md",
                                    index === tools.length - 1 && "rounded-b-md",
                                )}
                            >
                                {tool.icon}
                                <span>{tool.tip}</span>
                                {currentTool.toolName === tool.toolName && (
                                    <Check className="w-4 h-4 text-white" />)}
                            </button>
                        ))}
                    </div>
                )}

                {isDropdownOpen && (
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsDropdownOpen(false)}
                    />
                )}

            </div>

        )
    }
)

MoreButton.displayName = 'Button'

export default MoreButton