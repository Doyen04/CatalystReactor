import React, { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

interface SectionProps {
    title: string
    children: ReactNode
    childClass?: string
}

export const GRID2X2: React.FC<SectionProps> = ({ title, children, childClass }) => (
    <section className="w-full p-0">
        <div className="section-title">{title}</div>
        <div className={twMerge(`grid grid-cols-2 gap-2 text-sm ${childClass}`)}>{children}</div>
    </section>
)
export const Section: React.FC<SectionProps> = ({ title, children, childClass }) => (
    <section className="w-full p-0">
        <div className="section-title">{title}</div>
        <div className={twMerge(`flex flex-1 gap-2 text-sm ${childClass}`)}>{children}</div>
    </section>
)


