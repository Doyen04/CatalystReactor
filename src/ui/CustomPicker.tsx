import React, { useState } from 'react';
import ColorPicker from './ColorPicker';
import {FileImage, Paintbrush2 } from 'lucide-react';
import BackgroundImagePicker from './backgroundImagePicker';

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    onImageChange?: (imageData: ArrayBuffer | null) => void;
    className?: string;
}
type TabType = 'color' | "image"

const CustomPicker: React.FC<ColorPickerProps> = ({ value, onChange, onImageChange, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('color');

    return (
        <div className={`relative ${className}`}>
            {/* Color Preview Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-4 h-3.5 rounded border-2 border-gray-300 cursor-pointer"
                style={{ backgroundColor: value }}
            />
            {isOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="absolute bottom-10 right-65 z-50 bg-white rounded-lg shadow-lg shadow-gray-500 w-fit h-fit pt-3">
                        {/* <div onClick={() => setIsOpen(false)} className='w-5 h-5 rounded-full bg-white border-2 border-gray-500 flex items-center justify-center absolute -top-3 -left-3 cursor-pointer'>
                            X
                        </div> */}
                        <div className='flex items-center gap-1 p-2 w-full h-9 mb-2 border-b-1 border-t-1 border-b-[#e6e6e6] border-t-[#e6e6e6]'>
                            <button
                                onClick={() => setActiveTab('color')}
                                className={`p-1 rounded hover:bg-gray-100 ${activeTab === 'color' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                            >
                                <Paintbrush2 className='w-4 h-4' />
                            </button>
                            {/* <button
                                onClick={() => setActiveTab('color')}
                                className={`p-1 rounded hover:bg-gray-100 ${activeTab === 'color' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                            >
                                <Droplet className='w-4 h-4' />
                            </button> */}
                            <button
                                onClick={() => setActiveTab('image')}
                                className={`p-1 rounded hover:bg-gray-100 ${activeTab === 'image' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                            >
                                <FileImage className='w-4 h-4' />
                            </button>
                        </div>
                        {(activeTab == 'color')&& <ColorPicker value={value} isOpen={isOpen} onChange={onChange} />}
                        {(activeTab == 'image') && <BackgroundImagePicker onImageChange={onImageChange}/>}

                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomPicker;