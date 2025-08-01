import { loadImage } from "@/util/loadFile";
import { useFilePicker } from "@hooks/useFileOpener";
import { twMerge } from "tailwind-merge";

interface BackgroundImagePickerProps {
    isOpen?: boolean;
    className?: string;
    onImageChange: (imageData: ArrayBuffer | null) => void;
}


const BackgroundImagePicker: React.FC<BackgroundImagePickerProps> = ({ onImageChange, isOpen, className }) => {
    const { openFilePicker } = useFilePicker({
        accept: 'image/*',
        multiple: false,
        onFileSelect: (file) => handleFileSelect(file)
    })
    const handleFileSelect = async (files:FileList) => {
        if (files && files.length > 0) {
            const urlList = Array.from(files).map((file) => URL.createObjectURL(file))
            const images = await loadImage(urlList)
            console.log(images, 'images');

            urlList.forEach(url => URL.revokeObjectURL(url))
            console.log(onImageChange, isOpen, files);
            
        }
    }
    return (
        <div className={twMerge(`w-fit h-fit p-3 ${className}`)} >
            <div className='flex flex-row gap-1 '>
                <div className='w-[240px] h-[240px]' onClick={()=> openFilePicker()}>

                </div>
            </div>
        </div>
    )
}

export default BackgroundImagePicker