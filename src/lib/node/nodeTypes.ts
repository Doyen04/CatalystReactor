export interface LayoutConstraints {
    type: ContainerType
    gap?: number
    padding?: {
        top: number
        bottom: number
        left: number
        right: number
    }
    alignment?: 'start' | 'center' | 'end' | 'stretch'
}

export type ContainerType = 'row' | 'column' | 'grid' | 'frame' | 'none'
