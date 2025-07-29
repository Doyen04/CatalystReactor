

function debounce<T extends (...args: unknown[]) => void>(fn: T, delay = 200) {
    let timerId: ReturnType<typeof setTimeout>;

    return (...args: Parameters<T>) => {
        clearTimeout(timerId);
        timerId = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
}

export default debounce