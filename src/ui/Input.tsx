import React, { forwardRef, HTMLInputTypeAttribute, ReactNode, useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    title?: string;
    icon?: ReactNode
    value: number;
    type: HTMLInputTypeAttribute;
    className?: string;
    onChange: (value: number) => void
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ title, icon, type, onChange, className, value, ...props }, ref) => {
        const [current, setCurrentValue] = useState(value)

        useEffect(()=>{
            setCurrentValue(value)
        },[value])
        
        return (
            <aside className={twMerge(`rounded-sm bg-gray-200 flex h-fit w-fit
            items-center gap-1 p-0.5 border border-transparent
             hover:border-gray-500 hover:focus-within:border-blue-500 
             transition-colors ${className}`)}>
                <p className="px-1 font-medium text-gray-700 text-sm">{title ?? icon}</p>
                <input
                    ref={ref}
                    type={type}
                    value={current}
                    onChange={(e) => setCurrentValue(Number(e.currentTarget.value))}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            onChange(current)
                        }
                    }}
                    className="w-full bg-transparent text-gray-900 text-xs font-mono border-none focus:outline-none"
                    {...props}
                />
            </aside>

        )
    }
)

Input.displayName = 'Input'

export default Input