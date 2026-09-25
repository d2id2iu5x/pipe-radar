import type { FitBreakdown, Job } from "./types.js";

export interface FitProfile {
  experience: number;
  language: "english" | "norwegian" | "basic";
  rotation: string;
  focus: "" | "shipyard" | "industrial";
  skills: string[];
}

const DEFAULT_SKILLS = ["izometria", "ermeto", "hydraulika", "prefabrykacja"];
const DEFAULT_PROFILE: FitProfile = { experience: 5, language: "english", rotation: "", focus: "", skills: DEFAULT_SKILLS };

export function calculateFit(job: Job, profile: FitProfile = DEFAULT_PROFILE): FitBreakdown {
  const text = `${job.skills.join(" ")} ${job.tags.join(" ")}`.toLocaleLowerCase("pl-PL");
  const title = job.title.toLocaleLowerCase("pl-PL");
  const adjustments: FitBreakdown["adjustments"] = [];
  const add = (label: string, points: number) => { if (points) adjustments.push({ label, points }); };
  const matched = profile.skills.filter(skill => text.includes(skill.toLocaleLowerCase("pl-PL"))).length;
  const baseline = DEFAULT_SKILLS.filter(skill => text.includes(skill)).length;
  add("Kompetencje względem profilu domyślnego", 3 * (matched - baseline));
  const requirement = text.match(/(?:min\.?|minimum)\s*(\d+)\s*(?:lat|lata)/i);
  if (requirement?.[1] && profile.experience < Number(requirement[1])) add("Za mało podanego doświadczenia", -12);
  const rotations: string[] = job.rotation.raw.match(/\b\d+\/\d+\b/g) ?? [];
  if (profile.rotation && rotations.length) add("Preferowana rotacja", rotations.includes(profile.rotation) ? 5 : -8);
  const shipyard = /stoczni|shipyard|vard|maritim/.test(`${text} ${title}`);
  const industrial = /przemys|industrial|aquaculture|oczyszcz/.test(`${text} ${title}`);
  if (profile.focus === "shipyard" && (shipyard || industrial)) add("Środowisko pracy", shipyard ? 5 : -4);
  if (profile.focus === "industrial" && (shipyard || industrial)) add("Środowisko pracy", industrial ? 5 : -4);
  const english = /angielski|english/.test(text);
  const norwegian = /język\w*\s+norwesk|norweski(?:\/|\b)|norwegian|skandynawski/.test(text);
  if (profile.language === "norwegian" && norwegian) add("Język wskazany w zakresie", 2);
  if (profile.language === "basic" && (english || norwegian)) add("Podstawowy język a zapisane wymaganie", -7);
  const base = Number.isFinite(job.legacyFit) ? job.legacyFit : 0;
  const raw = base + adjustments.reduce((sum, item) => sum + item.points, 0);
  return { base, adjustments, raw, score: Math.max(0, Math.min(100, Math.round(raw))) };
}
