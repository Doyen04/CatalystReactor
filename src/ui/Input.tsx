import React, { forwardRef, HTMLInputTypeAttribute, ReactNode, useState } from 'react'
import { twMerge } from 'tailwind-merge'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    title?: string;
    icon?: ReactNode
    value: number;
    objKey: string;
    type: HTMLInputTypeAttribute;
    callBack: (key: string, value:number) => void
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ title, icon, type, objKey, callBack, className, value, ...props }, ref) => {
        const [current, setCurrentValue] = useState(value)

        return (
            <aside className={twMerge(`rounded-md bg-gray-200 flex h-fit w-fit
            items-center gap-1 p-0.5 border border-transparent
             hover:border-gray-500 hover:focus-within:border-blue-500 
             transition-colors ${className}`)}>
                <p className="px-1 font-semibold text-gray-700">{title ?? icon}</p>
                <input
                    ref={ref}
                    type={type}
                    value={current}
                    onChange={(e) => setCurrentValue(Number(e.currentTarget.value))}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            callBack(objKey, current)
                        }
                    }}
                    className="w-12 bg-transparent text-gray-900 text-sm font-mono border-none focus:outline-none"
                    {...props}
                />
            </aside>

        )
    }
)

Input.displayName = 'Input'

export default Input