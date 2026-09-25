import { resolve } from "node:path";
import { buildStaticSite, pipeRadarStaticFiles } from "../src/build/static-site.js";

await buildStaticSite({
  outputDirectory: resolve("dist"),
  files: pipeRadarStaticFiles(resolve("."))
});
