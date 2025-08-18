import React from 'react';
import { LinearGradient, GradientStop, DEFAULT_LINEAR_GRADIENT, LINEAR_PRESET_DIRECTIONS, PRESET_LINEAR_GRADIENTS } from '@lib/types/shapes';
import { twMerge } from 'tailwind-merge';
import Input from './Input';
import GradientPreview from './GradientPreview';
import DirectionControls from './DirectionControls';
import ColorStops from './ColorStops';
import PresetGradients from './PresetGradients';

interface LinearGradientPickerProps {
    value: LinearGradient;
    onGradientChange: (gradient: LinearGradient) => void;
    className?: string;
}

const LinearGradientPicker: React.FC<LinearGradientPickerProps> = ({ value, onGradientChange, className }) => {
    const gradient = value?.type == 'linear' ? value : DEFAULT_LINEAR_GRADIENT;

    //move
    const updateGradient = (newGradient: LinearGradient) => {
        onGradientChange(newGradient);
    };

    const applyPreset = (presetStops: GradientStop[]) => {
        updateGradient({ ...gradient, stops: presetStops });
    };

    const handleStopChange = (index: number, field: keyof GradientStop, value: string | number) => {
        const newStops = [...gradient.stops];
        newStops[index] = { ...newStops[index], [field]: value };
        updateGradient({ ...gradient, stops: newStops });
    };

    const removeStop = (index: number) => {
        if (gradient.stops.length > 2) {
            const newStops = gradient.stops.filter((_, i) => i !== index);
            updateGradient({ ...gradient, stops: newStops });
        }
    };
    //move
    const addStop = () => {
        const sortedStops = [...gradient.stops].sort((a, b) => a.offset - b.offset);
        const lastOffset = sortedStops[sortedStops.length - 1]?.offset || 0;
        const newOffset = Math.min(lastOffset + 0.2, 1);
        const newStops = [...gradient.stops, { offset: newOffset, color: '#ffffff' }];
        updateGradient({ ...gradient, stops: newStops });
    };

    const applyDirection = (direction: typeof LINEAR_PRESET_DIRECTIONS[0]) => {
        updateGradient({
            ...gradient,
            x1: direction.x1,
            y1: direction.y1,
            x2: direction.x2,
            y2: direction.y2
        });
    };

    return (
        <div className={twMerge(`w-full ${className}`)}>
            <div className="flex flex-col gap-4 w-full">
                <GradientPreview gradient={gradient} />
                <div className='flex gap-1 w-fit h-fit'>
                    <DirectionControls directions={LINEAR_PRESET_DIRECTIONS} applyPosition={applyDirection} />
                    {/* Custom Direction  */}
                    <div className="flex-1 grid grid-cols-1">
                        <div className="">
                            <label className="text-xs font-bold text-gray-600">Start Point</label>
                            <div className="grid grid-cols-2 gap-1">
                                <Input min={0} max={100} className='bg-gray-100 p-0.5 text-xs border-gray-300 focus:ring-1 focus:ring-blue-500' title={'X1'} type={'number'} value={gradient.x1} onChange={(value) => updateGradient({ ...gradient, x1: value })} />
                                <Input min={0} max={100} className='bg-gray-100 p-0.5 text-xs border-gray-300 focus:ring-1 focus:ring-blue-500' title={'Y1'} type={'number'} value={gradient.y1} onChange={(value) => updateGradient({ ...gradient, y1: value })} />
                            </div>
                        </div>
                        <div className="">
                            <label className="text-xs font-bold text-gray-600">End Point</label>
                            <div className="grid grid-cols-2 gap-1">
                                <Input min={0} max={100} className={'bg-gray-100  border-gray-300'} title={'X2'} type={'number'} value={gradient.x2} onChange={(value) => updateGradient({ ...gradient, x2: value })} />
                                <Input min={0} max={100} className={'bg-gray-100  border-gray-300'} title={'Y2'} type={'number'} value={gradient.y2} onChange={(value) => updateGradient({ ...gradient, y2: value })} />
                            </div>
                        </div>
                    </div>
                </div>
                <ColorStops gradient={gradient} addStop={addStop} removeStop={removeStop} handleStopChange={handleStopChange} />
                <PresetGradients gradients={PRESET_LINEAR_GRADIENTS} applyPreset={applyPreset} />
            </div>
        </div>
    );
};

export default LinearGradientPicker;