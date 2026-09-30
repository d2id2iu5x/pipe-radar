import { foldEuropean } from "./europe.js";
export const PIPE_TRADE_TERMS = Object.freeze([
  "pipefitter", "pipe fitter", "pipe-fitter", "monter rurociąg", "monter rur", "industrirørlegger", "rørlegger", "piping",
  "rohrschlosser", "rohrleitungsbauer", "rohrvorrichter", "rohrmonteur", "tuyauteur", "tuyauterie", "pijpfitter", "pijpenfitter", "instrumentatie fitter",
  "industrirörmontör", "rörmontör", "industrirørmontør", "rørmontør", "teollisuusputkiasentaja", "putkiasentaja", "tubista", "tubero",
  "montador de tuberías", "montador de tubagem", "potrubář", "potrubár", "lăcătuș", "montator conducte", "csőszerelő",
  "monter cjevovoda", "monter cevovoda", "vamzdynų montuotoj", "cauruļvadu montēt", "torulukksepp", "pípulagningamaður",
  "boru montaj", "монтажник трубопровод", "монтажник тръбопровод", "монтер цевковод", "σωληνουργ", "tubist"
]);
export const INDUSTRIAL_CONTEXT_TERMS = Object.freeze([
  "industrial", "industri", "przemysł", "shipyard", "stoczni", "maritime", "offshore", "piping", "prefab", "isometr", "rohrleitung", "conducte", "tubagem"
]);
const DOMESTIC_TERMS = ["private hjem", "kjøkken", "domestic", "sanitarn", "bathroom", "badezimmer", "sanitär"];
const OFFICE_TITLE = /\b(software|designer|design engineer|cad|projektant|konstruktor)\b/;
const foldedTrades = PIPE_TRADE_TERMS.map(foldEuropean);
export function isRelevantJob(value: { title: string; description?: string }): boolean {
  const title = foldEuropean(value.title);
  const body = foldEuropean(`${value.title} ${value.description ?? ""}`);
  if (OFFICE_TITLE.test(title)) return false;
  if (!foldedTrades.some(term => title.includes(term))) return false;
  // Generic locksmith/plumbing names need industrial context; an industrial
  // description never turns an unrelated title into a pipefitting offer.
  const industrial = INDUSTRIAL_CONTEXT_TERMS.some(term => body.includes(foldEuropean(term)));
  const generic = /lacatus|putkiasentaja|torulukksepp|r[oø]rlegger/.test(title) && !/industri|teollisuus/.test(title);
  const domestic = DOMESTIC_TERMS.some(term => body.includes(foldEuropean(term)));
  return (!generic && !domestic) || industrial;
}
