import { getGradientAngle, getGradientPreview } from '@/util/getBackgroundFill'
import { GradientFill } from '@lib/types/shapes'
import { twMerge } from 'tailwind-merge'

interface GradientPreviewProps {
    className?: string
    gradient: GradientFill
}

const GradientPreview: React.FC<GradientPreviewProps> = ({ className, gradient }) => {
    return (
        <div className={twMerge(`relative w-full ${className}`)}>
            <div className="h-16 rounded-lg border border-gray-300 shadow-sm" style={{ background: getGradientPreview(gradient) }} />
            {gradient.type == 'linear' && (
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {Math.round(getGradientAngle(gradient))}°
                </div>
            )}
        </div>
    )
}

export default GradientPreview
