import { getDisplayTextFromFill, extractFillValue, imageValue, arrayBufferToDataUrl, getBackgroundStyleFromFillValue } from '@/util/getBackgroundFill';
import { Fill, FillType, GradientFill, ImageFill, SolidFill } from '@lib/types/shapes';
import { FileImage, Paintbrush2, Zap } from 'lucide-react';
import React, { forwardRef, useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import BackgroundImagePicker from './backgroundImagePicker';
import ColorPicker from './ColorPicker';
import GradientPicker from './GradientPicker';
import Input from './Input';


interface ColorInputProps extends Omit<React.HtmlHTMLAttributes<HTMLDivElement>, 'onChange'> {
    fill: Fill;
    showTab?: boolean;
    onChange: (value: Fill) => void
}

const ColorInput = forwardRef<HTMLDivElement, ColorInputProps>(({ showTab = true, onChange, className, fill, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<FillType>('solid');
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    const fillValue = extractFillValue(fill.color)
    const name = getDisplayTextFromFill(fill.color)

    let backgroundStyle;

    useEffect(() => {
        if (fill.color.type === 'image' || fill.color.type === 'pattern') {
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
    }, [fill.color.type, fillValue.value]);

    useEffect(() => {
        switch (fill.color.type) {
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
    }, [fill.color.type]);

    if (fill.color.type === 'image' || fill.color.type === 'pattern') {
        backgroundStyle = getBackgroundStyleFromFillValue(fillValue.value, fill.color, imageUrl);
    } else {
        backgroundStyle = getBackgroundStyleFromFillValue(fillValue.value, fill.color);
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
            <aside className={twMerge(`rounded-sm bg-gray-200 flex h-fit w-28
            items-center gap-1 pl-1 border border-transparent cursor-pointer
             hover:border-gray-500 
             transition-colors ${className}`)}>
                <p onClick={() => setIsOpen(!isOpen)} className="font-semibold text-gray-700 h-4 w-4 rounded-xs"
                    style={{ ...backgroundStyle }}>
                </p>
                <div
                    ref={ref}
                    className="px-0.5 py-1 w-14 h-full bg-transparent text-gray-900 text-xs text-left font-mono border-r-2 border-r-gray-300 focus:outline-none"
                    {...props}
                >
                    {name}
                </div>
                <Input className='flex-1 min-w-0 rounded-none border-none hover:border-none hover:focus-within:border-none' value={fill.opacity * 100} type={'number'}
                    onChange={(num) => {
                        onChange({ color: fill.color, opacity: num / 100 });
                    }} />
            </aside>

            {isOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="absolute bottom-10 right-65 z-50 bg-white rounded-lg shadow-lg shadow-gray-500 w-fit h-fit  max-w-[280px] pt-3">

                        {showTab && <div className='flex items-center gap-1 p-2 w-full h-9 border-b-1 border-t-1 border-b-[#e6e6e6] border-t-[#e6e6e6]'>
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
                        </div>}
                        {showTab && (activeTab == 'solid') &&
                            <ColorPicker value={fill.color as SolidFill} isOpen={isOpen}
                                onColorChange={(color) => {
                                    onChange({ color: color, opacity: fill.opacity });
                                }} />
                        }
                        {showTab && (activeTab === 'gradient') && (
                            <GradientPicker
                                value={fill.color as GradientFill}
                                onGradientChange={(gradient) => {
                                    onChange({ color: gradient, opacity: fill.opacity });
                                }}
                            />
                        )}
                        {showTab && (activeTab == 'image') && (
                            <BackgroundImagePicker value={fill.color as ImageFill}
                                imageUrl={imageUrl}
                                setImageUrl={setImageUrl}
                                onImageChange={(image) => {
                                    onChange({ color: image, opacity: fill.opacity });
                                }} />
                        )}

                    </div>
                </div>
            )}
        </div>

    )
}
)

ColorInput.displayName = 'ColorInput'

export default ColorInput



