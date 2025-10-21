import { PTextSpan } from "@lib/types/shapes"

class TextEditor {
    private textSpan: PTextSpan

    constructor() {
        this.textSpan = {
            style: {
                textFill: { color: { color: [0, 0, 0, 1], type: 'solid' }, opacity: 1 },
                textAlign: 'left',
                fontSize: 18,
                fontWeight: 500,
                fontFamilies: ['Antonio', 'sans-serif'],
                lineHeight: 1.2,
            },
            start: 0, end: 0,
            text: '',
        }
    }

    setText(text: string) {
        return this.textSpan.text = text
    }

    getText(): string {
        return this.textSpan.text
    }
}

export default TextEditor