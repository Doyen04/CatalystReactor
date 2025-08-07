import React, { useState, useEffect } from 'react';
import {Gradient, GradientFill, LinearGradient } from '@lib/types/shapes';
import { twMerge } from 'tailwind-merge';
import LinearGradientPicker from './LinearGradientPicker';

interface GradientPickerProps {
    value?: GradientFill;
    onGradientChange: (gradient: GradientFill) => void;
    className?: string;
}

const GradientPicker: React.FC<GradientPickerProps> = ({ value, onGradientChange, className }) => {
    const [gradient, setGradient] = useState<GradientFill>(value || null);
    const [gradientType, setGradientType] = useState<Gradient>('linear');

    useEffect(() => {
        console.log(value);
        
        if (value) {
            setGradient(value);
        }
    }, [value]);

    const handleGradientChange =(gradient: GradientFill)=>{
        console.log(gradient, onGradientChange);
        onGradientChange(gradient)
    }

    return (
        <div className={twMerge(`w-full p-3 ${className}`)}>
           
            {gradientType == 'linear' && <LinearGradientPicker value={value as LinearGradient} onGradientChange={handleGradientChange}/>}
        </div>
    );
};

export default GradientPicker;