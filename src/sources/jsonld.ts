import { load } from "cheerio";
import type { RawJob } from "../domain/types.js";

interface JsonLdObject { [key: string]: unknown }
function objects(value: unknown): JsonLdObject[] {
  if (Array.isArray(value)) return value.flatMap(objects);
  if (!value || typeof value !== "object") return [];
  const record = value as JsonLdObject;
  return [record, ...objects(record["@graph"])];
}
function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as JsonLdObject;
    return text(record.name) || text(record.value);
  }
  return "";
}
function salary(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const money = value as JsonLdObject;
  const amount = money.value && typeof money.value === "object" ? money.value as JsonLdObject : {};
  const min = amount.minValue ?? amount.value ?? (typeof money.value === "number" ? money.value : undefined);
  const max = amount.maxValue;
  const unit = text(amount.unitText).toUpperCase();
  const units: Record<string,string> = {HOUR:"h",DAY:"day",WEEK:"week",MONTH:"month",YEAR:"year"};
  const currency = text(money.currency).toUpperCase();
  if (typeof min !== "number" || !Number.isFinite(min) || min < 0 || !/^[A-Z]{3}$/.test(currency) || !units[unit]) return undefined;
  if (max !== undefined && (typeof max !== "number" || !Number.isFinite(max) || max < min)) return undefined;
  return `${min}${max !== undefined && max !== min ? "–"+max : ""} ${currency}/${units[unit]}`;
}
function address(posting: JsonLdObject): JsonLdObject {
  const location = Array.isArray(posting.jobLocation) ? posting.jobLocation[0] : posting.jobLocation;
  if (!location || typeof location !== "object") return {};
  const raw = (location as JsonLdObject).address;
  return raw && typeof raw === "object" ? raw as JsonLdObject : {};
}
function safeUrl(value: string, base: string): string | null {
  try { const url = new URL(value,base); return /^https?:$/.test(url.protocol) ? url.href : null; } catch { return null; }
}
/** Parses only explicit schema.org JobPosting markup, not unrelated text or bonuses. */
export function extractJobPostings(html: string, pageUrl: string): RawJob[] {
  const $ = load(html);
  const output: RawJob[] = [];
  const sourceId = new URL(pageUrl).hostname.replace(/^www\./, "");
  $('script[type="application/ld+json"]').each((_, element) => {
    let parsed: unknown;
    try { parsed = JSON.parse($(element).text()); } catch { return; }
    for (const posting of objects(parsed)) {
      const types = Array.isArray(posting["@type"]) ? posting["@type"] : [posting["@type"]];
      if (!types.includes("JobPosting")) continue;
      const url = safeUrl(text(posting.url) || pageUrl,pageUrl);
      if (!url) continue;
      const organization = posting.hiringOrganization && typeof posting.hiringOrganization === "object" ? posting.hiringOrganization as JsonLdObject : {};
      const identifier = posting.identifier && typeof posting.identifier === "object" ? posting.identifier as JsonLdObject : posting.identifier;
      const jobAddress = address(posting);
      output.push({
        sourceId, sourceJobId: text(identifier) || url, sourceKind: "portal", url,
        title: text(posting.title), company: text(organization.name) || "Nie podano",
        country: text(jobAddress.addressCountry) || "Nie podano",
        location: text(jobAddress.addressLocality) || text(jobAddress.addressRegion) || undefined,
        description: load(text(posting.description)).text(), rate: salary(posting.baseSalary),
        publishedAt: text(posting.datePosted) || undefined, employmentType: text(posting.employmentType) || undefined
      });
    }
  });
  const jobSelector = '[itemscope][itemtype="http://schema.org/JobPosting"], [itemscope][itemtype="https://schema.org/JobPosting"]';
  $(jobSelector).each((_, element) => {
    const scope = $(element);
    const prop = (selector: string): string => {
      // Do not mix fields from a nested, different JobPosting.
      const node = scope.find(selector).filter((_,el) => $(el).closest(jobSelector).get(0) === element).first();
      return (node.attr("content") || node.attr("datetime") || node.text()).trim();
    };
    const title = prop('[itemprop~="title"]');
    if (!title) return;
    const urlNode = scope.children('[itemprop~="url"]').first();
    const url = safeUrl(urlNode.attr('content') || urlNode.attr('href') || pageUrl,pageUrl);
    if (!url || output.some(job => job.url === url && job.title)) return;
    const company = prop('[itemprop~="hiringOrganization"] [itemprop~="name"]') || prop('meta[itemprop~="hiringOrganization"]');
    output.push({sourceId,sourceJobId:prop('[itemprop~="identifier"]') || url,sourceKind:'portal',url,title,
      company:company || 'Nie podano',country:prop('[itemprop~="addressCountry"]') || 'Nie podano',
      location:prop('[itemprop~="addressLocality"]') || prop('[itemprop~="addressRegion"]') || undefined,
      description:prop('[itemprop~="description"]'),publishedAt:prop('[itemprop~="datePosted"]') || undefined,
      employmentType:prop('[itemprop~="employmentType"]') || undefined});
  });
  return output.filter(job => job.title);
}
