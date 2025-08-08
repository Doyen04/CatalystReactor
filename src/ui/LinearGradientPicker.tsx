import React from 'react';
import { LinearGradient, GradientStop, DEFAULT_LINEAR_GRADIENT } from '@lib/types/shapes';
import { twMerge } from 'tailwind-merge';
import { Plus, Minus, ArrowRight, ArrowDown, ArrowDownRight, ArrowDownLeft, ArrowUp, ArrowLeft, ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import Input from './Input';

interface LinearGradientPickerProps {
    value: LinearGradient;
    onGradientChange: (gradient: LinearGradient) => void;
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

const DIRECTION_PRESETS = [
    { name: 'Left to Right', x1: 0, y1: 0, x2: 100, y2: 0, icon: ArrowRight },
    { name: 'Right to Left', x1: 100, y1: 0, x2: 0, y2: 0, icon: ArrowLeft },
    { name: 'Top to Bottom', x1: 0, y1: 0, x2: 0, y2: 100, icon: ArrowDown },
    { name: 'Bottom to Top', x1: 0, y1: 100, x2: 0, y2: 0, icon: ArrowUp },
    { name: 'Diagonal ↘', x1: 0, y1: 0, x2: 100, y2: 100, icon: ArrowDownRight },
    { name: 'Diagonal ↖', x1: 100, y1: 100, x2: 0, y2: 0, icon: ArrowUpLeft },
    { name: 'Diagonal ↙', x1: 100, y1: 0, x2: 0, y2: 100, icon: ArrowDownLeft },
    { name: 'Diagonal ↗', x1: 0, y1: 100, x2: 100, y2: 0, icon: ArrowUpRight },
];

const LinearGradientPicker: React.FC<LinearGradientPickerProps> = ({ value, onGradientChange, className }) => {
    const gradient = value?.type == 'linear' ? value : DEFAULT_LINEAR_GRADIENT;

    const updateGradient = (newGradient: LinearGradient) => {
        // setGradient(newGradient);
        onGradientChange(newGradient);
    };

    const handleStopChange = (index: number, field: keyof GradientStop, value: string | number) => {
        const newStops = [...gradient.stops];
        newStops[index] = { ...newStops[index], [field]: value };
        updateGradient({ ...gradient, stops: newStops });
    };

    const addStop = () => {
        const sortedStops = [...gradient.stops].sort((a, b) => a.offset - b.offset);
        const lastOffset = sortedStops[sortedStops.length - 1]?.offset || 0;
        const newOffset = Math.min(lastOffset + 0.2, 1);
        const newStops = [...gradient.stops, { offset: newOffset, color: '#ffffff' }];
        updateGradient({ ...gradient, stops: newStops });
    };

    const removeStop = (index: number) => {
        if (gradient.stops.length > 2) {
            const newStops = gradient.stops.filter((_, i) => i !== index);
            updateGradient({ ...gradient, stops: newStops });
        }
    };

    const applyDirection = (direction: typeof DIRECTION_PRESETS[0]) => {
        updateGradient({
            ...gradient,
            x1: direction.x1,
            y1: direction.y1,
            x2: direction.x2,
            y2: direction.y2
        });
    };

    const applyPreset = (presetStops: GradientStop[]) => {
        updateGradient({ ...gradient, stops: presetStops });
    };

    const getGradientAngle = () => {
        const dx = gradient.x2 - gradient.x1;
        const dy = gradient.y2 - gradient.y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return 0;

        const normalizedDx = dx / length;
        const normalizedDy = dy / length;
        let angle = Math.atan2(normalizedDy, normalizedDx) * (180 / Math.PI);

        angle = (angle + 90 + 360) % 360;
        return angle
    };

    const getGradientPreview = () => {
        const stops = gradient.stops
            .sort((a, b) => a.offset - b.offset)
            .map(stop => `${stop.color} ${stop.offset * 100}%`)
            .join(', ');
        return `linear-gradient(${getGradientAngle()}deg, ${stops})`;
    };


    return (
        <div className={twMerge(`w-full ${className}`)}>
            <div className="flex flex-col gap-4 w-full">
                {/* Gradient Preview */}
                <div className="relative w-full">
                    <div
                        className="h-16 rounded-lg border border-gray-300 shadow-sm"
                        style={{ background: getGradientPreview() }}
                    />
                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        {Math.round(getGradientAngle())}°
                    </div>
                </div>

                {/* Direction Controls */}
                <div className='flex gap-1 w-fit h-fit'>
                    <div className="flex-1 flex flex-col gap-1 bg-gray-100 rounded p-1">
                        <label className="text-xs font-bold text-gray-800 text-left rounded pl-0.5">Direction</label>
                        <div className="grid grid-cols-4 gap-y-3 gap-x-0.5">
                            {DIRECTION_PRESETS.map((preset, index) => (
                                <button
                                    key={index}
                                    onClick={() => applyDirection(preset)}
                                    className="w-fit h-fit p-1 text-xs bg-white border border-gray-300 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                                >
                                    {<preset.icon className='w-4 h-4' />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* {/* Custom Direction  */}
                    <div className="flex-1 grid grid-cols-1">
                        <div className="">
                            <label className="text-xs font-bold text-gray-600">Start Point</label>
                            <div className="grid grid-cols-2 gap-1">
                                <Input className='bg-gray-100 p-0.5 text-xs border-gray-300 focus:ring-1 focus:ring-blue-500' title={'X1'} type={'number'} value={gradient.x1} onChange={(value) => updateGradient({ ...gradient, x1: value })} />
                                <Input className='bg-gray-100 p-0.5 text-xs border-gray-300 focus:ring-1 focus:ring-blue-500' title={'Y1'} type={'number'} value={gradient.y1} onChange={(value) => updateGradient({ ...gradient, y1: value })} />
                            </div>
                        </div>
                        <div className="">
                            <label className="text-xs font-bold text-gray-600">End Point</label>
                            <div className="grid grid-cols-2 gap-1">
                                <Input className={'bg-gray-100  border-gray-300'} title={'X2'} type={'number'} value={gradient.x2} onChange={(value) => updateGradient({ ...gradient, x2: value })} />
                                <Input className={'bg-gray-100  border-gray-300'} title={'Y2'} type={'number'} value={gradient.y2} onChange={(value) => updateGradient({ ...gradient, y2: value })} />
                            </div>
                        </div>
                    </div>
                </div>


                {/* Color Stops */}
                <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700">Color Stops</label>
                        <button
                            onClick={addStop}
                            disabled={gradient.stops.length >= 10}
                            className="p-1 w-6 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    <input
                                        type="color"
                                        value={stop.color}
                                        onChange={(e) => handleStopChange(index, 'color', e.target.value)}
                                        className="w-5 h-5 rounded border border-gray-300 cursor-pointer"
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
                                    <Input title='%' className="w-14 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        type="number" min="0" max="100"
                                        value={Math.round(stop.offset * 100)}
                                        onChange={(value) => handleStopChange(index, 'offset', value / 100)} />
                                    
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
                </div>

                {/* Preset Gradients */}
                <div className="flex flex-col gap-2 w-full">
                    <label className="text-xs font-medium text-gray-700">Preset Colors</label>
                    <div className="flex gap-2">
                        {PRESET_GRADIENTS.map((preset) => (
                            <button
                                key={preset.name}
                                onClick={() => applyPreset(preset.stops)}
                                className="h-5 w-8 rounded border border-gray-300 hover:border-gray-400 transition-colors hover:scale-105"
                                style={{
                                    background: `linear-gradient(90deg, ${preset.stops.map(s => `${s.color} ${s.offset * 100}%`).join(', ')})`
                                }}
                                title={preset.name}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LinearGradientPicker;