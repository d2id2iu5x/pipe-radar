import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect,it } from 'vitest';
import { buildStaticSite } from '../../src/build/static-site.js';
it('does not label every public European feed as NAV in the deployed UI',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'source-label-'));
 try {
  const source=join(dir,'input.html');await writeFile(source,"<body><script>const ORIGINS={nav:'NAV — źródło pierwotne'};</script></body>");
  await buildStaticSite({outputDirectory:join(dir,'out'),files:[{source,target:'index.html'}]});
  const html=await readFile(join(dir,'out/index.html'),'utf8');expect(html).toContain("nav:'Publiczne źródło ofert'");expect(html).not.toContain('NAV — źródło pierwotne');
 } finally {await rm(dir,{recursive:true,force:true});}
});
