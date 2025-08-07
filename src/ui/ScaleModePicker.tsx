
import { ScaleMode } from "@lib/types/shapes";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface ScaleModePickerProps {
    isOpen?: boolean;
    className?: string;
    onScaleChange: (scaleMode: ScaleMode) => void;
    scaleMode: ScaleMode;
}


const ScaleModePicker: React.FC<ScaleModePickerProps> = ({ onScaleChange, scaleMode }) => {
    const [currentScaleMode, setScaleMode] = useState<ScaleMode>(scaleMode);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleScaleModeChange = (newScaleMode: ScaleMode) => {
        setScaleMode(newScaleMode);

        onScaleChange(newScaleMode); // You might want to pass the current image data here
    }

    const scaleModeOptions = [
        { value: 'fill', label: 'Fill', description: 'Image covers entire area, may crop' },
        { value: 'fit', label: 'Fit', description: 'Image fits within area, maintains aspect ratio' },
        { value: 'tile', label: 'Tile', description: 'Image repeats to fill area' },
        { value: 'stretch', label: 'Stretch', description: 'Adjust image to fill area' }
    ];

    const currentOption = scaleModeOptions.find(option => option.value === currentScaleMode);

    return (
        <>
            <div className="flex gap-2 items-center">
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-17 flex justify-between items-center p-1 text-sm bg-white border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <span>{currentOption?.label}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                        <>
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsDropdownOpen(false)}
                            />

                            {/* Dropdown Menu */}
                            <div className="absolute w-fit top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-20">
                                {scaleModeOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleScaleModeChange(option.value as ScaleMode)}
                                        className={`w-full px-3 py-2 text-center text-xs hover:bg-gray-100 first:rounded-t last:rounded-b ${currentScaleMode === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                            }`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium">{option.label}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}

export default ScaleModePicker