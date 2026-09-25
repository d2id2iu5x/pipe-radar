import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildStaticSite } from "../../src/build/static-site.js";

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true }))));

describe("Cloudflare static build", () => {
  it("publishes only the browser assets and job snapshot", async () => {
    const source = await mkdtemp(join(tmpdir(), "pipe-radar-source-"));
    const output = await mkdtemp(join(tmpdir(), "pipe-radar-output-"));
    directories.push(source, output);
    await writeFile(join(source, "index.html"), "<h1>PIPE RADAR</h1>");
    await writeFile(join(source, "secret.txt"), "private");
    await writeFile(join(source, "jobs.json"), "{}");
    await writeFile(join(source, "i18n.js"), "export {};");

    await buildStaticSite({
      outputDirectory: output,
      files: [
        { source: join(source, "index.html"), target: "index.html" },
        { source: join(source, "jobs.json"), target: "data/jobs.json" },
        { source: join(source, "i18n.js"), target: "assets/i18n.js" }
      ]
    });

    expect(await readFile(join(output, "index.html"), "utf8")).toContain("PIPE RADAR");
    expect(await readFile(join(output, "data/jobs.json"), "utf8")).toBe("{}");
    await expect(access(join(output, "secret.txt"))).rejects.toThrow();
  });
});
