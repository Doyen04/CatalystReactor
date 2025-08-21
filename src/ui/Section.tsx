import React, { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

interface SectionProps {
    title: string
    children: ReactNode
    childClass?: string
}

const Section: React.FC<SectionProps> = ({ title, children, childClass }) => (
    <section className="object-transform">
        <div className="text-left p-0.5 text-black font-medium text-xs">
            {title}
        </div>
        <div
            className={twMerge(
                `flex h-fit w-fit gap-3 text-black text-sm font-mono ${childClass}`
            )}
        >
            {children}
        </div>
    </section>
)

export default Section
