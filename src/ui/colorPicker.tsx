import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    className?: string;
}

interface HSV {
    h: number; // 0-360
    s: number; // 0-100
    v: number; // 0-100
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [hsv, setHsv] = useState<HSV>({ h: 0, s: 100, v: 100 });
    const [alpha, setAlpha] = useState(1);

    const hueCanvasRef = useRef<HTMLCanvasElement>(null);
    const satValCanvasRef = useRef<HTMLCanvasElement>(null);
    const alphaCnvsRef = useRef<HTMLDivElement>(null)
    const isDraggingHue = useRef(false);
    const isDraggingSatVal = useRef(false);
    const isDraggingAlpha = useRef(false)

    // Convert HSV to RGB
    const hsvToRgb = useCallback((h: number, s: number, v: number): [number, number, number] => {
        const c = (v / 100) * (s / 100);
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = (v / 100) - c;

        let r = 0, g = 0, b = 0;

        if (h >= 0 && h < 60) {
            r = c; g = x; b = 0;
        } else if (h >= 60 && h < 120) {
            r = x; g = c; b = 0;
        } else if (h >= 120 && h < 180) {
            r = 0; g = c; b = x;
        } else if (h >= 180 && h < 240) {
            r = 0; g = x; b = c;
        } else if (h >= 240 && h < 300) {
            r = x; g = 0; b = c;
        } else if (h >= 300 && h < 360) {
            r = c; g = 0; b = x;
        }

        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        ];
    }, []);

    // Convert RGB to HSV
    const rgbToHsv = useCallback((r: number, g: number, b: number): HSV => {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;

        let h = 0;
        const s = max === 0 ? 0 : (diff / max) * 100;
        const v = max * 100;

        if (diff !== 0) {
            if (max === r) {
                h = ((g - b) / diff) % 6;
            } else if (max === g) {
                h = (b - r) / diff + 2;
            } else {
                h = (r - g) / diff + 4;
            }
            h *= 60;
            if (h < 0) h += 360;
        }

        return { h, s, v };
    }, []);

    // Parse color string to HSVA
    const parseColor = useCallback((color: string): { hsv: HSV, alpha: number } => {
        if (color.startsWith('#')) {
            let hex = color.slice(1).toLowerCase();
            if (hex.length === 3 || hex.length === 4) {
                hex = hex.split('').map(ch => ch + ch).join('');
            }
            const hasAlpha = hex.length === 8;
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            const a = hasAlpha ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
            const hsv = rgbToHsv(r, g, b);
            return { hsv, alpha: a };
        }
        return { hsv: { h: 0, s: 100, v: 100 }, alpha: 1 };
    }, [rgbToHsv]);

    // Initialize color from prop
    useEffect(() => {
        const initialHsv = parseColor(value);
        setHsv(initialHsv.hsv);
        setAlpha(initialHsv.alpha)
    }, [value, parseColor]);

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
    }, [hsvToRgb, isOpen]);

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
    }, [hsv.h, hsvToRgb, isOpen]);

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

        console.log(output);

        onChange(output);
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
        <div className={`relative ${className}`}>
            {/* Color Preview Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-4 h-3.5 rounded border-2 border-gray-300 cursor-pointer"
                style={{ backgroundColor: value }}
            />
            {isOpen && (
                <div className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                >
                    <div onClick={(e) => e.stopPropagation()} className="absolute bottom-10 right-65 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 w-fit h-fit">
                        <div onClick={() => setIsOpen(false)} className='w-5 h-5 rounded-full bg-white border-2 border-gray-500 flex items-center justify-center absolute -top-3 -left-3 cursor-pointer'>
                            X
                        </div>

                        <div className='flex flex-row gap-1 '>
                            <div className='w-fit h-fit'>
                                {/* Saturation/Value Area */}
                                <div className="relative w-fit h-fit p-0.5 rounded bg-gray-200 mb-2">
                                    <canvas
                                        ref={satValCanvasRef}
                                        width={240}
                                        height={150}
                                        className="cursor-crosshair rounded"
                                        onMouseDown={handleSatValMouseDown}
                                    />
                                    {/* Saturation/Value Indicator */}
                                    <div
                                        className="absolute w-2.5 h-2.5 border-2 border-white rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                                        style={{
                                            left: `${(hsv.s / 100) * 240}px`,
                                            top: `${((100 - hsv.v) / 100) * 150}px`,
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

                            <div className='w-2 h-[180px] bg-gray-700 border-2 border-gray-300 rounded relative'
                                ref={alphaCnvsRef}
                                onMouseDown={handleAlphaMouseDown}>
                                <div className="absolute rounded-full w-3 h-3 border-3 border-gray-700 bg-white pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                                    style={{
                                        left: '2px',
                                        top: `${(1 - alpha) * 180}px`
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
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ColorPicker;