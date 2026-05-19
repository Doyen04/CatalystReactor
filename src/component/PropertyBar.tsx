import React from 'react'
import { useSceneStore } from '@hooks/sceneStore'
import { ColorProps, Properties } from '@lib/types/shapes'
import Input from '@ui/Input'
import { useCanvasManagerStore } from '@hooks/useCanvasManager'
import { Hexagon } from 'lucide-react'
import Section from '@ui/Section'
import LockButton from '@ui/LockedButton'
import BorderRadius from '@ui/BorderRadius'
import BorderRadiusAll from '@ui/BorderRadiusAll'
// import { AngleIcon } from '@ui/ArcSegment'
import ColorInput from '@ui/ColorInput'

function PropertyBar() {
    const { currentShapeProperties } = useSceneStore()
    const { shapeManager } = useCanvasManagerStore()

    const handlePropertyChange = (key: string, value: number) => {
        if (!shapeManager) return

        const { borderRadius, transform, size, spikesRatio, arcSegment, sides } = currentShapeProperties

        // Special handling for radius
        if (key === 'top-left' || key === 'top-right' || key === 'bottom-left' || key === 'bottom-right' || key === 'radii') {
            shapeManager.updateBorderRadius(value, key)
            return
        }

        // Delegated sub-property updates
        if (transform && key in transform) {
            shapeManager.updateSubProperty('transform', key, value)
        } else if (size && key in size) {
            shapeManager.updateSubProperty('size', key, value)
        } else if (spikesRatio && key in spikesRatio) {
            shapeManager.updateSubProperty('spikesRatio', key, value)
        } else if (arcSegment && key in arcSegment) {
            shapeManager.updateSubProperty('arcSegment', key, value)
        } else if (sides && key in sides) {
            shapeManager.updateSubProperty('sides', key, value)
        }
    }

    const toggle = (e: any, key: string, value: boolean) => {
        if (key === 'locked') {
            shapeManager?.updateRadiusLock(value)
        }
    }

    const handleColorChange = (key: string, value: ColorProps) => {
        shapeManager?.updateStyle(key as 'fill' | 'strokeColor', value)
    }

    if (!currentShapeProperties) {
        return (
            <div className="propertybar">
                <div className="propertybar-header"> {JSON.stringify(currentShapeProperties)} </div>
                <div className="propertybar-body">No shape selected</div>
            </div>
        )
    }

    const transform = currentShapeProperties?.transform
    const size = currentShapeProperties?.size
    const style = currentShapeProperties?.style
    const borderRadius = currentShapeProperties?.borderRadius
    const arcSegment = currentShapeProperties?.arcSegment
    const sides = currentShapeProperties?.sides
    const spikesRatio = currentShapeProperties?.spikesRatio
    // const textStyle = currentShapeProperties?.textStyle
    // const fontOptions = Array.from(new Set([...(textStyle?.fontFamily ?? []), ...FONT_FAMILIES]))

    return (
        <div className="propertybar">
            <div className="propertybar-header">header</div>
            <div className="propertybar-body">
                {transform && (
                    <Section title="Transform">
                        <Input type="number" title="X" value={transform.x} onChange={value => handlePropertyChange('x', value)} />
                        <Input type="number" title="Y" value={transform.y} onChange={value => handlePropertyChange('y', value)} />
                    </Section>
                )}

                {size && (
                    <Section title="Dimension">
                        <Input type="number" title="W" value={size.width} onChange={value => handlePropertyChange('width', value)} />
                        <Input type="number" title="H" value={size.height} onChange={value => handlePropertyChange('height', value)} />
                    </Section>
                )}

                {style && (
                    <Section title="Style">
                        <ColorInput fill={style.fill} onChange={fill => handleColorChange('fill', fill)} />
                        <ColorInput fill={{ color: style.stroke.color, opacity: style.stroke.opacity } as ColorProps} onChange={strokeColor => handleColorChange('strokeColor', strokeColor)} />
                    </Section>
                )}

                {spikesRatio && (
                    <Section title="Spikes-Ratio">
                        <Input type="number" title="Spikes" value={spikesRatio.spikes} onChange={value => handlePropertyChange('spikes', value)} />
                        <Input type="number" title="Ratio" value={spikesRatio.ratio} onChange={value => handlePropertyChange('ratio', value)} />
                    </Section>
                )}

                {arcSegment && (
                    <Section title="Arc-Segment" childClass="gap-0">
                        <Input
                            type="number"
                            title="Start"
                            value={arcSegment.startAngle}
                            onChange={value => handlePropertyChange('startAngle', value)}
                        />
                        <Input
                            type="number"
                            title="End"
                            value={arcSegment.sweep}
                            onChange={value => handlePropertyChange('endAngle', value)}
                        />
                        <Input type="number" title="Ratio" value={arcSegment.ratio} onChange={value => handlePropertyChange('ratio', value)} />
                    </Section>
                )}

                {sides && (
                    <Section title="Sides">
                        <Input
                            type="number"
                            icon={<Hexagon size={20} />}
                            value={sides.sides}
                            onChange={value => handlePropertyChange('sides', value)}
                        />
                    </Section>
                )}

                {borderRadius && (
                    <Section title="Border Radius">
                        {borderRadius.locked ? (
                            <>
                                <Input
                                    className="col-span-4"
                                    type="number"
                                    icon={<BorderRadius size={20} />}
                                    value={borderRadius['top-left']}
                                    onChange={value => handlePropertyChange('top-left', value)}
                                />
                                <LockButton locked={borderRadius.locked} onClick={e => toggle(e, 'locked', !borderRadius.locked)} />
                            </>
                        ) : (
                            <div className="grid grid-cols-5 grid-rows-2 justify-items-center items-center gap-2 w-fit h-fit">
                                <Input
                                    className="col-span-2"
                                    type="number"
                                    icon={<BorderRadiusAll size={20} corner="top-left" />}
                                    value={borderRadius['top-left']}
                                    onChange={value => handlePropertyChange('top-left', value)}
                                />
                                <Input
                                    className="col-span-2"
                                    type="number"
                                    icon={<BorderRadiusAll size={20} corner="top-right" />}
                                    value={borderRadius['top-right']}
                                    onChange={value => handlePropertyChange('top-right', value)}
                                />
                                <LockButton locked={borderRadius.locked} onClick={e => toggle(e, 'locked', !borderRadius.locked)} />
                                <Input
                                    className="col-span-2"
                                    type="number"
                                    icon={<BorderRadiusAll size={20} corner="bottom-left" />}
                                    value={borderRadius['bottom-left']}
                                    onChange={value => handlePropertyChange('bottom-left', value)}
                                />
                                <Input
                                    className="col-span-2"
                                    type="number"
                                    icon={<BorderRadiusAll size={20} corner="bottom-right" />}
                                    value={borderRadius['bottom-right']}
                                    onChange={value => handlePropertyChange('bottom-right', value)}
                                />
                            </div>
                        )}
                    </Section>
                )}

                
            </div>
        </div>
    )
}

export default PropertyBar
