
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
import DropDownPicker from '@ui/DropDownPicker'

function PropertyBar() {
    const { currentShapeProperties } = useSceneStore()
    const { shapeManager } = useCanvasManagerStore()
    const [activeTab, setActiveTab] = useState('design')

    const tabs = [
        { id: 'design', label: 'Design' },
        { id: 'advanced', label: 'Advanced' }
    ]


    const handlePropertyChange = (key: string, value: any): void => {
        if (!shapeManager || !currentShapeProperties) return
        const { transform, size, spikesRatio, arcSegment, sides, style, textStyle } = currentShapeProperties
        
        if (key === 'top-left' || key === 'top-right' || key === 'bottom-left' || key === 'bottom-right' || key === 'radii') {
            shapeManager.updateBorderRadius(value, key)
            return
        }
        
        // Transform properties (including rotation, scale, anchor)
        if (transform && (key === 'x' || key === 'y' || key === 'rotation' || key === 'scaleX' || key === 'scaleY')) {
            shapeManager.updateSubProperty('transform', key, value)
        }
        // Anchor point support
        else if (transform && (key === 'anchorPoint_x' || key === 'anchorPoint_y')) {
            const anchorKey = key.replace('anchorPoint_', '')
            if (transform.anchorPoint) {
                const newAnchor = { ...transform.anchorPoint, [anchorKey]: value }
                shapeManager.updateSubProperty('transform', 'anchorPoint', newAnchor)
            }
        }
        // Size properties
        else if (size && key in size) {
            shapeManager.updateSubProperty('size', key, value)
        }
        // Stroke properties
        else if (style && key.startsWith('stroke_')) {
            const strokeKey = key.replace('stroke_', '')
            shapeManager.updateSubProperty('style', `stroke.${strokeKey}`, value)
        }
        // Text style properties
        else if (textStyle && key.startsWith('text_')) {
            const textKey = key.replace('text_', '')
            shapeManager.updateSubProperty('textStyle', textKey, value)
        }
        // Layout properties (stored separately on container nodes)
        else if (key.startsWith('layout_')) {
            const layoutKey = key.replace('layout_', '')
            if (layoutKey.startsWith('padding_')) {
                const paddingKey = layoutKey.replace('padding_', '')
                shapeManager.updateSubProperty('layoutConstraints', `padding.${paddingKey}`, value)
            } else {
                shapeManager.updateSubProperty('layoutConstraints', layoutKey, value)
            }
        }
        // Other properties  
        else if (spikesRatio && key in spikesRatio) {
            shapeManager.updateSubProperty('spikesRatio', key, value)
        } else if (arcSegment && key in arcSegment) {
            shapeManager.updateSubProperty('arcSegment', key, value)
        } else if (sides && key in sides) {
            shapeManager.updateSubProperty('sides', key, value)
        }
    }

    const toggle = (e: React.MouseEvent<HTMLButtonElement>, key: string, value: boolean): void => {
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
    const arcSegment = currentShapeProperties?.arcSegment
    const sides = currentShapeProperties?.sides
    const spikesRatio = currentShapeProperties?.spikesRatio
    const textStyle = currentShapeProperties?.textStyle
    const borderRadius = currentShapeProperties?.borderRadius
    const layoutConstraints = currentShapeProperties?.layoutConstraints

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

                        {/* TRANSFORM - Rotation, Scale, Anchor */}
                        {transform && (transform.rotation !== undefined || transform.scaleX !== undefined || transform.anchorPoint !== undefined) && (
                            <GRID2X2 title="Transform (Scale/Rotate)">
                                {transform.rotation !== undefined && (
                                    <Input type="number" title="Rotation" value={transform.rotation} onChange={value => handlePropertyChange('rotation', value)} />
                                )}
                                {transform.scaleX !== undefined && (
                                    <Input type="number" title="Scale X" value={transform.scaleX} onChange={value => handlePropertyChange('scaleX', value)} />
                                )}
                                {transform.scaleY !== undefined && (
                                    <Input type="number" title="Scale Y" value={transform.scaleY} onChange={value => handlePropertyChange('scaleY', value)} />
                                )}
                                {transform.anchorPoint && (
                                    <>
                                        <Input type="number" title="Anchor X" value={transform.anchorPoint.x} onChange={value => handlePropertyChange('anchorPoint_x', value)} />
                                        <Input type="number" title="Anchor Y" value={transform.anchorPoint.y} onChange={value => handlePropertyChange('anchorPoint_y', value)} />
                                    </>
                                )}
                            </GRID2X2>
                        )}

                        {/* STROKE - Width, LineCap, LineJoin, DashArray */}
                        {style && style.stroke && (
                            <Section title="Stroke Properties">
                                <div className="space-y-3">
                                    <Input type="number" title="Width" value={style.stroke.width ?? 1} onChange={value => handlePropertyChange('stroke_width', value)} />
                                    {style.stroke.lineCap && (
                                        <div>
                                            <label className="text-xs text-gray-600">Line Cap</label>
                                            <DropDownPicker 
                                                value={{ value: style.stroke.lineCap, label: style.stroke.lineCap }}
                                                values={[
                                                    { value: 'butt', label: 'Butt' },
                                                    { value: 'round', label: 'Round' },
                                                    { value: 'square', label: 'Square' }
                                                ]}
                                                onValueChange={(value: string) => handlePropertyChange('stroke_lineCap', value)}
                                            />
                                        </div>
                                    )}
                                    {style.stroke.lineJoin && (
                                        <div>
                                            <label className="text-xs text-gray-600">Line Join</label>
                                            <DropDownPicker 
                                                value={{ value: style.stroke.lineJoin, label: style.stroke.lineJoin }}
                                                values={[
                                                    { value: 'miter', label: 'Miter' },
                                                    { value: 'round', label: 'Round' },
                                                    { value: 'bevel', label: 'Bevel' }
                                                ]}
                                                onValueChange={(value: string) => handlePropertyChange('stroke_lineJoin', value)}
                                            />
                                        </div>
                                    )}
                                    {style.stroke.dashArray && (
                                        <div>
                                            <label className="text-xs text-gray-600">Dash Pattern</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g., 5,5 or 10,5,2,5"
                                                defaultValue={style.stroke.dashArray.join(',')} 
                                                className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white"
                                                onChange={(e) => {
                                                    const dashes = e.currentTarget.value.split(',').map(v => parseFloat(v.trim())).filter((v: number) => !isNaN(v))
                                                    handlePropertyChange('stroke_dashArray', dashes)
                                                }} 
                                            />
                                        </div>
                                    )}
                                </div>
                            </Section>
                        )}

                        {/* TEXT STYLE - Font, Color, Size, Alignment, etc. */}
                        {textStyle && (
                            <Section title="Text Style">
                                <div className="space-y-3">
                                    {textStyle.textFill && (
                                        <ColorInput fill={textStyle.textFill} onChange={fill => handlePropertyChange('text_textFill', fill)} />
                                    )}
                                    {textStyle.textStroke && (
                                        <ColorInput fill={{ color: textStyle.textStroke.color, opacity: textStyle.textStroke.opacity } as ColorProps} onChange={stroke => handlePropertyChange('text_textStroke', stroke)} />
                                    )}
                                    {textStyle.fontSize && (
                                        <Input type="number" title="Font Size" value={textStyle.fontSize} onChange={value => handlePropertyChange('text_fontSize', value)} />
                                    )}
                                    {textStyle.fontWeight && (
                                        <Input type="number" title="Font Weight" value={textStyle.fontWeight} onChange={value => handlePropertyChange('text_fontWeight', value)} />
                                    )}
                                    {textStyle.lineHeight && (
                                        <Input type="number" title="Line Height" value={textStyle.lineHeight} onChange={value => handlePropertyChange('text_lineHeight', value)} />
                                    )}
                                    {textStyle.textAlign && (
                                        <div>
                                            <label className="text-xs text-gray-600">Text Align</label>
                                            <DropDownPicker 
                                                value={{ value: textStyle.textAlign, label: textStyle.textAlign }}
                                                values={[
                                                    { value: 'left', label: 'Left' },
                                                    { value: 'center', label: 'Center' },
                                                    { value: 'right', label: 'Right' },
                                                    { value: 'justify', label: 'Justify' }
                                                ]}
                                                onValueChange={(value: string) => handlePropertyChange('text_textAlign', value)}
                                            />
                                        </div>
                                    )}
                                    {textStyle.fontFamilies && textStyle.fontFamilies.length > 0 && (
                                        <div>
                                            <label className="text-xs text-gray-600">Font Family</label>
                                            <DropDownPicker 
                                                value={{ value: textStyle.fontFamilies[0] || 'Arial', label: textStyle.fontFamilies[0] || 'Arial' }}
                                                values={textStyle.fontFamilies.map((font: string) => ({ value: font, label: font }))}
                                                onValueChange={(value: string) => handlePropertyChange('text_fontFamilies', [value])}
                                            />
                                        </div>
                                    )}
                                    {textStyle.backgroundColor && (
                                        <ColorInput fill={textStyle.backgroundColor} onChange={fill => handlePropertyChange('text_backgroundColor', fill)} />
                                    )}
                                    {textStyle.backgroundStroke && (
                                        <ColorInput fill={{ color: textStyle.backgroundStroke.color, opacity: textStyle.backgroundStroke.opacity } as ColorProps} onChange={stroke => handlePropertyChange('text_backgroundStroke', stroke)} />
                                    )}
                                </div>
                            </Section>
                        )}

                        {/* LAYOUT - Flex Direction, Wrap, Gap, Padding, Alignment, Grid properties */}
                        {layoutConstraints && (
                            <Section title="Layout">
                                {(() => {
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const lc = layoutConstraints as any;
                                    return (
                                    <div className="space-y-3">
                                        {lc.type === 'row' || lc.type === 'column' ? (
                                            <>
                                                {lc.flexDirection && (
                                                    <div>
                                                        <label className="text-xs text-gray-600">Direction</label>
                                                        <DropDownPicker 
                                                            value={{ value: lc.flexDirection, label: lc.flexDirection }}
                                                            values={[
                                                                { value: 'row', label: 'Row' },
                                                                { value: 'column', label: 'Column' }
                                                            ]}
                                                            onValueChange={(value: string) => handlePropertyChange('layout_flexDirection', value)}
                                                        />
                                                    </div>
                                                )}
                                                {lc.flexWrap && (
                                                    <div>
                                                        <label className="text-xs text-gray-600">Wrap</label>
                                                        <DropDownPicker 
                                                            value={{ value: lc.flexWrap, label: lc.flexWrap }}
                                                            values={[
                                                                { value: 'nowrap', label: 'No Wrap' },
                                                                { value: 'wrap', label: 'Wrap' }
                                                            ]}
                                                            onValueChange={(value: string) => handlePropertyChange('layout_flexWrap', value)}
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        ) : null}
                                        {lc.gap !== undefined && (
                                            <Input type="number" title="Gap" value={lc.gap} onChange={value => handlePropertyChange('layout_gap', value)} />
                                        )}
                                        {lc.padding !== undefined && (
                                            typeof lc.padding === 'number' ? (
                                                <Input type="number" title="Padding" value={lc.padding} onChange={value => handlePropertyChange('layout_padding', value)} />
                                            ) : (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Input type="number" title="Pad Top" value={lc.padding?.top ?? 0} onChange={value => handlePropertyChange('layout_padding_top', value)} />
                                                    <Input type="number" title="Pad Right" value={lc.padding?.right ?? 0} onChange={value => handlePropertyChange('layout_padding_right', value)} />
                                                    <Input type="number" title="Pad Bottom" value={lc.padding?.bottom ?? 0} onChange={value => handlePropertyChange('layout_padding_bottom', value)} />
                                                    <Input type="number" title="Pad Left" value={lc.padding?.left ?? 0} onChange={value => handlePropertyChange('layout_padding_left', value)} />
                                                </div>
                                            )
                                        )}
                                        {lc.mainAlign && (
                                            <div>
                                                <label className="text-xs text-gray-600">Main Align</label>
                                                <DropDownPicker 
                                                    value={{ value: lc.mainAlign, label: lc.mainAlign }}
                                                    values={[
                                                        { value: 'start', label: 'Start' },
                                                        { value: 'center', label: 'Center' },
                                                        { value: 'end', label: 'End' },
                                                        { value: 'space-between', label: 'Space Between' }
                                                    ]}
                                                    onValueChange={(value: string) => handlePropertyChange('layout_mainAlign', value)}
                                                />
                                            </div>
                                        )}
                                        {lc.crossAlign && (
                                            <div>
                                                <label className="text-xs text-gray-600">Cross Align</label>
                                                <DropDownPicker 
                                                    value={{ value: lc.crossAlign, label: lc.crossAlign }}
                                                    values={[
                                                        { value: 'start', label: 'Start' },
                                                        { value: 'center', label: 'Center' },
                                                        { value: 'end', label: 'End' }
                                                    ]}
                                                    onValueChange={(value: string) => handlePropertyChange('layout_crossAlign', value)}
                                                />
                                            </div>
                                        )}
                                        {lc.type === 'grid' && (
                                            <>
                                                {lc.gridRowGap !== undefined && (
                                                    <Input type="number" title="Row Gap" value={lc.gridRowGap} onChange={value => handlePropertyChange('layout_gridRowGap', value)} />
                                                )}
                                                {lc.gridColumnGap !== undefined && (
                                                    <Input type="number" title="Column Gap" value={lc.gridColumnGap} onChange={value => handlePropertyChange('layout_gridColumnGap', value)} />
                                                )}
                                                {lc.gridAutoFlow && (
                                                    <div>
                                                        <label className="text-xs text-gray-600">Auto Flow</label>
                                                        <DropDownPicker 
                                                            value={{ value: lc.gridAutoFlow, label: lc.gridAutoFlow }}
                                                            values={[
                                                                { value: 'row', label: 'Row' },
                                                                { value: 'column', label: 'Column' }
                                                            ]}
                                                            onValueChange={(value: string) => handlePropertyChange('layout_gridAutoFlow', value)}
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    );
                                })()}
                            </Section>
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

