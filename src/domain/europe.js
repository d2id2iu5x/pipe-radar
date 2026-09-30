/** Shared country/search catalogue. Inclusive geographic scope, not a statement about work permits. */
const rows = [
  ['AL','Albania','Albania','Shqipëria','tubist'],
  ['AD','Andora','Andorra','','tuberías'],
  ['AM','Armenia','Armenia','Հայաստան','pipefitter'],
  ['AT','Austria','Austria','Österreich','Rohrschlosser'],
  ['AZ','Azerbejdżan','Azerbaijan','Azərbaycan','boru montajçısı'],
  ['BE','Belgia','Belgium','Belgique|België|Belgien','pijpfitter|tuyauteur'],
  ['BA','Bośnia i Hercegowina','Bosnia and Herzegovina','Bosna i Hercegovina','monter cjevovoda'],
  ['BG','Bułgaria','Bulgaria','България','монтажник тръбопроводи'],
  ['BY','Białoruś','Belarus','Беларусь|Белоруссия','монтажник трубопроводов'],
  ['CH','Szwajcaria','Switzerland','Schweiz|Suisse|Svizzera','Rohrschlosser'],
  ['CY','Cypr','Cyprus','Κύπρος|Kıbrıs','pipefitter'],
  ['CZ','Czechy','Czechia','Czech Republic|Česko|Česká republika','potrubář'],
  ['DE','Niemcy','Germany','Deutschland','Rohrschlosser|Rohrleitungsbauer'],
  ['DK','Dania','Denmark','Danmark','industrirørmontør'],
  ['EE','Estonia','Estonia','Eesti','torulukksepp'],
  ['ES','Hiszpania','Spain','España','tubero industrial'],
  ['FI','Finlandia','Finland','Suomi','teollisuusputkiasentaja'],
  ['FR','Francja','France','','tuyauteur industriel'],
  ['GB','Wielka Brytania','United Kingdom','UK|Great Britain|Britain|England|Scotland|Wales|Northern Ireland','pipefitter'],
  ['GE','Gruzja','Georgia','საქართველო','pipefitter'],
  ['GR','Grecja','Greece','Ελλάδα|Hellas','σωληνουργός'],
  ['HR','Chorwacja','Croatia','Hrvatska','monter cjevovoda'],
  ['HU','Węgry','Hungary','Magyarország','csőszerelő'],
  ['IE','Irlandia','Ireland','Éire','pipefitter'],
  ['IS','Islandia','Iceland','Ísland','pípulagningamaður'],
  ['IT','Włochy','Italy','Italia','tubista industriale'],
  ['KZ','Kazachstan','Kazakhstan','Қазақстан|Казахстан','монтажник трубопроводов'],
  ['LI','Liechtenstein','Liechtenstein','','Rohrschlosser'],
  ['LT','Litwa','Lithuania','Lietuva','vamzdynų montuotojas'],
  ['LU','Luksemburg','Luxembourg','Luxemburg|Lëtzebuerg','tuyauteur'],
  ['LV','Łotwa','Latvia','Latvija','cauruļvadu montētājs'],
  ['MC','Monako','Monaco','','tuyauteur'],
  ['MD','Mołdawia','Moldova','Republic of Moldova|Republica Moldova','montator conducte'],
  ['ME','Czarnogóra','Montenegro','Crna Gora','monter cjevovoda'],
  ['MK','Macedonia Północna','North Macedonia','Macedonia|Северна Македонија','монтер цевководи'],
  ['MT','Malta','Malta','','pipefitter'],
  ['NL','Holandia','Netherlands','The Netherlands|Nederland|Holland','pijpfitter'],
  ['NO','Norwegia','Norway','Norge|Noreg','industrirørlegger'],
  ['PL','Polska','Poland','','monter rurociągów'],
  ['PT','Portugalia','Portugal','','montador de tubagem'],
  ['RO','Rumunia','Romania','România','lăcătuș conducte'],
  ['RS','Serbia','Serbia','Srbija|Србија','monter cevovoda'],
  ['RU','Rosja','Russia','Russian Federation|Россия','монтажник трубопроводов'],
  ['SE','Szwecja','Sweden','Sverige','industrirörmontör'],
  ['SI','Słowenia','Slovenia','Slovenija','monter cevovodov'],
  ['SK','Słowacja','Slovakia','Slovensko','potrubár'],
  ['SM','San Marino','San Marino','','tubista'],
  ['TR','Turcja','Türkiye','Turkey|Turkiye','boru montajcısı'],
  ['UA','Ukraina','Ukraine','Україна','монтажник трубопроводів'],
  ['VA','Watykan','Vatican City','Holy See|Vatican|Città del Vaticano','tubista'],
  ['XK','Kosowo','Kosovo','Kosova','tubist']
];
export const EUROPE_COUNTRIES = Object.freeze(rows.map(([code, pl, en, aliases, term]) => Object.freeze({ code, pl, en, aliases: Object.freeze(aliases.split('|').filter(Boolean)), term })));
/** @param {unknown} value */
export function foldEuropean(value) { return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ł/g,'l').replace(/ø/g,'o').replace(/đ/g,'d').replace(/ı/g,'i').replace(/\s+/g,' ').trim(); }
const aliases = new Map(EUROPE_COUNTRIES.flatMap(c => [c.code,c.pl,c.en,...c.aliases].map(name => [foldEuropean(name),c])));
/** Country comes from an address field, never inferred from the recruiter's office. @param {unknown} value */
export function countryFor(value) { return aliases.get(foldEuropean(value)) ?? null; }
/** @param {unknown} value */
export function normalizeCountry(value) { return countryFor(value)?.pl ?? (typeof value === 'string' && value.trim() ? value.trim() : 'Nie podano'); }
/** Explicit unknown location may remain in the feed but cannot match a selected country. @param {unknown} value */
export function inEuropeanScope(value) { return Boolean(countryFor(value)) || ['', 'nie podano', 'unknown', 'not specified'].includes(foldEuropean(value)); }
/** Explicit navigation only; this is not an automatic feed or a claim about source coverage. @param {string} country @param {string} phrase @param {string} language */
export function europeanSearchLinks(country = '', phrase = '', language = 'pl') {
  const c = countryFor(country);
  const term = c?.term || 'industrial pipefitter';
  const terms = [...new Set(["pipefitter", ...term.split("|")])].map(t => `"${t}"`).join(" OR ");
  const query = `(${terms}) ${c?.en || 'Europe'} jobs ${phrase.trim().slice(0,200)}`.trim();
  return {
    web: 'https://www.google.com/search?' + new URLSearchParams({q:query}),
    eures: 'https://europa.eu/eures/portal/jv-se/home?' + new URLSearchParams({lang:language === 'en' ? 'en' : 'pl'})
  };
}
