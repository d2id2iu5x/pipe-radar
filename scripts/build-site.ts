import { resolve } from "node:path";
import { buildStaticSite } from "../src/build/static-site.js";

await buildStaticSite({
  outputDirectory: resolve("dist"),
  files: [
    { source: resolve("index.html"), target: "index.html" },
    { source: resolve("assets/i18n.js"), target: "assets/i18n.js" },
    { source: resolve("data/jobs.json"), target: "data/jobs.json" }
  ]
});
