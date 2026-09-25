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

function address(posting: JsonLdObject): JsonLdObject {
  const location = Array.isArray(posting.jobLocation) ? posting.jobLocation[0] : posting.jobLocation;
  if (!location || typeof location !== "object") return {};
  const raw = (location as JsonLdObject).address;
  return raw && typeof raw === "object" ? raw as JsonLdObject : {};
}

export function extractJobPostings(html: string, pageUrl: string): RawJob[] {
  const $ = load(html);
  const output: RawJob[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    let parsed: unknown;
    try { parsed = JSON.parse($(element).text()); } catch { return; }
    for (const posting of objects(parsed)) {
      const types = Array.isArray(posting["@type"]) ? posting["@type"] : [posting["@type"]];
      if (!types.includes("JobPosting")) continue;
      const rawUrl = text(posting.url) || pageUrl;
      let url: string;
      try { url = new URL(rawUrl, pageUrl).href; } catch { continue; }
      const organization = posting.hiringOrganization && typeof posting.hiringOrganization === "object" ? posting.hiringOrganization as JsonLdObject : {};
      const identifier = posting.identifier && typeof posting.identifier === "object" ? posting.identifier as JsonLdObject : posting.identifier;
      const jobAddress = address(posting);
      const sourceId = new URL(pageUrl).hostname.replace(/^www\./, "");
      output.push({
        sourceId,
        sourceJobId: text(identifier) || url,
        sourceKind: "portal",
        url,
        title: text(posting.title),
        company: text(organization.name) || "Nie podano",
        country: text(jobAddress.addressCountry) || "Nie podano",
        location: text(jobAddress.addressLocality) || text(jobAddress.addressRegion) || undefined,
        description: text(posting.description),
        publishedAt: text(posting.datePosted) || undefined,
        employmentType: text(posting.employmentType) || undefined
      });
    }
  });
  return output.filter(job => job.title);
}
