// Best-effort, per-instance locks for actions that run full provider syncs
// or regenerate every activity. A second call while one is running fails
// fast instead of doubling the provider API load.
const running = new Set<string>();

export async function runExclusiveAction<T>(
	key: string,
	task: () => Promise<T>,
): Promise<T> {
	if (running.has(key)) {
		throw new Error(`${key} is already running; try again when it finishes`);
	}
	running.add(key);
	try {
		return await task();
	} finally {
		running.delete(key);
	}
}
