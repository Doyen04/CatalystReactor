import React, { forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: React.ReactNode
    tip?: string
    active?: boolean
}

const MoreButton = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ tip, icon, className, children, active, ...props }, ref) => {

        const baseStyles = 'py-2 px-0.25 rounded-md transition-colors duration-200'
        const activeStyles = active
            ? 'border-grey-500 bg-gray-500/50 text-grey-400'
            : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'

        return (
            <div className='relative group flex items-center rounded-sm'>
                <button ref={ref}
                    className={twMerge(`${baseStyles} ${activeStyles}`, className)}
                    {...props}>
                    {icon}
                </button>
                {
                    tip &&
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

            </div>

        )
    }
)

MoreButton.displayName = 'Button'

export default MoreButton