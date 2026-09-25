export const PIPE_TRADE_TERMS = Object.freeze([
  "pipefitter", "pipe fitter", "monter rurociąg", "industrirørlegger", "industrirørleggere", "rørlegger", "piping"
]);
export const INDUSTRIAL_CONTEXT_TERMS = Object.freeze([
  "industrial", "industri", "przemysł", "shipyard", "stoczni", "maritime", "offshore", "piping", "prefab"
]);
const DOMESTIC_TERMS = Object.freeze(["private hjem", "bad", "kjøkken", "domestic", "sanitarn"]);

function fold(value: string): string { return value.toLocaleLowerCase("nb-NO"); }

export function isRelevantJob(value: { title: string; description?: string }): boolean {
  const title = fold(value.title);
  const body = fold(`${value.title} ${value.description ?? ""}`);
  if (!PIPE_TRADE_TERMS.some(term => title.includes(term))) return false;
  const industrial = INDUSTRIAL_CONTEXT_TERMS.some(term => body.includes(term));
  const domestic = DOMESTIC_TERMS.some(term => body.includes(term));
  return !domestic || industrial;
}
