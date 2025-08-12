import { LINEAR_PRESET_DIRECTIONS, RADIAL_PRESET_DIRECTIONS } from "@lib/types/shapes";
import { twMerge } from "tailwind-merge";


interface DirectionControlProps {
    className?: string;
    directions: typeof RADIAL_PRESET_DIRECTIONS | typeof LINEAR_PRESET_DIRECTIONS;
    applyPosition: (preset:typeof RADIAL_PRESET_DIRECTIONS[0] | typeof LINEAR_PRESET_DIRECTIONS[0])=>void;
}



const DirectionControls: React.FC<DirectionControlProps> = ({ className, directions, applyPosition }) => {

    return (
        <div className={twMerge(`flex flex-col items-center gap-1 bg-gray-100 rounded p-1 ${className}`)}>
            <label className="text-xs font-bold text-gray-800 text-left rounded pl-0.5">Direction</label>
            <div className="grid grid-cols-3 gap-y-1 gap-x-0.5">
                {directions.map((preset, index) => (
                    <button
                        key={index}
                        disabled={preset ? false : true}
                        onClick={() => applyPosition(preset)}
                        className="w-fit h-fit p-1 text-xs bg-white border border-gray-300 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                    >
                        {preset ? <preset.icon className='w-4 h-4' /> : <div className='w-4 h-4'></div>}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default DirectionControls