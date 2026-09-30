import { copyFile, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
export interface StaticFile { source: string; target: string; }
export function pipeRadarStaticFiles(root: string): StaticFile[] {
  return [
    { source: join(root, "index.html"), target: "index.html" },
    { source: join(root, "src/domain/europe.js"), target: "src/domain/europe.js" },
    { source: join(root, "src/client/europe-view.js"), target: "src/client/europe-view.js" },
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
    if (file.target === "index.html") {
      let html = await readFile(target, "utf8");
      // The legacy origin key is retained for saved filters, but now includes
      // official sources outside Norway. Do not label JobTech as NAV.
      html = html.replace("nav:'NAV — źródło pierwotne'", "nav:'Publiczne źródło ofert'")
        .replace('NAV lub pracodawca','Urząd pracy lub pracodawca')
        .replace('Źródła pierwotne: pracodawca lub NAV.','Źródła pierwotne: pracodawca lub urząd pracy.');
      if (html.includes('id="country"') && !html.includes('src="./src/client/europe-view.js"')) {
        if (!html.includes("</body>")) throw new Error("Missing HTML entry-point closing body");
        html=html.replace("</body>", '<script type="module" src="./src/client/europe-view.js"></script>\n</body>');
      }
      await writeFile(target,html);
    }
    if (file.target === 'assets/i18n.js') {
      const code=await readFile(target,'utf8');
      await writeFile(target,code.replace('const EN = new Map(Object.entries({','const EN = new Map(Object.entries({\n"Publiczne źródło ofert":"Public job source",\n"Urząd pracy lub pracodawca":"Public employment service or employer",'));
    }
  }
}
