import { describe, expect, it } from "vitest";
import { mountEuropeView } from "../../src/client/europe-view.js";
import { EUROPE_COUNTRIES, europeanSearchLinks } from "../../src/domain/europe.js";
describe("European country interface", () => {
  function setup(lang="pl") {
    document.documentElement.lang=lang;
    document.body.innerHTML='<div class="top"><div class="brand">PIPE RADAR</div></div><div class="hero"><input id="q"><select id="country"><option value="">Wszystkie kraje</option><option value="Norwegia">Norwegia</option></select></div><button data-language="en">EN</button>';
    mountEuropeView(document);
    return document.getElementById('country') as HTMLSelectElement;
  }
  it("offers the European scope, including UK, Switzerland and non-EU countries", () => {
    const select=setup();
    expect([...select.options].map(o=>o.value)).toEqual(expect.arrayContaining(['Niemcy','Francja','Wielka Brytania','Szwajcaria','Turcja','Ukraina']));
    expect(select.options).toHaveLength(EUROPE_COUNTRIES.length+2);expect(select.options[0]!.textContent).toBe('Cała Europa');
  });
  it("keeps canonical filter values when displaying English country names", () => {
    const select=setup('en');
    select.value='Niemcy';select.dispatchEvent(new Event('change'));
    expect(select.value).toBe('Niemcy');expect(select.selectedOptions[0]!.textContent).toBe('Germany');
  });
  it("uses actual external searches without claiming these were imported", () => {
    const select=setup();select.value='Niemcy';select.dispatchEvent(new Event('change'));
    const link=document.getElementById('europeWeb') as HTMLAnchorElement;
    expect(new URL(link.href).searchParams.get('q')).toContain('Germany');
    expect(new URL(link.href).searchParams.get('q')).toContain('Rohrschlosser');
    expect(document.getElementById('europeCoverage')!.textContent).toContain('nie import automatyczny');
  });
  it("encodes free-text input safely in external links", () => {
    const link=europeanSearchLinks('Francja','a&b #x <script>','pl').web;
    expect(new URL(link).hostname).toBe('www.google.com');
    expect(new URL(link).searchParams.get('q')).toContain('a&b #x <script>');
  });
  it("does not mount the section twice", () => {
    setup();mountEuropeView(document);expect(document.querySelectorAll('#europePanel')).toHaveLength(1);
  });
});
