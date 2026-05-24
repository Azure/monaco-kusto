class Emitter<T> {
    private listeners: Array<(e: T) => void> = [];
    event = (listener: (e: T) => void) => {
        this.listeners.push(listener);
        return {
            dispose: () => {
                this.listeners = this.listeners.filter((l) => l !== listener);
            },
        };
    };
    fire(value: T) {
        for (const l of this.listeners.slice()) l(value);
    }
    dispose() {
        this.listeners = [];
    }
}

const monaco = {
    editor: {
        createModel: jest.fn(),
    },
    Emitter,
    languages: {},
};

module.exports = monaco;
