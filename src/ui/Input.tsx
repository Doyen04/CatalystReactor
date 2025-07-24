import React, { ChangeEvent, forwardRef, HTMLInputTypeAttribute, useMemo } from 'react'
import { twMerge } from 'tailwind-merge'
import ColorPicker from './ColorPicker';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    title: string;
    value: number | string ;
    objKey: string;
    type: HTMLInputTypeAttribute;
    callBack: (e: ChangeEvent<HTMLInputElement>, key: string) => void
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ title, type, objKey, callBack, className, value, ...props }, ref) => {

        if (type === 'color') {
            return (
                <aside className="rounded-md bg-gray-200 h-fit w-fit flex items-center
                gap-1 p-0.5 border border-transparent
                 hover:border-gray-500 hover:focus-within:border-blue-500 
                 transition-colors">
                    <p className="px-1 font-bold text-xs text-gray-700">{title}</p>
                    <ColorPicker
                        value={value as string}
                        onChange={(color) => {
                            const mockEvent = { currentTarget: { value: color } } as ChangeEvent<HTMLInputElement>;
                            callBack(mockEvent, objKey);
                        }}
                    />
                </aside>
            );
        }

        return (
            <aside className={twMerge(`rounded-md bg-gray-200 flex h-fit w-fit
            items-center gap-1 p-0.5 border border-transparent
             hover:border-gray-500 hover:focus-within:border-blue-500 
             transition-colors ${className}`)}>
                <p className="px-1 font-semibold text-gray-700">{title}</p>
                <input
                    ref={ref}
                    type={type}
                    value={value}
                    onChange={(e) => callBack(e, objKey)}
                    className="w-12 bg-transparent text-gray-900 text-sm font-mono border-none focus:outline-none"
                    {...props}
                />
            </aside>

        )
    }
)

Input.displayName = 'Input'

export default Input