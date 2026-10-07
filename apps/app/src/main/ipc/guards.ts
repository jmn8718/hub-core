import { existsSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";

export function isExternalHttpUrl(value: string) {
	try {
		const url = new URL(value);
		return url.protocol === "https:" || url.protocol === "http:";
	} catch {
		return false;
	}
}

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9 ._-]*$/;

/** A single path segment: no separators, no traversal, no leading dot. */
export function assertSafeSegment(value: string, label: string) {
	if (!SAFE_SEGMENT.test(value) || value.includes("..")) {
		throw new Error(`Invalid ${label}`);
	}
	return value;
}

function isInside(target: string, root: string) {
	return target === root || target.startsWith(root + sep);
}

/**
 * Resolves `candidate` to the real location it would be created at and
 * checks that it stays inside `root`. Symbolic links are followed for every
 * existing ancestor, so a link inside the folder cannot redirect a write
 * elsewhere; only the not-yet-existing tail is appended lexically.
 */
export function assertInsideFolder(
	candidate: string,
	root: string,
	label: string,
) {
	const realRoot = realpathSync(resolve(root));
	const resolved = resolve(candidate);

	let existing = resolved;
	const missing: string[] = [];
	while (!existsSync(existing)) {
		missing.unshift(basename(existing));
		const parent = dirname(existing);
		if (parent === existing) break;
		existing = parent;
	}
	const realTarget = join(realpathSync(existing), ...missing);

	if (!isInside(resolved, realRoot) && !isInside(resolved, resolve(root))) {
		throw new Error(`${label} must be inside the configured folder`);
	}
	if (!isInside(realTarget, realRoot)) {
		throw new Error(`${label} must be inside the configured folder`);
	}
	return realTarget;
}
