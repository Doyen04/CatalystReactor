


import { colorValue } from '@/util/getBackgroundFill';
import hsvToRgb from '@/util/hsvToRgb';
import parseColorToHSV from '@/util/parseToHSVA';
import { SolidFill } from '@lib/types/shapes';
import React, { useState, useRef, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';

interface ColorPickerProps {
    value: SolidFill;
    isOpen: boolean;
    onColorChange: (color: SolidFill) => void;
    className?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onColorChange, isOpen, className }) => {
    const [hsv, setHsv] = useState<HSV>({ h: 0, s: 100, v: 100 });
    const [alpha, setAlpha] = useState(1);

    const hueCanvasRef = useRef<HTMLCanvasElement>(null);
    const satValCanvasRef = useRef<HTMLCanvasElement>(null);
    const alphaCnvsRef = useRef<HTMLDivElement>(null)
    const isDraggingHue = useRef(false);
    const isDraggingSatVal = useRef(false);
    const isDraggingAlpha = useRef(false)

    // Initialize color from prop
    useEffect(() => {
        const initialHsv = parseColorToHSV(colorValue(value.color));
        setHsv(initialHsv.hsv);
        setAlpha(initialHsv.alpha)
    }, [value]);

    // Draw hue bar
    useEffect(() => {
        const canvas = hueCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        for (let i = 0; i <= 360; i += 60) {
            const [r, g, b] = hsvToRgb(i, 100, 100);
            gradient.addColorStop(i / 360, `rgb(${r}, ${g}, ${b})`);
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, [isOpen]);

    // Draw saturation/value area
    useEffect(() => {
        const canvas = satValCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Fill with current hue
        const [r, g, b] = hsvToRgb(hsv.h, 100, 100);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // White gradient (saturation)
        const whiteGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        whiteGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        whiteGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = whiteGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Black gradient (value)
        const blackGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        blackGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        blackGradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
        ctx.fillStyle = blackGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, [hsv.h, isOpen]);

    // Handle hue changes
    const handleHueMouseDown = (e: React.MouseEvent) => {
        isDraggingHue.current = true;
        updateHue(e);
    };

    const updateHue = (e: React.MouseEvent | MouseEvent) => {
        const canvas = hueCanvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, canvas.width));
        const newHue = (x / canvas.width) * 360;

        setHsv(prev => ({ ...prev, h: newHue }));
        updateColor({ ...hsv, h: newHue }, alpha);
    };

    // Handle saturation/value changes
    const handleSatValMouseDown = (e: React.MouseEvent) => {
        isDraggingSatVal.current = true;
        updateSatVal(e);
    };

    const updateSatVal = (e: React.MouseEvent | MouseEvent) => {
        const canvas = satValCanvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, canvas.width));
        const y = Math.max(0, Math.min(e.clientY - rect.top, canvas.height));

        const newSat = (x / canvas.width) * 100;
        const newVal = 100 - (y / canvas.height) * 100;

        setHsv(prev => ({ ...prev, s: newSat, v: newVal }));
        updateColor({ ...hsv, s: newSat, v: newVal }, alpha);
    };

    const handleAlphaMouseDown = (e: React.MouseEvent) => {
        isDraggingAlpha.current = true;
        updateAlphaVal(e);
    }

    const updateAlphaVal = (e: MouseEvent | React.MouseEvent) => {
        const canvas = alphaCnvsRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
        const newAlpha = 1 - y / rect.height; // 0–1

        setAlpha(newAlpha);
        updateColor(hsv, newAlpha)
    }

    const updateColor = (hsv: HSV, alpha: number) => {
        const [r, g, b] = hsvToRgb(hsv.h, hsv.s, hsv.v);
        const hexRgb = `#${[r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')}`;
        const output = alpha < 1
            ? `${hexRgb}${Math.round(alpha * 255).toString(16).padStart(2, '0')}` // 8‑digit hex
            : hexRgb;
            
        const solidFill: SolidFill = {
            type: 'solid',
            color: output
        };
        onColorChange(solidFill);
    };

    // Mouse event handlers
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDraggingHue.current) {
                updateHue(e);
            } else if (isDraggingSatVal.current) {
                updateSatVal(e);
            } else if (isDraggingAlpha.current) {
                updateAlphaVal(e)
            }
        };

        const handleMouseUp = () => {
            isDraggingHue.current = false;
            isDraggingSatVal.current = false;
            isDraggingAlpha.current = false;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [hsv, alpha]);

    const currentColor = (() => {
        const [r, g, b] = hsvToRgb(hsv.h, hsv.s, hsv.v);
        return `rgba(${r}, ${g}, ${b},${alpha})`;
    })();

    return (
        <div className={twMerge(`w-fit h-fit p-3 ${className}`)}>
            <div className='flex flex-row gap-1 '>
                <div className='w-fit h-fit'>
                    {/* Saturation/Value Area */}
                    <div className="relative w-fit h-fit rounded border border-[#323232] mb-2">
                        <canvas
                            ref={satValCanvasRef}
                            width={240}
                            height={240}
                            className="cursor-crosshair rounded"
                            onMouseDown={handleSatValMouseDown}
                        />
                        {/* Saturation/Value Indicator */}
                        <div
                            className="absolute w-2.5 h-2.5 border-2 border-white rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                            style={{
                                left: `${(hsv.s / 100) * 240}px`,
                                top: `${((100 - hsv.v) / 100) * 240}px`,
                                boxShadow: '0 0 0 1px rgba(0,0,0,0.3)'
                            }}
                        />
                    </div>

                    {/* Hue Bar */}
                    <div className="relative mb-3 rounded border-gray-200 border-2 w-fit h-fit">
                        <canvas
                            ref={hueCanvasRef}
                            width={240}
                            height={20}
                            className="cursor-pointer rounded"
                            onMouseDown={handleHueMouseDown}
                        />
                        {/* Hue Indicator */}
                        <div
                            className="absolute w-1 h-6 bg-white border border-gray-400 pointer-events-none transform -translate-x-1/2"
                            style={{
                                left: `${(hsv.h / 360) * 240}px`,
                                top: '-3px'
                            }}
                        />
                    </div>
                </div>

                <div className='w-2 h-[240px] bg-gray-700 border-2 border-gray-300 rounded relative'
                    ref={alphaCnvsRef}
                    onMouseDown={handleAlphaMouseDown}>
                    <div className="absolute rounded-full w-3 h-3 border-3 border-gray-700 bg-white pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                            left: '2px',
                            top: `${(1 - alpha) * 240}px`
                        }}>
                    </div>
                </div>
            </div>

            {/* Color Preview and Close */}
            <div className="flex items-center justify-between">
                <div
                    className="w-4 h-4 border border-gray-300 rounded"
                    style={{ backgroundColor: currentColor }}
                />
                <div className="text-xs font-mono text-gray-600">
                    {currentColor.toUpperCase()}
                </div>
            </div>
        </div>
    )
}

export default ColorPicker