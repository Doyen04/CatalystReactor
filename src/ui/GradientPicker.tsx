import React, { useEffect } from 'react';
import { DEFAULT_LINEAR_GRADIENT, DEFAULT_RADIAL_GRADIENT, Gradient, GradientFill, LinearGradient, RadialGradient } from '@lib/types/shapes';
import { twMerge } from 'tailwind-merge';
import LinearGradientPicker from './LinearGradientPicker';
import RadialGradientPicker from './RadialGradient';
import DropDownPicker from './DropDownPicker';

interface GradientPickerProps {
    value?: GradientFill;
    onGradientChange: (gradient: GradientFill) => void;
    className?: string;
}

const GradientPicker: React.FC<GradientPickerProps> = ({ value, onGradientChange, className }) => {
    const gradient = value?.type == 'linear' || value?.type == 'radial' ? value : DEFAULT_LINEAR_GRADIENT;

    useEffect(() => {
        console.log('rendered gradient5', 9999, value);
        if (value?.type !== 'linear' && value?.type !== 'radial') {
            console.log('rendered gradient56', 9999, value);
            handleGradientChange(gradient);
        }
    }, [])

    const handleGradientChange = (gradient: GradientFill) => {
        onGradientChange(gradient)
    }

    const handleTypeChange = (newType: Gradient) => {

        if (newType === gradient.type) return;

        // Preserve existing color stops when switching types
        const currentStops = gradient.stops;

        if (newType === 'linear') {
            const newGradient: LinearGradient = {
                ...DEFAULT_LINEAR_GRADIENT,
                stops: currentStops
            };
            handleGradientChange(newGradient);
        } else if (newType === 'radial') {
            const newGradient: RadialGradient = {
                ...DEFAULT_RADIAL_GRADIENT,
                stops: currentStops
            };
            handleGradientChange(newGradient);
        }
    };

    const gradientTypeOptions = [
        { value: 'linear' as const, label: 'Linear', description: 'Straight line gradient' },
        { value: 'radial' as const, label: 'Radial', description: 'Circular gradient' }
    ];

    const selectedGradientType =
        gradientTypeOptions.find(o => o.value === gradient.type) ?? gradientTypeOptions[0];


    return (
        <div className={twMerge(`w-full p-3 flex flex-col gap-2 ${className}`)}>
            <DropDownPicker value={selectedGradientType} onValueChange={handleTypeChange} values={gradientTypeOptions} />
            {gradient && gradient.type == 'linear' && <LinearGradientPicker value={gradient as LinearGradient} onGradientChange={handleGradientChange} />}
            {gradient && gradient.type == 'radial' && <RadialGradientPicker value={gradient as RadialGradient} onGradientChange={handleGradientChange} />}
        </div>
    );
};

export default GradientPicker;