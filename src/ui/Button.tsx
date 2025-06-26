import React, { forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline'
    size?: 'sm' | 'md' | 'lg'
    icon?: React.ReactNode
    tip?: string
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ tip, icon, className, children, ...props }, ref) => {

        return (
            <div className='relative group'>
                <button ref={ref} className={twMerge(`w-fit h-fit p-1.5 rounded-lg border border-gray-600 ${className}`)} {...props}>
                    {icon}
                    {children}
                </button>
                {
                    tip &&
                    <span className='hidden absolute left-1/2 -translate-x-1/2 -top-9 group-hover:block rounded-md bg-gray-900 text-white text-xs whitespace-nowrap px-2 py-1 shadow-lg z-50 after:content-[""] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-gray-900'>
                        {tip}
                    </span>
                }

            </div>

        )
    }
)

Button.displayName = 'Button'

export default Button