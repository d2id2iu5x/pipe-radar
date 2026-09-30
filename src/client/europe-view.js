import { EUROPE_COUNTRIES, europeanSearchLinks, countryFor } from '../domain/europe.js';

/** Extend the existing filter, preserving its Polish values and all saved state. */
export function mountEuropeView(doc = document) {
  const select = doc.getElementById('country');
  if (!select || doc.getElementById('europePanel')) return;
  const panel = doc.createElement('section');
  panel.id = 'europePanel'; panel.className = 'hero'; panel.style.marginTop = '14px';
  panel.setAttribute('aria-labelledby','europeTitle');
  panel.innerHTML = '<div class="brand" id="europeTitle"></div><p id="europeExplanation"></p><div class="action-row"><a id="europeWeb" class="primary jump-link" target="_blank" rel="noopener noreferrer"></a><a id="europeEures" class="secondary jump-link" target="_blank" rel="noopener noreferrer"></a></div><p id="europeCoverage" class="note"></p><p id="europeMoney" class="note"></p>';
  const hero = select.closest('.hero');
  if (hero) hero.after(panel); else select.after(panel);
  const byId = id => doc.getElementById(id);
  function renderPanel() {
    if (!panel.isConnected || !select.isConnected) return;
    const en = doc.documentElement.lang === 'en';
    const previous = select.value;
    select.replaceChildren();
    const option = (value, label) => { const el=doc.createElement('option');el.value=value;el.textContent=label;select.append(el); };
    option('', en ? 'All Europe' : 'Cała Europa');
    const sorted = [...EUROPE_COUNTRIES].sort((a,b) => (en?a.en:a.pl).localeCompare(en?b.en:b.pl,en?'en':'pl'));
    for (const c of sorted) option(c.pl, en?c.en:c.pl);
    option('Nie podano', en ? 'Country not specified' : 'Kraj nieustalony');
    // Existing country choices stay intact when language or the scope changes.
    if (previous && ![...select.options].some(o => o.value === previous)) option(previous,previous);
    select.value = previous;
    const c = countryFor(previous);
    const name = c ? en?c.en:c.pl : en?'Europe':'Europie';
    const phrase = byId('q')?.value || '';
    const links = europeanSearchLinks(previous, phrase, en?'en':'pl');
    byId('europeTitle').textContent = en ? 'EUROPE · JOB SEARCH' : 'EUROPA · SZUKAJ PRACY';
    byId('europeExplanation').textContent = en ? 'The filters search our saved database. The links below open a separate search on external websites — including countries without imported jobs.' : 'Filtry przeszukują naszą zapisaną bazę. Poniższe linki otwierają osobne wyszukiwanie w zewnętrznych serwisach — także dla krajów bez pobranych ofert.';
    byId('europeWeb').textContent = en ? 'Search the web — '+name+' ↗' : 'Szukaj w internecie — '+(c?c.pl:'Europa')+' ↗';
    byId('europeWeb').href = links.web;
    byId('europeEures').textContent = en ? 'EURES — select country ↗' : 'EURES — wybierz kraj ↗';
    byId('europeEures').href = links.eures;
    byId('europeCoverage').textContent = en ? 'Automatic imports: configured Norwegian sources, JobTech Sweden, Bilfinger and Silverhand career pages. Coverage is partial and depends on source availability. EURES and web searches are external links, not automatic imports. No results in the database does not mean there is no work in that country.' : 'Import automatyczny: skonfigurowane źródła norweskie, JobTech ze Szwecji oraz strony Bilfinger i Silverhand. Pokrycie jest częściowe i zależy od dostępności źródeł. EURES i wyszukiwarka to odnośniki zewnętrzne, nie import automatyczny. Brak wyników w bazie nie oznacza braku pracy w kraju.';
    byId('europeMoney').textContent = en ? 'Rates retain their source currency and period. The 300+ NOK filter and rotation calculator are still explicitly in NOK; EUR, GBP and CHF are not compared as if they were NOK. Check work and travel requirements at the source.' : 'Stawki zachowują walutę i okres ze źródła. Filtr 300+ NOK oraz kalkulator rotacji nadal dotyczą wyłącznie NOK — EUR, GBP i CHF nie są traktowane jak korony. Warunki podjęcia pracy i wyjazdu sprawdź u źródła.';
    const brand = doc.querySelector('.top .brand');
    if (brand) brand.textContent = en ? 'PIPE RADAR / v2.4.1 · EUROPE' : 'PIPE RADAR / v2.4.1 · EUROPA';
    for (const el of doc.querySelectorAll('small')) {
      if (/^(Priorytet: Norwegia|Priority: Norway|Zasięg: Europa|Scope: Europe)/.test(el.textContent.trim())) el.textContent = en ? 'Scope: Europe · industrial piping · isometrics · rotation · accommodation' : 'Zasięg: Europa · rurociągi przemysłowe · izometria · rotacja · zakwaterowanie';
    }
  }
  select.addEventListener('change',renderPanel);
  byId('q')?.addEventListener('input',renderPanel);
  for (const button of doc.querySelectorAll('[data-language]')) button.addEventListener('click',renderPanel);
  // RESET/quick filters update controls programmatically without a change event.
  doc.addEventListener('click',event => { if (event.target?.closest?.('button')) queueMicrotask(renderPanel); });
  doc.addEventListener('DOMContentLoaded',renderPanel,{once:true});
  renderPanel();
}
if (typeof document !== 'undefined') mountEuropeView();
