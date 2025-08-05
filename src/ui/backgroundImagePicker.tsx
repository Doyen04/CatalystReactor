import { loadImage } from "@/util/loadFile";
import { useFilePicker } from "@hooks/useFileOpener";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

interface BackgroundImagePickerProps {
    isOpen?: boolean;
    className?: string;
    onImageChange: (imageData: ArrayBuffer | null) => void;
}


const BackgroundImagePicker: React.FC<BackgroundImagePickerProps> = ({ onImageChange, isOpen, className }) => {
    const [selectedImage, setSelectedImage] = useState<ArrayBuffer | null>(null)
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
    const { openFilePicker } = useFilePicker({
        accept: 'image/*',
        multiple: false,
        onFileSelect: (file) => handleFileSelect(file)
    })
    const handleFileSelect = async (files: FileList) => {
        if (files && files.length > 0) {
            if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl)
            const urlList = Array.from(files).map((file) => URL.createObjectURL(file))
            const images = await loadImage(urlList)
            console.log(images, 'images');

            setSelectedImageUrl(urlList[0])
            console.log(onImageChange, urlList, isOpen, files);
            setSelectedImage(images[0])
        }
    }
    return (
        <div className={twMerge(`w-fit h-fit p-3 ${className}`)} >
            <div className='flex flex-row gap-1 '>
                <div className='w-[240px] h-[240px] bg-gray-100 rounded'
                    onClick={() => openFilePicker()}
                    style={{
                        backgroundImage: selectedImageUrl ? `url(${selectedImageUrl})` : undefined,
                        backgroundSize: 'auto', backgroundPosition: 'center'
                    }}
                >

                </div>
            </div>
        </div>
    )
}

export default BackgroundImagePicker