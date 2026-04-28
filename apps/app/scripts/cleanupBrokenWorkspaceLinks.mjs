import { lstat, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "../../..");

const workspaceDirs = [
  path.join(workspaceRoot, "apps"),
  path.join(workspaceRoot, "packages"),
];

const sharedNodeModulesDirs = [
  path.join(workspaceRoot, "node_modules"),
  path.join(workspaceRoot, "node_modules", ".pnpm", "node_modules"),
];

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function removeBrokenSymlink(targetPath) {
  const entry = await lstat(targetPath);

  if (!entry.isSymbolicLink()) {
    return false;
  }

  try {
    await stat(targetPath);
    return false;
  } catch {
    await rm(targetPath, { force: true });
    return true;
  }
}

async function collectWorkspacePackageDirs() {
  const packageDirs = [];

  for (const parentDir of workspaceDirs) {
    if (!(await pathExists(parentDir))) {
      continue;
    }

    const entries = await readdir(parentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      packageDirs.push(path.join(parentDir, entry.name));
    }
  }

  return packageDirs;
}

async function cleanupNodeModulesDir(nodeModulesDir) {
  if (!(await pathExists(nodeModulesDir))) {
    return [];
  }

  const removed = [];
  const entries = await readdir(nodeModulesDir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(nodeModulesDir, entry.name);

    if (entry.isSymbolicLink()) {
      if (await removeBrokenSymlink(entryPath)) {
        removed.push(entryPath);
      }

      continue;
    }

    if (!entry.isDirectory() || !entry.name.startsWith("@")) {
      continue;
    }

    const scopedEntries = await readdir(entryPath, { withFileTypes: true });

    for (const scopedEntry of scopedEntries) {
      if (!scopedEntry.isSymbolicLink()) {
        continue;
      }

      const scopedEntryPath = path.join(entryPath, scopedEntry.name);

      if (await removeBrokenSymlink(scopedEntryPath)) {
        removed.push(scopedEntryPath);
      }
    }
  }

  return removed;
}

const packageDirs = await collectWorkspacePackageDirs();
const nodeModulesDirs = [
  ...sharedNodeModulesDirs,
  ...packageDirs.map((packageDir) => path.join(packageDir, "node_modules")),
];
const removedLinks = [];

for (const nodeModulesDir of nodeModulesDirs) {
  removedLinks.push(...(await cleanupNodeModulesDir(nodeModulesDir)));
}

if (removedLinks.length > 0) {
  console.log("Removed broken workspace node_modules symlinks:");

  for (const removedLink of removedLinks) {
    console.log(`- ${path.relative(workspaceRoot, removedLink)}`);
  }
}
