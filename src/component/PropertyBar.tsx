import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useSceneStore } from "@hooks/sceneStore";
import { Properties } from "@lib/types/shapes";
import Input from "@ui/Input";
import { twMerge } from "tailwind-merge";
import { useCanvasManagerStore } from "@hooks/useCanvasManager";
import { MoveHorizontal } from "lucide-react";
import Section from "@ui/Section";
import LockButton from "@ui/LockedButton";
import BorderRadius from "@ui/BorderRadius";
import BorderRadiusAll from "@ui/BorderRadiusAll";
// import PText from "@lib/shapes/primitives/PText";


function PropertyBar() {
    const { currentShapeProperties, updateProperty } = useSceneStore();
    const { shapeManager } = useCanvasManagerStore()

    const handlePropertyChange = (e: ChangeEvent<HTMLInputElement>, key: string) => {
        const { transform, size, style, borderRadius } = currentShapeProperties
        const value = e.currentTarget.type === "number" ? parseFloat(e.currentTarget.value) || 0 : e.currentTarget.value;

        const propertyMap = [
            { prop: transform, name: "transform" },
            { prop: size, name: "size" },
            { prop: style, name: "style" },
            { prop: borderRadius, name: "borderRadius" }
        ];

        for (const { prop, name } of propertyMap) {
            if (borderRadius.locked && key in borderRadius && typeof value == "number") {
                updateProperty("borderRadius", {
                    "top-left": value,
                    "top-right": value,
                    "bottom-left": value,
                    "bottom-right": value,
                    locked: true
                });
                shapeManager?.updateProperty("borderRadius", {
                    "top-left": value,
                    "top-right": value,
                    "bottom-left": value,
                    "bottom-right": value,
                    locked: true
                });
            }
            else if (key in prop) {
                updateProperty(name, { ...prop, [key]: value });
                if (shapeManager) {
                    shapeManager.updateProperty(name as keyof Properties, { ...prop, [key]: value });
                }
                break;
            }
        }
    };

    const toggle = (e, key: string, value: boolean) => {
        const { borderRadius } = currentShapeProperties;
        if (key !== "locked") return;

        let newBorderRadius;
        if (value) {
            const maxRadius = Math.max(
                borderRadius["top-left"],
                borderRadius["top-right"],
                borderRadius["bottom-left"],
                borderRadius["bottom-right"]
            );
            newBorderRadius = {
                "top-left": maxRadius,
                "top-right": maxRadius,
                "bottom-left": maxRadius,
                "bottom-right": maxRadius,
                locked: true
            };
        } else {
            newBorderRadius = { ...borderRadius, locked: false };
        }

        updateProperty('borderRadius', newBorderRadius);
        shapeManager?.updateProperty('borderRadius', newBorderRadius);
    };


    if (!currentShapeProperties) {
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
    const arcSegment = currentShapeProperties?.arcSegment

    return (
        <div className="propertybar">
            <div className="propertybar-header">
                header
            </div>
            <div className="propertybar-body">
                {transform && (
                    <Section title="Transform">
                        <Input type="number" title="X" objKey="x"
                            value={transform.x} callBack={handlePropertyChange} />
                        <Input type="number" title="Y" objKey="y"
                            value={transform.y} callBack={handlePropertyChange} />
                    </Section>
                )}
                {size && (
                    <Section title="Dimension">
                        <Input type="number" title="W" objKey="width"
                            value={size.width} callBack={handlePropertyChange} />
                        <Input type="number" title="H" objKey="height"
                            value={size.height} callBack={handlePropertyChange} />
                    </Section>
                )}
                {style && (
                    <Section title="Style">
                        <Input type="color" title="Fill" objKey="fill"
                            value={String(style.fill)} callBack={handlePropertyChange} />
                        <Input type="color" title="Stroke" objKey="strokeColor"
                            value={String(style.strokeColor)} callBack={handlePropertyChange} />
                    </Section>
                )}
                {arcSegment && (
                    <Section title="Arc-Segment">
                        <Input type="number" title="arc-start" objKey="startAngle"
                            value={String(arcSegment.startAngle)} callBack={handlePropertyChange} />
                        <Input type="number" title="arc-end" objKey="endAngle"
                            value={String(arcSegment.endAngle)} callBack={handlePropertyChange} />
                        <Input type="number" title="Ratio" objKey="ratio"
                            value={String(arcSegment.ratio)} callBack={handlePropertyChange} />
                    </Section>
                )}
                {borderRadius && (
                    <Section title="Border Radius">
                        {borderRadius.locked ? (
                            <>
                                <Input className="col-span-4" type="number" icon={<BorderRadius size={20} />} objKey="top-left"
                                    value={borderRadius["top-left"]} callBack={handlePropertyChange} />
                                <LockButton locked={borderRadius.locked} onClick={e => toggle(e, 'locked', !borderRadius.locked)} />
                            </>
                        ) : (
                            <div className="grid grid-cols-5 grid-rows-2 justify-items-center items-center gap-2 w-fit h-fit">
                                <Input className="col-span-2" type="number" icon={<BorderRadiusAll size={20} corner="top-left" />} objKey="top-left"
                                    value={borderRadius["top-left"]} callBack={handlePropertyChange} />
                                <Input className="col-span-2" type="number" icon={<BorderRadiusAll size={20} corner="top-right" />} objKey="top-right"
                                    value={borderRadius["top-right"]} callBack={handlePropertyChange} />
                                <LockButton locked={borderRadius.locked} onClick={e => toggle(e, 'locked', !borderRadius.locked)} />
                                <Input className="col-span-2" type="number" icon={<BorderRadiusAll size={20} corner="bottom-left" />} objKey="bottom-left"
                                    value={borderRadius["bottom-left"]} callBack={handlePropertyChange} />
                                <Input className="col-span-2" type="number" icon={<BorderRadiusAll size={20} corner="bottom-right" />} objKey="bottom-right"
                                    value={borderRadius["bottom-right"]} callBack={handlePropertyChange} />
                            </div>
                        )}
                    </Section>
                )}
            </div>

        </div>
    );
}

export default PropertyBar;