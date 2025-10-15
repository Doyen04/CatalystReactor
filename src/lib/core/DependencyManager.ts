
class Container {
    private readonly services = new Map<string, unknown>();

    register<T>(key: string, instance: T) {
        this.services.set(key, instance);
    }

    resolve<T>(key: string): T {

        if (!this.services.has(key)) {
            console.warn(`Service with key "${key}" not found in the container.`);
            return null;
        }
        return this.services.get(key) as T;
    }
    clear(): void {
        this.services.clear();
    }
}

const container = new Container();

export default container;
