import { loadImage } from "@/util/loadFile";
import { useFilePicker } from "@hooks/useFileOpener"
import { twMerge } from "tailwind-merge";
import DropDownPicker from "./DropDownPicker";
import { ImageFill, ScaleMode } from "@lib/types/shapes";
import { useEffect, useState } from "react";

interface BackgroundImagePickerProps {
    isOpen?: boolean;
    className?: string;
    value: ImageFill;
    onImageChange: (fill: ImageFill) => void;
    setImageUrl: React.Dispatch<React.SetStateAction<string>>;
    imageUrl: string;
}


const BackgroundImagePicker: React.FC<BackgroundImagePickerProps> = ({ value, imageUrl, setImageUrl, onImageChange, isOpen, className }) => {
    // const img = value?.type == 'image' ? value : DEFAULT_LINEAR_GRADIENT;
    const [currentScaleMode, setScaleMode] = useState<ScaleMode>(value.scaleMode ?? 'fill');
    const [currentImage, setCurrentImage] = useState<ArrayBuffer | null>(value.imageData ?? null);

    useEffect(() => {
        if (value.scaleMode) {
            setScaleMode(value.scaleMode);
        } if (value.imageData) {
            setCurrentImage(value.imageData);
        }
        if (!value.imageData) {
            console.log('rendered 5', 9999);
        }
    }, [value.scaleMode, value.imageData]);

    const handleFileSelect = async (files: FileList) => {
        if (files && files.length > 0) {

            if (imageUrl) URL.revokeObjectURL(imageUrl)
            const urlList = Array.from(files).map((file) => URL.createObjectURL(file))
            const images = await loadImage(urlList)

            setImageUrl(urlList[0])
            setCurrentImage(images[0])
            const imageFill: ImageFill = {
                type: 'image',
                imageData: images[0],
                scaleMode: currentScaleMode
            };
            onImageChange(imageFill)
            console.log(isOpen);
        }
    }

    const handleScaleModeChange = (newScaleMode: ScaleMode) => {

        setScaleMode(newScaleMode);
        if (currentImage) {
            const imageFill: ImageFill = {
                type: 'image',
                imageData: currentImage,
                scaleMode: newScaleMode
            };
            onImageChange(imageFill);
        }
    };

    const { openFilePicker } = useFilePicker({
        accept: 'image/*',
        multiple: false,
        onFileSelect: (file) => handleFileSelect(file)
    })

    const scaleModeOptions = [
        { value: 'fill', label: 'Fill', description: 'Image covers entire area, may crop' },
        { value: 'fit', label: 'Fit', description: 'Image fits within area, maintains aspect ratio' },
        { value: 'tile', label: 'Tile', description: 'Image repeats to fill area' },
        { value: 'stretch', label: 'Stretch', description: 'Adjust image to fill area' }
    ];
    const selectedScaleMode =
        scaleModeOptions.find(o => o.value === currentScaleMode) ?? scaleModeOptions[0];

    return (
        <div className={twMerge(`w-fit h-fit p-3 ${className}`)} >
            <div className='flex flex-col gap-1.5'>
                <DropDownPicker value={selectedScaleMode} onValueChange={handleScaleModeChange} values={scaleModeOptions} />
                <div className='w-[240px] h-[240px] bg-gray-100 rounded flex items-center justify-center'
                    style={{
                        backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
                        backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: 'contain',
                    }}
                >
                    <button className="bg-blue-800 text-white rounded p-2" onClick={() => openFilePicker()}>
                        Click to Select Image
                    </button>
                </div>
            </div>
        </div>
    )
}

export default BackgroundImagePicker