import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface StaticFile {
  source: string;
  target: string;
}

export async function buildStaticSite(options: { outputDirectory: string; files: StaticFile[] }): Promise<void> {
  await rm(options.outputDirectory, { recursive: true, force: true });
  await mkdir(options.outputDirectory, { recursive: true });
  for (const file of options.files) {
    const target = join(options.outputDirectory, file.target);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(file.source, target);
  }
}
