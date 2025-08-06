import { loadImage } from "@/util/loadFile";
import { useFilePicker } from "@hooks/useFileOpener";
import { twMerge } from "tailwind-merge";

interface BackgroundImagePickerProps {
    isOpen?: boolean;
    className?: string;
    onImageChange: (imageData: ArrayBuffer | null) => void;
    setImageUrl: React.Dispatch<React.SetStateAction<string>>;
    imageUrl: string;
}


const BackgroundImagePicker: React.FC<BackgroundImagePickerProps> = ({ imageUrl, setImageUrl, onImageChange, isOpen, className }) => {

    const handleFileSelect = async (files: FileList) => {
        if (files && files.length > 0) {

            if (imageUrl) URL.revokeObjectURL(imageUrl)
            const urlList = Array.from(files).map((file) => URL.createObjectURL(file))
            const images = await loadImage(urlList)

            setImageUrl(urlList[0])
            onImageChange(images[0])
            console.log(isOpen);
            
        }
    }

    const { openFilePicker } = useFilePicker({
        accept: 'image/*',
        multiple: false,
        onFileSelect: (file) => handleFileSelect(file)
    })

    // useEffect(() => {
    //     if (value && !imageUrl) {
    //         const blob = new Blob([value]);
    //         const url = URL.createObjectURL(blob);
    //         setImageUrl(url);
    //     }
    // }, [value, imageUrl, isOpen, setImageUrl]);

    return (
        <div className={twMerge(`w-fit h-fit p-3 ${className}`)} >
            <div className='flex flex-row gap-1 '>
                <div className='w-[240px] h-[240px] bg-gray-100 rounded'
                    onClick={() => openFilePicker()}
                    style={{
                        backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
                        backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: 'contain',
                    }}
                >
                </div>
            </div>
        </div>
    )
}

export default BackgroundImagePicker