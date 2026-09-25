import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { LifecycleState } from "../domain/lifecycle.js";
import type { Snapshot } from "../domain/types.js";
import { toPublicSnapshot, validateSnapshot } from "../domain/validate.js";
import type { ScanLock, SnapshotStore } from "./blob-store.js";

interface PersistedFileState {
  snapshot: Snapshot;
  previous: Snapshot | null;
  lifecycle: LifecycleState;
  report: unknown;
}

export interface FileStorePaths {
  statePath: string;
  publicPath: string;
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeJsonAtomically(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

export function createFileSnapshotStore(paths: FileStorePaths): SnapshotStore {
  let locked = false;
  const state = () => readJson<PersistedFileState>(paths.statePath);
  return {
    async getLatest() {
      const current = await state();
      if (current?.snapshot) return validateSnapshot(current.snapshot);
      const published = await readJson<Snapshot>(paths.publicPath);
      return published ? validateSnapshot(published) : null;
    },
    async getPrevious() {
      const previous = (await state())?.previous;
      return previous ? validateSnapshot(previous) : null;
    },
    async getLifecycle() {
      return (await state())?.lifecycle ?? { jobs: {}, audit: {} };
    },
    async publish(snapshot, lifecycle, report = {}) {
      const candidate = validateSnapshot(snapshot);
      const current = await state();
      await writeJsonAtomically(paths.statePath, {
        snapshot: candidate,
        previous: current?.snapshot ?? null,
        lifecycle,
        report
      } satisfies PersistedFileState);
      await writeJsonAtomically(paths.publicPath, toPublicSnapshot(candidate));
    },
    async acquireLock(): Promise<ScanLock | null> {
      if (locked) return null;
      locked = true;
      let released = false;
      return {
        owner: "file-scan",
        async release() {
          if (released) return;
          released = true;
          locked = false;
        }
      };
    }
  };
}
