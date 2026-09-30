import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pipeRadarStaticFiles, buildStaticSite } from '../../src/build/static-site.js';
describe('Europe deployment entry point', () => {
  it('ships both modules and attaches the browser extension to the built index', async () => {
    const dir=await mkdtemp(join(tmpdir(),'europe-build-'));
    try {
      const input=join(dir,'source.html'), output=join(dir,'out');
      await writeFile(input,'<body><select id="country"></select></body>');
      await buildStaticSite({outputDirectory:output,files:[{source:input,target:'index.html'}]});
      expect(await readFile(join(output,'index.html'),'utf8')).toContain('type="module" src="./src/client/europe-view.js"');
      expect(pipeRadarStaticFiles(dir).map(f=>f.target)).toEqual(expect.arrayContaining(['src/client/europe-view.js','src/domain/europe.js']));
      expect(await readFile(input,'utf8')).not.toContain('europe-view');
    } finally {await rm(dir,{recursive:true,force:true});}
  });
});
