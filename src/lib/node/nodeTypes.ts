export interface BaseLayout {
    type: ContainerType
    padding?: {
        top: number
        bottom: number
        left: number
        right: number
    }
}

export interface FlexLayout extends BaseLayout {
    type: 'row' | 'column'
    gap?: number
    mainAlign?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'
    crossAlign?: 'start' | 'center' | 'end' | 'stretch'
    flexWrap?: 'nowrap' | 'wrap'
}

export interface GridLayout extends BaseLayout {
    type: 'grid'
    gridTemplateColumns?: number[] | 'auto' | 'repeat' | string
    gridTemplateRows?: number[] | 'auto' | 'repeat' | string
    gridAutoFlow?: 'row' | 'column'
    gridRowGap?: number
    gridColumnGap?: number
}
export type ContainerType = 'row' | 'column' | 'grid' | 'frame' | 'none'

export interface FrameLayout extends BaseLayout {
    type: 'frame' | 'none'
}

// Unified type
export type LayoutConstraints = FlexLayout | GridLayout | FrameLayout
