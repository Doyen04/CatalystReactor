import { loadImage } from "@/util/loadFile";
import { useFilePicker } from "@hooks/useFileOpener";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

interface BackgroundImagePickerProps {
    isOpen?: boolean;
    className?: string;
    value: ArrayBuffer;
    onImageChange: (imageData: ArrayBuffer | null) => void;
}


const BackgroundImagePicker: React.FC<BackgroundImagePickerProps> = ({ onImageChange, value, isOpen, className }) => {
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)

    const handleFileSelect = async (files: FileList) => {
        if (files && files.length > 0) {

            if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl)
            const urlList = Array.from(files).map((file) => URL.createObjectURL(file))
            const images = await loadImage(urlList)

            setSelectedImageUrl(urlList[0])
            onImageChange(images[0])
        }
    }

    const { openFilePicker } = useFilePicker({
        accept: 'image/*',
        multiple: false,
        onFileSelect: (file) => handleFileSelect(file)
    })

    useEffect(() => {
        if (value && !selectedImageUrl) {
            const blob = new Blob([value]);
            const url = URL.createObjectURL(blob);
            setSelectedImageUrl(url);
        }
    }, [value,selectedImageUrl, isOpen]);


    useEffect(() => {
        return () => {
            if (selectedImageUrl) {
                URL.revokeObjectURL(selectedImageUrl);
            }
        };
    }, [selectedImageUrl])

    return (
        <div className={twMerge(`w-fit h-fit p-3 ${className}`)} >
            <div className='flex flex-row gap-1 '>
                <div className='w-[240px] h-[240px] bg-gray-100 rounded'
                    onClick={() => openFilePicker()}
                    style={{
                        backgroundImage: selectedImageUrl ? `url(${selectedImageUrl})` : undefined,
                        backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: 'contain',
                    }}
                >
                </div>
            </div>
        </div>
    )
}

export default BackgroundImagePicker