import React, { useEffect, useState } from "react";
import { useSceneStore } from "@hooks/sceneStore";
import { IShape } from "@lib/types/shapes";
import PText from "@lib/shapes/primitives/PText";

interface ShapeProperties {
    x: number;
    y: number;
    rotation: number;
    scale: number;
    fill: string | number[];
    strokeWidth: number;
    strokeColor: string | number[];
    // Text-specific properties
    text?: string;
    fontSize?: number;
    fontFamily?: string;
}

function PropertyBar() {
    const { currentScene } = useSceneStore();
    const [selectedShape, setSelectedShape] = useState<IShape | null>(null);
    const [properties, setProperties] = useState<ShapeProperties | null>(null);

    useEffect(() => {
        const updateSelectedShape = () => {
            
            if (currentScene) {
                console.log(currentScene.getShape().getProperties());
            }
        };

        updateSelectedShape();
    }, [currentScene]);

    const isTextShape = (shape: IShape): shape is PText => {
        return shape instanceof PText ||
            (typeof (shape as any).getText === 'function' &&
                typeof (shape as any).setText === 'function');
    };

    const handlePropertyChange = (property: keyof ShapeProperties, value: any) => {

        setProperties(prev => prev ? { ...prev, [property]: value } : null);
    };


    if (!selectedShape || !properties) {
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

    return (
        <div className="propertybar">
            <div className="propertybar-header">
                header
            </div>
            <div className="propertybar-body">
                <section className="object-properties">

                </section>
            </div>
        </div>
    );
}

export default PropertyBar;