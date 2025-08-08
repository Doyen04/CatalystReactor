
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

type Options = {
    value: string;
    label: string;
    description?: string;
};

interface DropDownPickerProps {
    className?: string;
    onValueChange: (value: string) => void;
    value: Options;
    values: Options[];
}



const DropDownPicker: React.FC<DropDownPickerProps> = ({ onValueChange, value, values }) => {
    const [currentValue, setValue] = useState<Options>(value);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        setValue(value);
    }, [value]);

    const handleScaleModeChange = (newValue: Options) => {
        setValue(newValue);
        setIsDropdownOpen(false);
        onValueChange(newValue.value); // You might want to pass the current image data here
    }

    const currentOption = values.find(option => option.value === currentValue.value);

    return (
        <>
            <div className="flex gap-2 items-center">
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-fit flex gap-2 items-center p-1 text-sm bg-white border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <span className="text-xs">{currentOption?.label}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
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
                                {values.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleScaleModeChange(option)}
                                        className={`w-full px-3 py-2 text-center text-xs hover:bg-gray-100 first:rounded-t last:rounded-b transition-colors
                                             ${currentValue.value === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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

export default DropDownPicker