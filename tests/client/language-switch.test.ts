import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("language switch", () => {
  it("offers persistent Polish and English controls in the top-right corner", () => {
    const html = readFileSync("index.html", "utf8");

    expect(html).toContain('id="languageSwitch"');
    expect(html).toContain('data-language="pl"');
    expect(html).toContain('data-language="en"');
    expect(html).toContain('src="assets/i18n.js"');
  });

  it("switches the interface without changing technical filter values and remembers the choice", () => {
    document.body.innerHTML = `
      <div id="languageSwitch">
        <button data-language="pl" aria-pressed="true">🇵🇱 PL</button>
        <button data-language="en" aria-pressed="false">🇬🇧 EN</button>
      </div>
      <h1>Ustaw warunki.</h1>
      <select><option value="Norwegia">Norwegia</option></select>`;
    localStorage.clear();
    window.eval(readFileSync("assets/i18n.js", "utf8"));
    document.dispatchEvent(new Event("DOMContentLoaded"));

    (document.querySelector('[data-language="en"]') as HTMLButtonElement).click();
    expect(document.documentElement.lang).toBe("en");
    expect(document.querySelector("h1")?.textContent).toBe("Set your criteria.");
    expect((document.querySelector("option") as HTMLOptionElement).value).toBe("Norwegia");
    expect(localStorage.getItem("pipe-radar-language-v1")).toBe("en");

    (document.querySelector('[data-language="pl"]') as HTMLButtonElement).click();
    expect(document.querySelector("h1")?.textContent).toBe("Ustaw warunki.");
  });
});
