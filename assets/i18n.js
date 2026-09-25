(() => {
  const STORAGE_KEY = "pipe-radar-language-v1";
  const TITLES = {
    pl: "PIPE RADAR v2.4.0 — automatyczne snapshoty ofert",
    en: "PIPE RADAR v2.4.0 — automatic job snapshots"
  };
  const EN = new Map(Object.entries({
    "PIPE RADAR / v2.4.0 · AUTOMATYCZNE SNAPSHOTY OFERT": "PIPE RADAR / v2.4.0 · AUTOMATIC JOB SNAPSHOTS",
    "AUTOMATYCZNE SNAPSHOTY OFERT": "AUTOMATIC JOB SNAPSHOTS",
    "Ustaw warunki.": "Set your criteria.",
    "Porównaj. Zdecyduj.": "Compare. Decide.",
    "Osobisty radar ofert dla doświadczonego montera rurociągów. Strona pobiera ostatni zwalidowany snapshot, a przy awarii wraca do bazy lokalnej. Część źródeł może być zablokowana lub niepełna. FIT jest jawną heurystyką, nie potwierdzoną zgodnością.": "A personal job radar for an experienced pipefitter. The site loads the latest validated snapshot and falls back to the local database if needed. Some sources may be blocked or incomplete. FIT is a transparent heuristic, not a confirmed match.",
    "TRYB LOKALNY": "LOCAL MODE", "DANE AKTUALNE": "DATA CURRENT", "DANE CZĘŚCIOWE": "PARTIAL DATA", "KOPIA AWARYJNA": "FALLBACK COPY",
    "Wszystkie kraje": "All countries", "Norwegia": "Norway", "Polska": "Poland", "Holandia": "Netherlands",
    "Wszystkie kontrakty": "All contracts", "Rotacja": "Rotation", "Etat": "Permanent", "Kontrakt": "Contract",
    "Wyszukaj oferty": "Search jobs", "Szukaj: izometria, duplex, stocznia, 2/3…": "Search: isometrics, duplex, shipyard, 2/3…", "Filtruj według kraju": "Filter by country", "Filtruj według rodzaju kontraktu": "Filter by contract type",
    "Szukaj": "Search", "Pokaż wyniki ↓": "Show results ↓", "Porównanie": "Comparison", "Kalkulator": "Calculator", "Moje oferty": "My jobs",
    "wpisów w wyniku": "results", "ofert w Norwegii": "jobs in Norway", "rotacyjnych": "rotation jobs", "najwyższy FIT w wyniku": "highest FIT in results",
    "FILTRY DECYZYJNE": "DECISION FILTERS", "Odsiej oferty, które nie spełniają warunków wyjazdu": "Filter out jobs that do not meet your travel criteria", "WYCZYŚĆ FILTRY": "CLEAR FILTERS",
    "Minimalna podstawa (NOK/h)": "Minimum base rate (NOK/h)", "Minimalny FIT (punkty /100)": "Minimum FIT (points /100)", "Dowolna": "Any", "Dowolne": "Any",
    "Warunki pakietu": "Benefits package", "Opłacone zakwaterowanie": "Paid accommodation", "Opłacony transport": "Paid travel", "Zakwaterowanie + transport": "Accommodation + travel",
    "Źródło / potrzeba weryfikacji": "Source / verification needed", "Wszystkie źródła": "All sources", "Tylko źródła pierwotne": "Primary sources only", "Do ręcznej weryfikacji": "Manual verification needed",
    "Widok bazy": "Database view", "Bez archiwum": "Exclude archive", "Archiwum": "Archive", "Wszystkie wpisy": "All entries", "Stan filtrów": "Filter status", "Wyniki aktualizują się po zmianie filtra.": "Results update when a filter changes.",
    "Mój profil i ustawienia FIT": "My profile and FIT settings", "MÓJ PROFIL": "MY PROFILE", "Edytuj priorytety — heurystyczny FIT przeliczy się lokalnie": "Edit priorities — heuristic FIT is recalculated locally", "Profil domyślny": "Default profile",
    "Doświadczenie (lata)": "Experience (years)", "Język roboczy": "Working language", "Angielski": "English", "Norweski + angielski": "Norwegian + English", "Podstawowy angielski": "Basic English",
    "Preferowana rotacja": "Preferred rotation", "Środowisko pracy": "Work environment", "Stocznia": "Shipyard", "Przemysł": "Industrial", "Kompetencje priorytetowe": "Priority skills",
    "Rozdzielaj przecinkami; maks. 8 różnych kompetencji. Zmiana wpływa na ranking, nie zmienia danych źródłowych.": "Separate with commas; up to 8 different skills. This changes the ranking, not the source data.",
    "ZAPISZ I PRZELICZ": "SAVE AND RECALCULATE", "PRZYWRÓĆ DOMYŚLNY": "RESTORE DEFAULT", "Tylko rotacje": "Rotation jobs only", "🎯 Profil RADAR: Industrial Pipefitter": "🎯 RADAR profile: Industrial Pipefitter", "Priorytet: Norwegia · stocznia/przemysł · ISO · duże rurociągi · rotacja · dobre warunki pobytowe": "Priority: Norway · shipyard/industrial · ISO · large-bore piping · rotation · good living conditions",
    "ZAPISANY ZESTAW": "SAVED SET", "Wpisy oznaczone jako nowe": "Entries marked as new", "Znacznik NOWA pochodzi z zestawu, nie z bieżącego skanowania. Aktualność rekrutacji sprawdź w źródle.": "The NEW marker comes from the saved set, not the current scan. Check the source to confirm that recruitment is active.", "POKAŻ NOWE": "SHOW NEW",
    "Podsumowanie ofert z aktualnej listy": "Summary of current results", "PODSUMOWANIE AKTUALNEGO WYNIKU": "CURRENT RESULTS SUMMARY", "Najwyższa dolna granica podstawy": "Highest minimum base rate", "Przykład opisanego pakietu": "Example documented package", "Najwyższy FIT /100": "Highest FIT /100",
    "Przykład pakietu to pierwszy wpis z opisanym zapewnionym świadczeniem w aktualnej liście, nie zwycięzca ekonomiczny. Nie wyceniamy brakujących danych.": "The package example is the first current entry with a documented benefit, not the best economic offer. Missing data is not estimated.",
    "Kalkulator rotacji i wartości świadczeń": "Rotation and benefits calculator", "KALKULATOR WARTOŚCI CYKLU": "ROTATION CYCLE VALUE CALCULATOR", "Najwyższy FIT (heurystyka)": "Highest FIT (heuristic)", "Przykład pakietu": "Package example", "Najwyższa dolna granica": "Highest minimum rate", "Pułapka": "Caution", "stawka ≠ wartość": "rate ≠ value", "wartość świadczeń ≠ wypłata netto": "benefit value ≠ net pay",
    "Podstawa (NOK/h)": "Base rate (NOK/h)", "Praca (h/tydzień)": "Work (h/week)", "ON (tygodnie)": "ON (weeks)", "OFF (tygodnie)": "OFF (weeks)", "Dieta (NOK/dzień)": "Allowance (NOK/day)", "Dieta (dni/tydzień)": "Allowance (days/week)", "Zakwaterowanie (NOK/tydzień)": "Accommodation (NOK/week)", "Transport (NOK/cykl)": "Travel (NOK/cycle)", "POLICZ CYKL": "CALCULATE CYCLE",
    "Wpisz własne dane; widoczne liczby są przykładem, nie warunkami wybranej oferty. Wszystkie pola wymagają wartości — wpisz 0 dla nieprzyjętego dodatku. Podstawa + dieta + deklarowana wartość zakwaterowania i transportu; to nie kalkulator kosztów ani netto.": "Enter your own figures; the visible values are examples, not terms of a selected job. Every field needs a value — enter 0 for an excluded benefit. Base rate + allowance + declared accommodation and travel value; this is not a cost or net-pay calculator.",
    "Jakość danych i wiek zapisanej weryfikacji": "Data quality and verification age", "JAKOŚĆ DANYCH · CAŁA BAZA": "DATA QUALITY · FULL DATABASE", "Źródła pierwotne": "Primary sources", "NAV lub pracodawca": "NAV or employer", "Wymagają sprawdzenia": "Need verification", "agregator albo starsza weryfikacja": "aggregator or older verification", "poza domyślnym wynikiem": "excluded from default results",
    "Źródła są oznaczone na kartach. Status informuje o jakości danych, nie zastępuje ręcznej weryfikacji przed aplikacją.": "Sources are labelled on each card. Status describes data quality and does not replace manual verification before applying.",
    "STAN BAZY OFERT": "JOB DATABASE STATUS", "● SNAPSHOT + KOPIA LOKALNA": "● SNAPSHOT + LOCAL COPY", "Pobierz najnowszą bazę": "Load latest database",
    "MOJE OFERTY": "MY JOBS", "Zapisane pozycje, status aplikacji i follow-up": "Saved jobs, application status and follow-up", "Brak zapisanych ofert": "No saved jobs", "Ponów zapis lokalny": "Retry local save",
    "PORÓWNYWARKA": "COMPARISON", "Porównaj maksymalnie trzy oferty na raz": "Compare up to three jobs at a time", "PORÓWNAJ TOP 3": "COMPARE TOP 3", "WYCZYŚĆ": "CLEAR", "Wybierz maksymalnie trzy oferty z kart albo użyj Top 3.": "Select up to three job cards or use Top 3.",
    "Wyniki w aktualnej bazie": "Results in the current database", "Priorytet: Norwegia · rurociągi przemysłowe · izometria · rotacja · stawka · zakwaterowanie": "Priority: Norway · industrial piping · isometrics · rotation · rate · accommodation", "Sortuj po FIT": "Sort by FIT",
    "FIT — jawna heurystyka /100": "FIT — transparent heuristic /100", "Ręczna baza job.fit z v2.2 nie ma rozpisanego uzasadnienia. Nie jest to zweryfikowane dopasowanie ani szansa zatrudnienia.": "The manual job.fit baseline from v2.2 has no documented rationale. It is not a verified match or a probability of employment.", "Na każdej karcie rozwiń „Skąd FIT?”, aby zobaczyć bazę, korekty i ograniczenie wyniku do 0–100.": "Open “How is FIT calculated?” on each card to see the baseline, adjustments and 0–100 cap.", "Kompetencje: +3 za różnicę liczby dopasowanych słów względem profilu domyślnego. Powtórzenia nie dają punktów.": "Skills: +3 for the difference in matched terms versus the default profile. Repetitions add no points.", "Znana rotacja: +5 / −8; jawne środowisko: +5 / −4; za małe wymagane doświadczenie: −12; język wskazany w zakresie: +2 za norweski lub −7 przy podstawowym języku.": "Known rotation: +5 / −8; stated environment: +5 / −4; insufficient required experience: −12; language stated in scope: +2 for Norwegian or −7 for basic language skills.", "Brak danych nie daje korekty za dany warunek. Pełny, udokumentowany model punktowania wymaga osobnej pracy.": "Missing data causes no adjustment for that criterion. A fully documented scoring model requires separate work.", "⚠️ Reguła anty-bzdura": "⚠️ No-nonsense rule",
    "Jeżeli ogłoszenie nie podaje stawki, rotacji albo zakwaterowania, radar pokazuje": "If a job ad does not state the rate, rotation or accommodation, the radar shows",
    ", zamiast dopowiadać dane.": ", instead of inventing data.", "zamiast dopowiadać dane.": "instead of inventing data.", "To jest kluczowa różnica między efektowną listą ofert a narzędziem do podejmowania decyzji.": "This is the key difference between an impressive-looking job list and a decision-making tool.",
    "Źródła pierwotne: pracodawca lub NAV. Portal i agregator to tropy. Otwórz źródło przed aplikacją. Status snapshotu nie potwierdza otwartej rekrutacji. Follow-up zapisuje datę lokalnie, bez automatycznych przypomnień.": "Primary sources are employers or NAV. Portals and aggregators are leads. Open the source before applying. Snapshot status does not confirm active recruitment. Follow-up dates are stored locally without automatic reminders.",
    "Podstawa": "Base rate", "Mieszkanie": "Accommodation", "Transport": "Travel", "Źródło": "Source", "Rekrutacja": "Recruitment", "Sprawdź w źródle": "Check the source", "Zakres:": "Scope:",
    "☆ Zapisz": "☆ Save", "★ Na liście zapisanych": "★ Saved", "Porównaj": "Compare", "✓ W porównaniu": "✓ Comparing", "Otwórz źródło ↗": "Open source ↗", "Źródło archiwalne ↗": "Archived source ↗",
    "Stawka — opis źródłowy": "Rate — source wording", "Zakwaterowanie": "Accommodation", "Oznaczona NOWA w zestawie": "Marked NEW in the saved set", "Brak trafień dla tych warunków. Zmień filtry lub użyj RESET.": "No matches for these criteria. Change the filters or use RESET.",
    "Nie wybrano ofert do porównania.": "No jobs selected for comparison.", "Usuń z porównania": "Remove from comparison", "Usuń z zapisanych": "Remove from saved", "Notatka": "Note", "Termin follow-upu": "Follow-up date", "Status": "Status", "PIPE RADAR v2.4.0 · automatyczny snapshot co sześć godzin · publiczne źródła mogą być częściowe lub zablokowane.": "PIPE RADAR v2.4.0 · automatic snapshot every six hours · public sources may be partial or blocked."
  }));

  const PATTERNS = [
    [/^Pokaż wyniki \((\d+)\) ↓$/, "Show results ($1) ↓"],
    [/^(\d+) wpisów · (\d+) poza archiwum · (\d+) archiwalne · aktualność rekrutacji wymaga sprawdzenia w źródle$/, "$1 entries · $2 active · $3 archived · recruitment status must be checked at source"],
    [/^(\d+) zapisanych wpisów · także z archiwum$/, "$1 saved entries · including archived"],
    [/^(\d+) wpisy oznaczone jako nowe w zapisanym zestawie$/, "$1 entries marked as new in the saved set"],
    [/^Porównujesz (\d+) \/ 3 wpisy\. Top 3 wybiera z aktualnej listy\.$/, "Comparing $1 / 3 entries. Top 3 uses the current list."],
    [/^(\d+) wpisów · bez archiwum · bez dodatkowych filtrów$/, "$1 entries · archive excluded · no additional filters"],
    [/^Data zapisana: (.+)$/, "Saved date: $1"],
    [/^Rekrutacja: sprawdź źródło$/, "Recruitment: check source"],
    [/^Ostatni udany skan: (.+)$/, "Last successful scan: $1"],
    [/^Źródła: (\d+) \/ (\d+) działających$/, "Sources: $1 / $2 working"]
  ];

  const originals = new WeakMap();
  const attributeOriginals = new WeakMap();
  let language = "pl";
  let observer;

  function translateValue(value) {
    const leading = value.match(/^\s*/)?.[0] ?? "";
    const trailing = value.match(/\s*$/)?.[0] ?? "";
    const clean = value.trim();
    if (!clean) return value;
    const exact = EN.get(clean);
    if (exact) return leading + exact + trailing;
    for (const [pattern, replacement] of PATTERNS) if (pattern.test(clean)) return leading + clean.replace(pattern, replacement) + trailing;
    return value;
  }

  function translateNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!originals.has(node)) originals.set(node, node.nodeValue ?? "");
      const original = originals.get(node);
      node.nodeValue = language === "en" ? translateValue(original) : original;
      return;
    }
    if (!(node instanceof Element)) return;
    for (const attribute of ["placeholder", "aria-label", "title"]) {
      if (!node.hasAttribute(attribute)) continue;
      let saved = attributeOriginals.get(node);
      if (!saved) { saved = {}; attributeOriginals.set(node, saved); }
      if (!(attribute in saved)) saved[attribute] = node.getAttribute(attribute) ?? "";
      node.setAttribute(attribute, language === "en" ? translateValue(saved[attribute]) : saved[attribute]);
    }
    for (const child of node.childNodes) translateNode(child);
  }

  function applyLanguage(next, persist = true) {
    language = next === "en" ? "en" : "pl";
    document.documentElement.lang = language;
    document.title = TITLES[language];
    document.querySelectorAll("[data-language]").forEach(button => button.setAttribute("aria-pressed", String(button.getAttribute("data-language") === language)));
    translateNode(document.body);
    if (persist) try { localStorage.setItem(STORAGE_KEY, language); } catch { /* storage may be unavailable */ }
  }

  function init() {
    document.querySelectorAll("[data-language]").forEach(button => button.addEventListener("click", () => applyLanguage(button.getAttribute("data-language"))));
    let saved = "pl";
    try { saved = localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "pl"; } catch { /* use Polish */ }
    applyLanguage(saved, false);
    observer = new MutationObserver(records => {
      if (language !== "en") return;
      observer.disconnect();
      for (const record of records) for (const node of record.addedNodes) translateNode(node);
      observer.observe(document.body, { childList: true, subtree: true });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.PIPE_RADAR_LANGUAGE = { set: applyLanguage, get: () => language };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
