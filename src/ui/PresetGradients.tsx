import { getGradientPreview } from "@/util/getBackgroundFill";
import { GradientStop, PRESET_LINEAR_GRADIENTS, PRESET_RADIAL_GRADIENTS } from "@lib/types/shapes";
import { Key } from "react";
import { twMerge } from "tailwind-merge";


interface PresetGradientProps {
    className?: string;
    gradients: typeof PRESET_RADIAL_GRADIENTS | typeof PRESET_LINEAR_GRADIENTS;
    applyPreset: (presetStops: GradientStop[]) => void;
}



const PresetGradients: React.FC<PresetGradientProps> = ({ className, gradients, applyPreset }) => {

    return (
        <div className={twMerge(`flex flex-col gap-2 rounded w-full ${className}`)}>
            <label className="text-xs text-left font-bold text-gray-700">Preset Colors</label>
            <div className="flex gap-2">
                {gradients.map((preset, index: Key) => (
                    <button
                        key={index}
                        onClick={() => applyPreset(preset.stops)}
                        className="h-5 w-8 rounded border border-gray-300 hover:border-gray-400 transition-colors hover:scale-105"
                        style={{
                            background: getGradientPreview(preset)
                        }}
                        title={preset.name}
                    />
                ))}
            </div>
        </div>
    )
}

export default PresetGradients