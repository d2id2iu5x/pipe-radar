import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';

function boot() {
  const html=readFileSync('index.html','utf8');
  document.documentElement.innerHTML=html;
  const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
  window.eval(code);
  return (window as any);
}
describe('V2 independent audit regression',()=>{
  beforeEach(()=>localStorage.clear());
  it.each(['-300 NOK/h','1 300 NOK/h','1.300,00 NOK/h'])('never guarantees a misleading amount %s',raw=>{
    const w=boot(); expect(w.parseRate(raw).guaranteed).toBeNull();
  });
  it.each([
    ['min. 300 NOK/h','minimum',300],
    ['MIN. 300 NOK/h','minimum',300],
    ['minimum 300 NOK/h','minimum',300],
    ['ok. 300 NOK/h','approximate',null],
    ['OK. 300 NOK/h','approximate',null],
  ])('preserves supported rate prefix %s and its filter meaning', (raw,kind,guaranteed)=>{
    const w=boot();const rate=w.parseRate(raw);
    expect(rate.kind).toBe(kind);expect(rate.min).toBe(300);expect(rate.guaranteed).toBe(guaranteed);
    expect(w.rateMeets({rate:raw},300)).toBe(guaranteed===300);
    expect(w.rateMeets({rate:raw},301)).toBe(false);
  });
  it.each([['14/14',50],['3/3',50],['4/4',50],['14/21',60],['6/2',25]])('computes free fraction %s independently', (raw,expected)=>{
    const w=boot();expect(w.rotationFreeShare(raw)).toBe(expected);
  });
  it.each(['Nie podano','14 dni / 2 tygodnie','3/1 lub 2/3'])('leaves ambiguous rotation unresolved %s',raw=>{
    const w=boot();expect(w.rotationFreeShare(raw)).toBeNull();
  });
  it('keeps the latest successful remote jobs after a failed refresh',()=>{
    const w=boot(); const raw={id:'synthetic-1',title:'SYNTHETIC',company:'Test',country:'Norwegia',location:'Test',url:'https://example.test/job',sources:[],rotation:{raw:'3/3'},lastVerifiedAt:'2026-10-11T12:00:00Z',status:'uncertain',sourceKind:'employer'};
    w.PIPE_RADAR_APP.applyRemote({mode:'partial',jobs:[raw]});
    w.PIPE_RADAR_APP.applyRemote({mode:'local',jobs:[]});
    expect(document.querySelector('[data-job-id="synthetic-1"]')).not.toBeNull();
    expect(w.needsReview(w.toLegacyRemoteJob(raw))).toBe(true);
  });
  it('filters only confirmed rotations and preserves a saved synthetic record through reopen and refresh',async()=>{
    Object.defineProperty(navigator,'locks',{configurable:true,value:{request:async(_name:any,_options:any,callback:any)=>callback()}});
    const w=boot();const base={id:'synthetic-save',title:'SYNTHETIC SAVE',company:'Test',country:'Norwegia',location:'Test',url:'https://example.test/save',rotation:{raw:'14/21'},lastVerifiedAt:'2026-10-11T12:00:00Z',sourceKind:'employer'};
    w.PIPE_RADAR_APP.applyRemote({mode:'partial',jobs:[base,{...base,id:'synthetic-no',rotation:{raw:'6/2'}},{...base,id:'synthetic-unknown',rotation:{raw:'Nie podano'}}]});
    w.toggleSaved('synthetic-save');await w.saveEntries();
    const saved=localStorage.getItem('pipe-radar-saved-v2');expect(saved).toContain('synthetic-save');
    (document.getElementById('rotationFilter') as HTMLSelectElement).value='free50';w.render();
    expect(document.querySelectorAll('#grid [data-job-id]').length).toBe(1);
    const w2=boot();w2.PIPE_RADAR_APP.applyRemote({mode:'partial',jobs:[base]});
    expect(w2.isSaved('synthetic-save')).toBe(true);expect(localStorage.getItem('pipe-radar-saved-v2')).toBe(saved);
    w2.PIPE_RADAR_APP.applyRemote({mode:'partial',jobs:[]});
    expect(localStorage.getItem('pipe-radar-saved-v2')).toBe(saved);
  });
  it('separates NOK hourly rates from monthly, annual and other currencies',()=>{
    const w=boot();for(const raw of ['300 EUR/h','300 NOK/month','300 NOK/year','Nie podano'])expect(w.parseRate(raw).guaranteed).toBeNull();
    expect(w.parseRate('300 NOK/h brutto').guaranteed).toBe(300);expect(w.parseRate('280–300 NOK/h').guaranteed).toBe(280);
    const r=w.calculateValues([300,40,2,2,100,5,1000,2000]);
    expect(r.gross).toBe(24000);expect(r.packageValue).toBe(5000);expect(r.annual).toBe(377000);expect(r.share).toBe(50);
  });
  it('retains gross/net wording and declares the comparison boundary in both languages',()=>{
    const w=boot();expect(w.parseRate('300 NOK/h netto').raw).toBe('300 NOK/h netto');expect(w.parseRate('300 NOK/h brutto').raw).toBe('300 NOK/h brutto');
    expect(document.getElementById('comparisonRateBasis')?.textContent).toContain('nie przelicza podatków');
    window.eval(readFileSync('assets/i18n.js','utf8'));document.dispatchEvent(new Event('DOMContentLoaded'));w.PIPE_RADAR_LANGUAGE.set('en');
    expect(document.getElementById('comparisonRateBasis')?.textContent).toContain('Gross, net and unspecified pay bases are not equivalent');w.PIPE_RADAR_LANGUAGE.set('pl');
  });
  it('keeps technical rotation values while switching PL and EN',()=>{
    boot();window.eval(readFileSync('assets/i18n.js','utf8'));document.dispatchEvent(new Event('DOMContentLoaded'));
    (window as any).PIPE_RADAR_LANGUAGE.set('en');
    expect(document.querySelector('option[value="free50"]')?.textContent).toContain('At least 50%');
    expect((document.querySelector('option[value="free50"]') as HTMLOptionElement).value).toBe('free50');
    expect(localStorage.getItem('pipe-radar-language-v1')).toBe('en');
    (window as any).PIPE_RADAR_LANGUAGE.set('pl');expect(document.querySelector('option[value="free50"]')?.textContent).toContain('Minimum 50%');
  });
  it('translates saved-offer controls while preserving storage status codes and user text',()=>{
    localStorage.setItem('pipe-radar-saved-v2',JSON.stringify({'synthetic-labels':{status:'Obserwuję',note:'Notatka użytkownika TEST',followUp:''}}));
    const w=boot();w.PIPE_RADAR_APP.applyRemote({mode:'partial',jobs:[{id:'synthetic-labels',title:'SYNTHETIC',company:'TEST',country:'Norwegia',location:'TEST',url:'https://example.test/labels',lastVerifiedAt:'2026-10-11T12:00:00Z'}]});
    window.eval(readFileSync('assets/i18n.js','utf8'));document.dispatchEvent(new Event('DOMContentLoaded'));w.PIPE_RADAR_LANGUAGE.set('en');
    const select=document.querySelector('[data-saved-field="status"]') as HTMLSelectElement;
    expect(select.value).toBe('Obserwuję');expect(select.selectedOptions[0]?.textContent).toBe('Watching');
    expect(document.getElementById('storageStatus')?.textContent).toContain('Data is saved');
    expect(document.querySelector('[data-saved-field="note"]')?.getAttribute('aria-label')).toBe('Note TEST');
    expect((document.querySelector('[data-saved-field="note"]') as HTMLTextAreaElement).value).toBe('Notatka użytkownika TEST');
    expect(document.querySelector('#savedList')?.textContent).toContain('Compare / remove from comparison');
    w.PIPE_RADAR_LANGUAGE.set('pl');expect(select.value).toBe('Obserwuję');
  });
});
