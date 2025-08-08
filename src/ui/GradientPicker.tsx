import React from 'react';
import { DEFAULT_LINEAR_GRADIENT, GradientFill, LinearGradient } from '@lib/types/shapes';
import { twMerge } from 'tailwind-merge';
import LinearGradientPicker from './LinearGradientPicker';

interface GradientPickerProps {
    value?: GradientFill;
    onGradientChange: (gradient: GradientFill) => void;
    className?: string;
}

const GradientPicker: React.FC<GradientPickerProps> = ({ value, onGradientChange, className }) => {
    const gradient = value?.type == 'linear' || value?.type == 'radial' ? value : DEFAULT_LINEAR_GRADIENT;

    const handleGradientChange = (gradient: GradientFill) => {
        console.log(gradient, onGradientChange);
        onGradientChange(gradient)
    }

    return (
        <div className={twMerge(`w-full p-3 ${className}`)}>

            {gradient && gradient.type == 'linear' && <LinearGradientPicker value={gradient as LinearGradient} onGradientChange={handleGradientChange} />}
        </div>
    );
};

export default GradientPicker;