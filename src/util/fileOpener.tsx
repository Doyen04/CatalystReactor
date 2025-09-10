interface FilePickerOptions {
    accept?: string
    multiple?: boolean
    onFileSelect: (files: FileList | null) => void
}

export const FilePicker = ({ accept = 'image/*', multiple = false, onFileSelect }: FilePickerOptions) => {
    return () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = accept
        input.multiple = multiple
        input.style.display = 'none'

        input.onchange = event => {
            const target = event.target as HTMLInputElement
            onFileSelect(target.files)
            document.body.removeChild(input)
        }
        input.oncancel = () => {
            // Clean up if user cancels
            onFileSelect(null)
            document.body.removeChild(input)
        }

        document.body.appendChild(input)

        input.click() // opens file picker
    }
}
