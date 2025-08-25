import { useToolStore } from '@hooks/useTool'
import React, { forwardRef, useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    tool: {
        toolName: string
        icon: React.ReactNode
        tip: string
    }
    group: Array<{
        toolName: string
        icon: React.ReactNode
        tip: string
    }>
    active?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ tool, className, group, children, active, ...props }, ref) => {
    const { setTool, tool: currentTool } = useToolStore()

    const isActive = group.some(grouptool => currentTool.toolName === grouptool.toolName)

    tool = isActive ? currentTool : tool

    const buttonStyles = useMemo(() => {
        const baseStyles = 'w-fit h-fit p-1.5 rounded-lg border transition-colors duration-200'
        const activeStyles = isActive ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'

        return `${baseStyles} ${activeStyles}`
    }, [isActive])

    return (
        <div className="flex items-center gap-0.5 h-fit w-fit">
            <div className="relative group">
                <button
                    ref={ref}
                    onClick={() => {
                        if (currentTool.toolName !== tool.toolName) setTool(tool)
                    }}
                    className={twMerge(buttonStyles, className)}
                    {...props}
                >
                    {tool.icon}
                    {children}
                </button>
                {tool.tip && (
                    <span
                        className='hidden absolute left-1/2 -translate-x-1/2 
                    -top-9 group-hover:block rounded-md bg-gray-900 
                    text-white text-xs whitespace-nowrap px-2 py-1 
                    shadow-lg z-50 after:content-[""] after:absolute 
                    after:top-full after:left-1/2 after:-translate-x-1/2 
                    after:border-4 after:border-transparent 
                    after:border-t-gray-900'
                    >
                        {tool.tip}
                    </span>
                )}
            </div>
        </div>
    )
})

Button.displayName = 'Button'

export default Button
