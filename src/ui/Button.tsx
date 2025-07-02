import React, { forwardRef, useId, useMemo } from 'react'
import { twMerge } from 'tailwind-merge'
import MoreButton from './MoreButton'
import { ChevronDown } from 'lucide-react'
import { useMoreToolsStore } from '../hooks/useShowMoreTool'
import { useToolStore } from '../hooks/useTool'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    moreToolsTips?: string
    icon?: React.ReactNode
    tip?: string
    toolname: string
    active?: boolean
    moreTools?: Array<{
        toolName: string
        icon: React.ReactNode
        tip: string
    }>
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ tip, moreToolsTips, toolname, icon, className, children, active, moreTools, ...props }, ref) => {

        const buttonId = useId()
        const { openToolsId, toggleTools, setOpenToolsId } = useMoreToolsStore()
        const { tool: currentToolName, setTool } = useToolStore()
        const [currentTool, setCurrentTool] = React.useState(moreTools?.[0])

        const activeToolName = useMemo(() => {
            const name = currentTool?.toolName ?? toolname
            return name
        }, [currentTool?.toolName, toolname])

        const buttonStyles = useMemo(() => {
            const baseStyles = 'w-fit h-fit p-1.5 rounded-lg border transition-colors duration-200'
            const activeStyles = currentToolName === activeToolName
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'

            return `${baseStyles} ${activeStyles}`
        }, [currentToolName, activeToolName, className])

        const displayIcon = useMemo(() =>
            currentTool?.icon || icon,
            [currentTool?.icon, icon]
        )

        const displayTip = useMemo(() =>
            currentTool?.tip || tip,
            [currentTool?.tip, tip]
        )

        return (
            <div className='flex items-center gap-0.5 h-fit w-fit'>
                <div className='relative group'>
                    <button ref={ref} onClick={() => { console.log(activeToolName); setTool(activeToolName) }}
                        className={twMerge(`${buttonStyles}`, className)}
                        {...props}
                    >
                        {displayIcon}
                        {children}
                    </button>
                    {
                        (displayTip) &&
                        <span className='hidden absolute left-1/2 -translate-x-1/2 
                    -top-9 group-hover:block rounded-md bg-gray-900 
                    text-white text-xs whitespace-nowrap px-2 py-1 
                    shadow-lg z-50 after:content-[""] after:absolute 
                    after:top-full after:left-1/2 after:-translate-x-1/2 
                    after:border-4 after:border-transparent 
                    after:border-t-gray-900'>
                            {displayTip}
                        </span>
                    }
                </div>
                {
                    (moreTools && moreTools?.length > 0) &&
                    <div>
                        <MoreButton tip={moreToolsTips}
                            icon={<ChevronDown className='w-3 h-4' />}
                            active={(openToolsId === buttonId)}
                            onClick={() => toggleTools(buttonId)}
                        />
                        {openToolsId === buttonId && (
                            <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-1 min-w-38 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 py-1'>
                                {moreTools.map((tool, index) => (
                                    <button
                                        key={index}
                                        className='w-full px-3 py-2 text-left hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-200 transition-colors'
                                        onClick={() => {
                                            setOpenToolsId(null)
                                            setTool(tool.toolName)
                                            setCurrentTool(tool)
                                        }}
                                        title={tool.tip}
                                    >
                                        {tool.icon}
                                        <span>{tool.toolName}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                }
            </div>

        )
    }
)

Button.displayName = 'Button'

export default Button