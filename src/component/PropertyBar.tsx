import React, { useState } from 'react'
import { useSceneStore } from '@hooks/sceneStore'
import { ColorProps } from '@lib/types/shapes'
import Input from '@ui/Input'
import { useCanvasManagerStore } from '@hooks/useCanvasManager'
import { Hexagon } from 'lucide-react'
import { Section,  GRID2X2 } from '@ui/Section'
import LockButton from '@ui/LockedButton'
import BorderRadius from '@ui/BorderRadius'
import BorderRadiusAll from '@ui/BorderRadiusAll'
import ColorInput from '@ui/ColorInput'
import Tabs from '@ui/Tabs'

function PropertyBar() {
    const { currentShapeProperties } = useSceneStore()
    const { shapeManager } = useCanvasManagerStore()
    const [activeTab, setActiveTab] = useState('design')

    const tabs = [
        { id: 'design', label: 'Design' },
        { id: 'advanced', label: 'Advanced' }
    ]

    const handlePropertyChange = (key: string, value: number) => {
        if (!shapeManager || !currentShapeProperties) return
        const { transform, size, spikesRatio, arcSegment, sides } = currentShapeProperties
        if (key === 'top-left' || key === 'top-right' || key === 'bottom-left' || key === 'bottom-right' || key === 'radii') {
            shapeManager.updateBorderRadius(value, key)
            return
        }
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

    const toggle = (e: Event, key: string, value: boolean) => {
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
                <div className="propertybar-header text-xs text-gray-500 justify-center">Selection</div>
                <div className="flex-1 flex items-center justify-center text-gray-600 text-xs text-center px-10">
                    Select a shape to view its properties
                </div>
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

    return (
        <div className="propertybar">
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="propertybar-body">
                {activeTab === 'design' ? (
                    <>
                        {transform && (
                            <GRID2X2 title="Transform">
                                <Input type="number" title="X" value={transform.x} onChange={value => handlePropertyChange('x', value)} />
                                <Input type="number" title="Y" value={transform.y} onChange={value => handlePropertyChange('y', value)} />
                            </GRID2X2>
                        )}

                        {size && (
                            <GRID2X2 title="Dimension">
                                <Input type="number" title="W" value={size.width} onChange={value => handlePropertyChange('width', value)} />
                                <Input type="number" title="H" value={size.height} onChange={value => handlePropertyChange('height', value)} />
                            </GRID2X2>
                        )}

                        {style && (
                            <GRID2X2 title="Style">
                                <ColorInput fill={style.fill} onChange={fill => handleColorChange('fill', fill)} />
                                <ColorInput fill={{ color: style.stroke.color, opacity: style.stroke.opacity } as ColorProps} onChange={strokeColor => handleColorChange('strokeColor', strokeColor)} />
                            </GRID2X2>
                        )}

                        {spikesRatio && (
                            <GRID2X2 title="Spikes-Ratio">
                                <Input type="number" title="Spikes" value={spikesRatio.spikes} onChange={value => handlePropertyChange('spikes', value)} />
                                <Input type="number" title="Ratio" value={spikesRatio.ratio} onChange={value => handlePropertyChange('ratio', value)} />
                            </GRID2X2>
                        )}

                        {arcSegment && (
                            <GRID2X2 title="Arc-Segment" childClass="gap-0">
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
                                    onChange={value => handlePropertyChange('sweep', value)}
                                />
                                <Input type="number" title="Ratio" value={arcSegment.ratio} onChange={value => handlePropertyChange('ratio', value)} />
                            </GRID2X2>
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
                    </>
                ) : (
                    <div className="space-y-4">
                        <Section title="Path Data">
                            {currentShapeProperties?.pathData ? (
                                <div className="text-[10px] font-mono text-gray-400 bg-black/30 p-2 rounded border border-[#333] whitespace-pre-wrap">
                                    {JSON.stringify(currentShapeProperties.pathData, null, 2)}
                                </div>
                            ) : (
                                <div className="text-gray-600 text-xs">No path data available</div>
                            )}
                        </Section>
                        <Section title="Export JSON">
                            <button 
                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs transition-colors"
                                onClick={() => {
                                    console.log(currentShapeProperties)
                                    alert('Properties logged to console')
                                }}
                            >
                                Log Properties to Console
                            </button>
                        </Section>
                    </div>
                )}
            </div>
        </div>
    )
}

export default PropertyBar

