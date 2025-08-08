import React from 'react';
import { RadialGradient, GradientStop, DEFAULT_RADIAL_GRADIENT, SolidFill } from '@lib/types/shapes';
import { twMerge } from 'tailwind-merge';
import { Plus, Minus, ArrowDown, ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUp, ArrowUpLeft, ArrowUpRight, Circle } from 'lucide-react';
import Input from './Input';
import ColorInput from './ColorInput';
import { colorValue, getGradientPreview } from '@/util/getBackgroundFill';

interface RadialGradientPickerProps {
    value: RadialGradient;
    onGradientChange: (gradient: RadialGradient) => void;
    className?: string;
}

const PRESET_GRADIENTS = [
    { name: 'Sunset', stops: [{ offset: 0, color: '#ff7e5f' }, { offset: 1, color: '#feb47b' }] },
    { name: 'Ocean', stops: [{ offset: 0, color: '#667eea' }, { offset: 1, color: '#764ba2' }] },
    { name: 'Forest', stops: [{ offset: 0, color: '#11998e' }, { offset: 1, color: '#38ef7d' }] },
    { name: 'Fire', stops: [{ offset: 0, color: '#ff9a9e' }, { offset: 1, color: '#fecfef' }] },
    { name: 'Sky', stops: [{ offset: 0, color: '#a8edea' }, { offset: 1, color: '#fed6e3' }] },
    { name: 'Purple', stops: [{ offset: 0, color: '#667eea' }, { offset: 1, color: '#764ba2' }] },
];

const RADIAL_PRESETS = [
    { name: 'Top Left', cx: 0, cy: 0, icon: ArrowUpLeft },
    { name: 'Top', cx: 50, cy: 0, icon: ArrowUp },
    { name: 'Top Right', cx: 100, cy: 0, icon: ArrowUpRight },
    { name: 'Left', cx: 0, cy: 50, icon: ArrowLeft },
    { name: 'Center', cx: 50, cy: 50, icon: Circle },
    { name: 'Right', cx: 100, cy: 50, icon: ArrowRight },
    { name: 'Bottom Left', cx: 0, cy: 100, icon: ArrowDownLeft },
    { name: 'Bottom', cx: 50, cy: 100, icon: ArrowDown },
    { name: 'Bottom Right', cx: 100, cy: 100, icon: ArrowDownRight },
];


const RadialGradientPicker: React.FC<RadialGradientPickerProps> = ({ value, onGradientChange, className }) => {
    const gradient = value?.type === 'radial' ? value : DEFAULT_RADIAL_GRADIENT;

    const updateGradient = (newGradient: RadialGradient) => {
        onGradientChange(newGradient);
    };

    const handleStopChange = (index: number, field: keyof GradientStop, value: string | number) => {
        const newStops = [...gradient.stops];
        newStops[index] = { ...newStops[index], [field]: value };
        updateGradient({ ...gradient, stops: newStops });
    };

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

    const removeStop = (index: number) => {
        if (gradient.stops.length <= 2) return;
        const newStops = gradient.stops.filter((_, i) => i !== index);
        updateGradient({ ...gradient, stops: newStops });
    };

    const applyPreset = (preset: typeof PRESET_GRADIENTS[0]) => {
        updateGradient({ ...gradient, stops: preset.stops });
    };

    const applyPosition = (preset: typeof RADIAL_PRESETS[0]) => {
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

                {/* Preview */}
                <div className="w-full h-16 rounded-lg border border-gray-300 shadow-sm"
                    style={{ background: getGradientPreview(gradient) }}>
                </div>

                <div className='flex gap-1 w-fit h-fit'>
                    {/* Position Controls */}
                    <div className='flex gap-1 w-fit h-fit'>
                        <div className="flex-1 flex flex-col gap-1 bg-gray-100 rounded p-1">
                            <label className="text-xs font-bold text-gray-800 text-left rounded pl-0.5">Position</label>
                            <div className="grid grid-cols-3 gap-1">
                                {RADIAL_PRESETS.map((preset, index) => (
                                    <button
                                        key={index}
                                        onClick={() => applyPosition(preset)}
                                        title={preset.name}
                                        className={`w-fit h-fit p-1.5 bg-white border border-gray-300 hover:bg-gray-200 rounded text-gray-700 transition-colors
                                         ${gradient.cx === preset.cx && gradient.cy === preset.cy
                                                ? 'bg-blue-100 border-blue-400 text-blue-600'
                                                : ''
                                            }`}
                                    >
                                        <preset.icon className='w-4 h-4' />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

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


                {/* Color Stops */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-700">Color Stops</label>
                        <button
                            onClick={addStop}
                            className="p-1 rounded hover:bg-gray-100 text-blue-600"
                            title="Add color stop"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {gradient.stops
                            .sort((a, b) => a.offset - b.offset)
                            .map((stop, index) => (
                                <div key={index} className="flex items-center gap-2 p-1 bg-gray-50 rounded">
                                    <ColorInput
                                        showTab={false}
                                        fill={{ type: 'solid', color: stop.color } as SolidFill}
                                        onChange={(fill) => {
                                            const newColor = (fill as SolidFill).color;
                                            handleStopChange(index, 'color', colorValue(newColor));
                                        }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={stop.offset}
                                            onChange={(e) => handleStopChange(index, 'offset', Number(e.target.value))}
                                            className="w-full"
                                        />
                                    </div>
                                    <Input
                                        title='%'
                                        className="w-14 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={Math.round(stop.offset * 100)}
                                        onChange={(value) => handleStopChange(index, 'offset', value / 100)}
                                    />

                                    {gradient.stops.length > 2 && (
                                        <button
                                            onClick={() => removeStop(index)}
                                            className="p-1 rounded hover:bg-red-100 text-red-600"
                                            title="Remove color stop"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                    </div>

                    {/* Gradient Presets */}
                    <div className="flex flex-col gap-2 rounded w-full ">
                        <label className="text-xs text-left font-bold text-gray-700">Preset Colors</label>
                        <div className="flex gap-2">
                            {PRESET_GRADIENTS.map((preset, index) => (
                                <button
                                    key={index}
                                    onClick={() => applyPreset(preset)}
                                    className="h-5 w-8 rounded border border-gray-300 hover:border-gray-400 transition-colors hover:scale-105"
                                    style={{
                                        background: getGradientPreview({
                                            type: 'radial',
                                            cx: 50,
                                            cy: 50,
                                            radius: 70,
                                            stops: preset.stops
                                        })
                                    }}
                                    title={preset.name}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RadialGradientPicker;