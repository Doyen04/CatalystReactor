import React from "react";
import { useSceneStore } from "@hooks/sceneStore";
import { Fill, Properties} from "@lib/types/shapes";
import Input from "@ui/Input";
import { useCanvasManagerStore } from "@hooks/useCanvasManager";
import { Hexagon } from "lucide-react";
import Section from "@ui/Section";
import LockButton from "@ui/LockedButton";
import BorderRadius from "@ui/BorderRadius";
import BorderRadiusAll from "@ui/BorderRadiusAll";
import { AngleIcon } from "@ui/ArcSegment";
import ColorInput from "@ui/ColorInput";


function PropertyBar() {
    const { currentShapeProperties, updateProperty } = useSceneStore();
    const { shapeManager } = useCanvasManagerStore()

    const handlePropertyChange = (key: string, value: number) => {
        const { transform, size, style, borderRadius, sides, spikesRatio } = currentShapeProperties

        const propertyMap = [
            { prop: transform, name: "transform" },
            { prop: size, name: "size" },
            { prop: style, name: "style" },
            { prop: borderRadius, name: "borderRadius" },
            { prop: arcSegment, name: "arcSegment" },
            { prop: sides, name: "sides" },
            { prop: spikesRatio, name: "spikesRatio" },
        ];

        for (const { prop, name } of propertyMap) {
            if (!prop) continue

            if (key == 'radii' && borderRadius && borderRadius.locked && typeof value == "number") {
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

    const handleColorChange = (key: string, value: Fill) => {

        const { style } = currentShapeProperties;
        if (!style) return;

        let newStyle = { ...style };

        if (key === 'fill') {
            newStyle = {
                ...style,
                fill: {
                    ...style.fill,
                    color:value
                }
            };
        } else if (key === 'strokeColor') {
            newStyle = {
                ...style,
                stroke: {
                    ...style.stroke,
                    color: value
                }
            };
        }

        updateProperty('style', newStyle);
        shapeManager?.updateProperty('style', newStyle);

    }

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
    const sides = currentShapeProperties?.sides
    const spikesRatio = currentShapeProperties?.spikesRatio

    return (
        <div className="propertybar">
            <div className="propertybar-header">
                header
            </div>
            <div className="propertybar-body">
                {transform && (
                    <Section title="Transform">
                        <Input type="number" title="X"
                            value={transform.x} onChange={(value) => handlePropertyChange('x', value)} />
                        <Input type="number" title="Y"
                            value={transform.y} onChange={(value) => handlePropertyChange('y', value)} />
                    </Section>
                )}
                {size && (
                    <Section title="Dimension">
                        <Input type="number" title="W"
                            value={size.width} onChange={(value) => handlePropertyChange('width', value)} />
                        <Input type="number" title="H"
                            value={size.height} onChange={(value) => handlePropertyChange('height', value)} />
                    </Section>
                )}

                {style && (
                    <Section title="Style">
                        <ColorInput
                            fill={style.fill.color} opacity={style.fill.opacity} onChange={(fill) => handleColorChange('fill', fill)} />
                        <ColorInput
                            fill={style.stroke.color} opacity={style.stroke.opacity} onChange={(strokeColor) => handleColorChange('strokeColor', strokeColor)} />
                    </Section>
                )}

                {spikesRatio && (
                    <Section title="Spikes-Ratio">
                        <Input type="number" title="Spikes"
                            value={spikesRatio.spikes} onChange={(value) => handlePropertyChange('spikes', value)} />
                        <Input type="number" title="Ratio"
                            value={spikesRatio.ratio} onChange={(value) => handlePropertyChange('ratio', value)} />
                    </Section>
                )}
                {arcSegment && (
                    <Section title="Arc-Segment" childClass="gap-0">
                        <Input type="number" icon={<AngleIcon startAngle={arcSegment.startAngle} endAngle={arcSegment.endAngle} ratio={arcSegment.ratio} />}
                            value={arcSegment.startAngle} onChange={(value) => handlePropertyChange('startAngle', value)} />
                        <Input type="number" title="End Angle"
                            value={arcSegment.endAngle} onChange={(value) => handlePropertyChange('endAngle', value)} />
                        <Input type="number" title="Ratio"
                            value={arcSegment.ratio} onChange={(value) => handlePropertyChange('ratio', value)} />
                    </Section>
                )}
                {sides && (
                    <Section title="Sides">
                        <Input type="number" icon={<Hexagon size={20} />}
                            value={sides.sides} onChange={(value) => handlePropertyChange('sides', value)} />

                    </Section>
                )}
                {borderRadius && (
                    <Section title="Border Radius">
                        {borderRadius.locked ? (
                            <>
                                <Input className="col-span-4" type="number" icon={<BorderRadius size={20} />}
                                    value={borderRadius["top-left"]} onChange={(value) => handlePropertyChange('top-left', value)} />
                                <LockButton locked={borderRadius.locked} onClick={e => toggle(e, 'locked', !borderRadius.locked)} />
                            </>
                        ) : (
                            <div className="grid grid-cols-5 grid-rows-2 justify-items-center items-center gap-2 w-fit h-fit">
                                <Input className="col-span-2" type="number" icon={<BorderRadiusAll size={20} corner="top-left" />}
                                    value={borderRadius["top-left"]} onChange={(value) => handlePropertyChange('top-left', value)} />
                                <Input className="col-span-2" type="number" icon={<BorderRadiusAll size={20} corner="top-right" />}
                                    value={borderRadius["top-right"]} onChange={(value) => handlePropertyChange('top-right', value)} />
                                <LockButton locked={borderRadius.locked} onClick={e => toggle(e, 'locked', !borderRadius.locked)} />
                                <Input className="col-span-2" type="number" icon={<BorderRadiusAll size={20} corner="bottom-left" />} 
                                    value={borderRadius["bottom-left"]} onChange={(value) => handlePropertyChange('bottom-left', value)} />
                                <Input className="col-span-2" type="number" icon={<BorderRadiusAll size={20} corner="bottom-right" />}
                                    value={borderRadius["bottom-right"]} onChange={(value) => handlePropertyChange('bottom-right', value)} />
                            </div>
                        )}
                    </Section>
                )}
            </div>

        </div>
    );
}

export default PropertyBar;