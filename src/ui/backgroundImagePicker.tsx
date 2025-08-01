import { twMerge } from "tailwind-merge";

interface BackgroundImagePickerProps {
    isOpen?: boolean;
    className?: string;
    onImageChange: (imageData: ArrayBuffer | null) => void;
}


const BackgroundImagePicker: React.FC<BackgroundImagePickerProps> = ({ onImageChange, isOpen, className }) => {
    const fileChange = () => {
        const file = e.target.files?.[0];
        if (file && onImageChange) {
            const reader = new FileReader();
            reader.onload = () => {
                onImageChange(reader.result as ArrayBuffer);
            };
            reader.readAsArrayBuffer(file);

        }
        console.log(isOpen);

    }
    return (
        <div className={twMerge(`w-fit h-fit p-3 ${className}`)} >
            <div className='flex flex-row gap-1 '>
                <div className='w-fit h-fit'>
                    <input
                        type="file"
                        className="block w-full text-sm text-gray-500 
            file:mr-4 file:py-2 file:px-4 file:rounded-full 
            file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        onChange={fileChange}
                    />
                </div>
            </div>
        </div>
    )
}

export default BackgroundImagePicker