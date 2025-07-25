import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useSceneStore } from "@hooks/sceneStore";
import { Properties } from "@lib/types/shapes";
import Input from "@ui/Input";
import { twMerge } from "tailwind-merge";
// import PText from "@lib/shapes/primitives/PText";

// interface ShapeProperties {

// }

function PropertyBar() {
    const { currentScene, currentShapeProperties, updateProperty } = useSceneStore();

    const handlePropertyChange = (e: ChangeEvent<HTMLInputElement>, key: string) => {
        const { transform, size, style, borderRadius } = currentShapeProperties
        console.log(key, style);

        if (key in transform) {
            const value = parseFloat(e.currentTarget.value) || 0
            console.log(Object.values(transform));
            updateProperty('transform', {
                ...transform,
                [key]: value
            })
        } else if (key in size) {
            const value = parseFloat(e.currentTarget.value) || 0
            console.log(Object.values(size));
            updateProperty('size', {
                ...size,
                [key]: value
            })
        } else if (key in style) {
            const value = e.currentTarget.value
            console.log(key, e, value);
            console.log(Object.values(style));
            updateProperty('style', {
                ...style,
                [key]: value
            })
        } else if (key in borderRadius) {
            const value = e.currentTarget.value
            console.log(key, e, value);
            console.log(Object.values(borderRadius));
            updateProperty('borderRadius', {
                ...borderRadius,
                [key]: value
            })
        }

    };
    const toggle = (e, key: string, value: boolean) => {
        const { borderRadius } = currentShapeProperties
        if (key in borderRadius) {
            console.log(key, e, value);
            console.log(Object.values(borderRadius));
            updateProperty('borderRadius', {
                ...borderRadius,
                [key]: value
            })
        }
    }


    if (!currentScene || !currentShapeProperties) {
        return (
            <div className="propertybar">
                <div className="propertybar-header">
                    header
                </div>
                <div className="propertybar-body">
                    No shape selected
                </div>
            </div>
        );
    }

    const transform = currentShapeProperties?.transform;
    const size = currentShapeProperties?.size;
    const style = currentShapeProperties?.style
    const borderRadius = currentShapeProperties?.borderRadius

    return (
        <div className="propertybar">
            <div className="propertybar-header">
                header
            </div>
            <div className="propertybar-body">
                {transform &&
                    <section className="object-transform">
                        <div className="text-left p-0.5 text-black font-medium text-xs">
                            Transform
                        </div>
                        <div className="flex h-fit w-fit gap-3 text-black text-sm font-mono">
                            <Input type={'number'} title={'X'} objKey={"x"} value={transform.x} callBack={handlePropertyChange} />
                            <Input type={'number'} title={"Y"} objKey={"y"} value={transform.y} callBack={handlePropertyChange} />
                        </div>
                    </section>
                }
                {size &&
                    <section className="object-transform">
                        <div className="text-left p-0.5 text-black font-medium text-xs">
                            Dimension
                        </div>
                        <div className="flex h-fit w-fit gap-3 text-black text-sm font-mono">
                            <Input type={'number'} title={"W"} objKey={"width"} value={size.width} callBack={handlePropertyChange} />
                            <Input type={'number'} title={"H"} objKey={"height"} value={size.height} callBack={handlePropertyChange} />
                        </div>
                    </section>
                }
                {style &&
                    <section className="object-transform">
                        <div className="text-left p-0.5 text-black font-medium text-xs">
                            Style
                        </div>
                        <div className="flex h-fit w-fit gap-3 text-black text-sm font-mono">
                            <Input type={'color'} title={"Fill"} objKey={"fill"} value={String(style.fill)} callBack={handlePropertyChange} />
                            <Input type={'color'} title={"Stroke"} objKey={"strokeColor"} value={String(style.strokeColor)} callBack={handlePropertyChange} />
                        </div>
                    </section>
                }
                {borderRadius &&
                    <section className="object-transform">
                        <div className="text-left p-0.5 text-black font-medium text-xs">
                            Border Radius
                        </div>
                        <div className="grid grid-cols-5 grid-rows-2 justify-items-center items-center gap-2 text-black text-sm font-mono w-fit h-fit">
                            <Input className="col-span-2" type={'number'} title={"tl"} objKey={"top-left"} value={borderRadius["top-left"]} callBack={handlePropertyChange} />
                            <Input className="col-span-2" type={'number'} title={"tr"} objKey={"top-right"} value={borderRadius["top-right"]} callBack={handlePropertyChange} />
                            <button onClick={(e) => toggle(e, 'locked', !borderRadius.locked)} className={twMerge(`col-span-1 w-6 h-6 bg-white rounded flex items-center justify-center ${borderRadius.locked ? "bg-blue-500" : ''}`)}>
                                O
                            </button>
                            <Input className="col-span-2" type={'number'} title={"bl"} objKey={"bottom-left"} value={borderRadius["bottom-left"]} callBack={handlePropertyChange} />
                            <Input className="col-span-2" type={'number'} title={"br"} objKey={"bottom-right"} value={borderRadius["bottom-right"]} callBack={handlePropertyChange} />
                        </div>
                    </section>
                }
            </div>
        </div>
    );
}

export default PropertyBar;