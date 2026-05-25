import { Unlock, Lock } from 'lucide-react'
import { twMerge } from 'tailwind-merge'



const LockButton = ({ locked, onClick }: { locked: boolean, onClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void}) => (
    <button onClick={e => onClick(e)} className={twMerge(`col-span-1 w-6 h-6 bg-white rounded flex items-center justify-center`)}>
        {locked ? <Lock size={12} /> : <Unlock size={12} />}
    </button>
)

export default LockButton
