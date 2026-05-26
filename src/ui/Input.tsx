import clamp from '@lib/helper/clamp'
import React, { forwardRef, HTMLInputTypeAttribute, ReactNode, useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    title?: string
    icon?: ReactNode
    value: number
    type: HTMLInputTypeAttribute
    className?: string
    onChange: (value: number) => void
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ title, icon, type, onChange, className, value, ...props }, ref) => {
    const [current, setCurrentValue] = useState(value)

    const handleChange = (num: number) => {
        const vl = props.min != undefined && props.max != undefined ? clamp(num, props.min as number, props.max as number) : num
        setCurrentValue(vl)
    }

    useEffect(() => {
        setCurrentValue(value)
    }, [value])

    return (
        <div
            className={twMerge(`rounded-md bg-[#222222] flex h-7 w-full 
         items-center gap-1 px-1.5 border border-[#333] 
         hover:border-[#444] focus-within:border-blue-500/50 
             transition-all ${className}`)}
        >
            {React.isValidElement(icon) ? (
                <div className="flex items-center justify-center text-[#777] min-w-[16px]">
                    {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 14 })}
                </div>
            ) : title ? (
                <div className="flex items-center justify-center text-[#777] text-[10px] font-bold uppercase min-w-[12px]">
                    {title}
                </div>
            ) : null}
            <input
                ref={ref}
                type={type}
                value={current}
                onChange={e => handleChange(Number(e.currentTarget.value))}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        onChange(current)
                        e.currentTarget.blur()
                    }
                }}
                onBlur={() => onChange(current)}
                className="flex-1 w-full bg-transparent text-[#e0e0e0] text-xs font-medium border-none focus:outline-none"
                {...props}
            />
        </div>
    )
})

Input.displayName = 'Input'

export default Input

