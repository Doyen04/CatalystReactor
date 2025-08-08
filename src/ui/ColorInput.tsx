import { getDisplayTextFromFill, extractFillValue, imageValue, arrayBufferToDataUrl, getBackgroundStyleFromFillValue } from '@/util/getBackgroundFill';
import { Fill, FillType, GradientFill, ImageFill, SolidFill } from '@lib/types/shapes';
import { FileImage, Paintbrush2, Zap } from 'lucide-react';
import React, { forwardRef, useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import BackgroundImagePicker from './backgroundImagePicker';
import ColorPicker from './ColorPicker';
import GradientPicker from './GradientPicker';


interface ColorInputProps extends React.InputHTMLAttributes<HTMLDivElement> {
    fill: Fill;
    objKey: string;
    callBack: (key: string, value: Fill) => void
}

const ColorInput = forwardRef<HTMLDivElement, ColorInputProps>(
    ({ objKey, callBack, className, fill, ...props }, ref) => {
        const [isOpen, setIsOpen] = useState(false);
        const [activeTab, setActiveTab] = useState<FillType>('solid');
        const [imageUrl, setImageUrl] = useState<string | null>(null);

        const fillValue = extractFillValue(fill)
        const name = getDisplayTextFromFill(fill)

        let backgroundStyle;

        useEffect(() => {
            if (fill.type === 'image' || fill.type === 'pattern') {
                const url = arrayBufferToDataUrl(imageValue(fillValue.value));
                setImageUrl(prevUrl => {
                    if (prevUrl && prevUrl !== url) {
                        URL.revokeObjectURL(prevUrl);
                    }
                    return url;
                });
            } else {
                setImageUrl(prevUrl => {
                    if (prevUrl) {
                        URL.revokeObjectURL(prevUrl);
                    }
                    return null;
                });
            }
        }, [fill.type, fillValue.value]);

        useEffect(() => {
            switch (fill.type) {
                case 'solid':
                    setActiveTab('solid');
                    break;
                case 'linear':
                case 'radial':
                    setActiveTab('gradient');
                    break;
                case 'image':
                case 'pattern':
                    setActiveTab('image');
                    break;
            }
        }, [fill.type]);

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
                        className="w-10 bg-transparent text-gray-900 text-xs font-mono border-none focus:outline-none"
                        {...props}
                    >{name}</div>
                </aside>

                {isOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}>
                        <div onClick={(e) => e.stopPropagation()} className="absolute bottom-10 right-65 z-50 bg-white rounded-lg shadow-lg shadow-gray-500 w-fit h-fit  max-w-[280px] pt-3">

                            <div className='flex items-center gap-1 p-2 w-full h-9 border-b-1 border-t-1 border-b-[#e6e6e6] border-t-[#e6e6e6]'>
                                <button
                                    onClick={() => setActiveTab('solid')}
                                    className={`p-1 rounded hover:bg-gray-100 ${activeTab === 'solid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                                >
                                    <Paintbrush2 className='w-4 h-4' />
                                </button>
                                <button
                                    onClick={() => setActiveTab('gradient')}
                                    className={`p-1 rounded hover:bg-gray-100 ${activeTab === 'gradient' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                                >
                                    <Zap className='w-4 h-4' />
                                </button>
                                <button
                                    onClick={() => setActiveTab('image')}
                                    className={`p-1 rounded hover:bg-gray-100 ${activeTab === 'image' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                                >
                                    <FileImage className='w-4 h-4' />
                                </button>
                            </div>
                            {(activeTab == 'solid') &&
                                <ColorPicker value={fill as SolidFill} isOpen={isOpen}
                                    onColorChange={(color) => {
                                        callBack(objKey, color);
                                    }} />
                            }
                            {activeTab === 'gradient' && (
                                <GradientPicker
                                    value={fill as GradientFill}
                                    onGradientChange={(gradient) => {
                                        callBack(objKey, gradient);
                                    }}
                                />
                            )}
                            {(activeTab == 'image') &&
                                <BackgroundImagePicker value={fill as ImageFill}
                                    imageUrl={imageUrl}
                                    setImageUrl={setImageUrl}
                                    onImageChange={(fill) => {
                                        callBack(objKey, fill);
                                    }} />}

                        </div>
                    </div>
                )}
            </div>

        )
    }
)

ColorInput.displayName = 'ColorInput'

export default ColorInput



