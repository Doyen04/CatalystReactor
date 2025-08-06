import { getDisplayTextFromFill, extractFillValue, imageValue, arrayBufferToDataUrl, getBackgroundStyleFromFillValue, colorValue } from '@/util/getBackgroundFill';
import { Fill } from '@lib/types/shapes';
import { FileImage, Paintbrush2 } from 'lucide-react';
import React, { forwardRef, useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import BackgroundImagePicker from './backgroundImagePicker';
import ColorPicker from './ColorPicker';

type TabType = 'color' | "image"

interface ColorInputProps extends React.InputHTMLAttributes<HTMLDivElement> {
    fill: Fill;
    objKey: string;
    callBack: (key: string, value: ArrayBuffer | string | number[]) => void
}

//vaue can eithher be arraybuffer or string |number[] or liner guys

const ColorInput = forwardRef<HTMLInputElement, ColorInputProps>(
    ({ objKey, callBack, className, fill, ...props }, ref) => {
        const [isOpen, setIsOpen] = useState(false);
        const [activeTab, setActiveTab] = useState<TabType>('color');
        const [imageUrl, setImageUrl] = useState<string | null>(null);

        const fillValue = extractFillValue(fill)
        const name = getDisplayTextFromFill(fill)

        let backgroundStyle;

        useEffect(() => {
            if (fill.type === 'image' || fill.type === 'pattern') {
                const url = arrayBufferToDataUrl(imageValue(fillValue.value));
                if (imageUrl && imageUrl !== url) {
                    URL.revokeObjectURL(imageUrl);
                }
                setImageUrl(url);
            } else {
                if (imageUrl) {
                    URL.revokeObjectURL(imageUrl);
                    setImageUrl(null);
                }
            }
        }, [fill.type, fillValue.value, imageUrl]);

        if (fill.type === 'image' || fill.type === 'pattern') {
            backgroundStyle = getBackgroundStyleFromFillValue(fillValue.value, fill, imageUrl);
        } else {
            backgroundStyle = getBackgroundStyleFromFillValue(fillValue.value, fill)
        }

        useEffect(() => {
            return () => {
                if (imageUrl) {
                    URL.revokeObjectURL(imageUrl);
                }
            };
        }, [imageUrl])

        return (
            <div className={`relative ${className}`}>
                <aside onClick={() => setIsOpen(!isOpen)} className={twMerge(`rounded-md bg-gray-200 flex h-fit w-fit
            items-center gap-1 p-0.5 border border-transparent cursor-pointer
             hover:border-gray-500 hover:focus-within:border-blue-500 
             transition-colors ${className}`)}>
                    <p className="font-semibold text-gray-700 h-4 w-4 rounded-sm"
                        style={{ ...backgroundStyle }}></p>
                    <div
                        ref={ref}
                        className="w-10 bg-transparent text-gray-900 text-sm font-mono border-none focus:outline-none"
                        {...props}
                    >{name}</div>
                </aside>

                {isOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}>
                        <div onClick={(e) => e.stopPropagation()} className="absolute bottom-10 right-65 z-50 bg-white rounded-lg shadow-lg shadow-gray-500 w-fit h-fit pt-3">

                            <div className='flex items-center gap-1 p-2 w-full h-9 mb-2 border-b-1 border-t-1 border-b-[#e6e6e6] border-t-[#e6e6e6]'>
                                <button
                                    onClick={() => setActiveTab('color')}
                                    className={`p-1 rounded hover:bg-gray-100 ${activeTab === 'color' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                                >
                                    <Paintbrush2 className='w-4 h-4' />
                                </button>

                                <button
                                    onClick={() => setActiveTab('image')}
                                    className={`p-1 rounded hover:bg-gray-100 ${activeTab === 'image' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                                >
                                    <FileImage className='w-4 h-4' />
                                </button>
                            </div>
                            {(activeTab == 'color') &&
                                <ColorPicker value={colorValue(fillValue.value)} isOpen={isOpen}
                                    onColorChange={(color) => {
                                        callBack(objKey, color);
                                    }} />
                            }
                            {(activeTab == 'image') &&
                                <BackgroundImagePicker value={imageValue(fillValue.value)}
                                    onImageChange={(ArrayBuffer) => {
                                        callBack(objKey, ArrayBuffer);
                                    }} />}

                        </div>
                    </div>
                )}
            </div>

        )
    }
)

ColorInput.displayName = 'div'

export default ColorInput



