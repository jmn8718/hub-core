// Provider imports and cloud sync both write the local database; running them
// at the same time lets rows slip between a table's export and the sync
// watermark. Only one of them may run at a time.
let activeSync: string | null = null;

export async function runExclusiveSync<T>(
	name: string,
	task: () => Promise<T>,
): Promise<T> {
	if (activeSync) {
		throw new Error(`${activeSync} is already running; wait for it to finish`);
	}
	activeSync = name;
	try {
		return await task();
	} finally {
		activeSync = null;
	}
}
