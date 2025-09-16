export interface LayoutConstraints {
    type: ContainerType
    gap?: number
    padding?: number
    alignment?: 'start' | 'center' | 'end' | 'stretch'
}

export type ContainerType = 'row' | 'column' | 'grid' | 'frame'
