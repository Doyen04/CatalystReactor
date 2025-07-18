import { useCallback, useRef } from 'react'

interface UseFilePickerOptions {
    accept?: string
    multiple?: boolean
    onFileSelect: (files: FileList | null) => void
}

export const useFilePicker = ({ accept = 'image/*', multiple = false, onFileSelect }: UseFilePickerOptions) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const openFilePicker = useCallback(() => {
        if (!fileInputRef.current) {
            // Create file input element
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = accept
            input.multiple = multiple
            input.style.display = 'none'

            input.onchange = (event) => {
                const target = event.target as HTMLInputElement
                
                onFileSelect(target.files)

                document.body.removeChild(input)
                fileInputRef.current = null
            }

            input.oncancel = () => {
                // Clean up if user cancels
                document.body.removeChild(input)
                fileInputRef.current = null
            }

            document.body.appendChild(input)
            fileInputRef.current = input
        }

        fileInputRef.current.click()// opens file picker
    }, [accept, multiple, onFileSelect])

    return { openFilePicker }
}