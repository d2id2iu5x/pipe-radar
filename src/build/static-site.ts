import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface StaticFile {
  source: string;
  target: string;
}

export function pipeRadarStaticFiles(root: string): StaticFile[] {
  return [
    { source: join(root, "index.html"), target: "index.html" },
    { source: join(root, "assets/i18n.js"), target: "assets/i18n.js" },
    { source: join(root, "data/jobs.json"), target: "data/jobs.json" },
    { source: join(root, "src/client/remote-data.js"), target: "src/client/remote-data.js" },
    { source: join(root, "src/client/status-view.js"), target: "src/client/status-view.js" }
  ];
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
