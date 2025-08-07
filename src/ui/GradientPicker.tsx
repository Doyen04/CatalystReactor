import React, { useState, useEffect } from 'react';
import { DEFAULT_LINEAR_GRADIENT, Gradient, GradientFill, LinearGradient } from '@lib/types/shapes';
import { twMerge } from 'tailwind-merge';
import LinearGradientPicker from './LinearGradientPicker';

interface GradientPickerProps {
    value?: GradientFill;
    onGradientChange: (gradient: GradientFill) => void;
    className?: string;
}

const GradientPicker: React.FC<GradientPickerProps> = ({ value, onGradientChange, className }) => {
    const [gradient, setGradient] = useState<GradientFill>();
    const [gradientType, setGradientType] = useState<Gradient>();

    useEffect(() => {
        console.log(value);

        if (value.type == 'linear') {
            setGradient(DEFAULT_LINEAR_GRADIENT);
            setGradientType('linear')
        } else if (value.type == 'radial') {
            setGradient(null)
        }
    }, [value]);

    useEffect(() => {
        console.log(value);

        if (value.type !== 'linear' && value.type !== 'radial') {
            setGradientType('linear')
        }
    }, [value]);

    const handleGradientChange = (gradient: GradientFill) => {
        console.log(gradient, onGradientChange);
        onGradientChange(gradient)
    }

    return (
        <div className={twMerge(`w-full p-3 ${className}`)}>

            {gradientType == 'linear' && <LinearGradientPicker value={gradient as LinearGradient} onGradientChange={handleGradientChange} />}
        </div>
    );
};

export default GradientPicker;