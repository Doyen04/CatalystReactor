import React from 'react';
import { RadialGradient, GradientStop, DEFAULT_RADIAL_GRADIENT, PRESET_RADIAL_GRADIENTS, RADIAL_PRESET_DIRECTIONS } from '@lib/types/shapes';
import { twMerge } from 'tailwind-merge';
import Input from './Input';
import GradientPreview from './gradientPreview';
import DirectionControls from './DirectionControls';
import ColorStops from './ColorStops';
import PresetGradients from './PresetGradients';

interface RadialGradientPickerProps {
    value: RadialGradient;
    onGradientChange: (gradient: RadialGradient) => void;
    className?: string;
}

const RadialGradientPicker: React.FC<RadialGradientPickerProps> = ({ value, onGradientChange, className }) => {
    const gradient = value?.type === 'radial' ? value : DEFAULT_RADIAL_GRADIENT;
    //move
    const updateGradient = (newGradient: RadialGradient) => {
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
        if (gradient.stops.length <= 2) return;
        const newStops = gradient.stops.filter((_, i) => i !== index);
        updateGradient({ ...gradient, stops: newStops });
    };
    //move
    const addStop = () => {
        const newOffset = gradient.stops.length > 0
            ? Math.min(1, Math.max(...gradient.stops.map(s => s.offset)) + 0.1)
            : 0.5;

        const newStop: GradientStop = {
            offset: newOffset,
            color: '#ffffff'
        };

        updateGradient({ ...gradient, stops: [...gradient.stops, newStop] });
    };

    const applyPosition = (preset: typeof RADIAL_PRESET_DIRECTIONS[0]) => {
        updateGradient({ ...gradient, cx: preset.cx, cy: preset.cy });
    };

    const handleCenterChange = (axis: 'cx' | 'cy', value: number) => {
        updateGradient({ ...gradient, [axis]: Math.max(0, Math.min(100, value)) });
    };

    const handleRadiusChange = (value: number) => {
        updateGradient({ ...gradient, radius: Math.max(0, Math.min(100, value)) });
    };

    return (
        <div className={twMerge(`w-full ${className}`)}>
            <div className="flex flex-col gap-4 w-full">
                <GradientPreview gradient={gradient} />
                <div className='flex gap-1 w-fit h-fit'>
                    <DirectionControls directions={RADIAL_PRESET_DIRECTIONS} applyPosition={applyPosition} />
                    {/* Manual Position Controls */}
                    <div className="flex flex-col gap-2">
                        <Input
                            title="CX"
                            type="number"
                            min={0}
                            max={100}
                            value={gradient.cx}
                            onChange={(value) => handleCenterChange('cx', value)}
                        />
                        <Input
                            title="CY"
                            type="number"
                            min={0}
                            max={100}
                            value={gradient.cy}
                            onChange={(value) => handleCenterChange('cy', value)}
                        />
                        <Input
                            title="R"
                            type="number"
                            min={0}
                            max={100}
                            value={gradient.radius}
                            onChange={handleRadiusChange}
                        />
                    </div>
                </div>
                <ColorStops gradient={gradient} addStop={addStop} removeStop={removeStop} handleStopChange={handleStopChange} />
                <PresetGradients gradients={PRESET_RADIAL_GRADIENTS} applyPreset={applyPreset}/>
            </div>
        </div>
    );
};

export default RadialGradientPicker;