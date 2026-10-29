# PIPE RADAR v2.4

PIPE RADAR publikuje ostatni zwalidowany snapshot ofert jako statyczny plik `data/jobs.json`. GitHub Actions uruchamia skan co sześć godzin, a frontend Cloudflare pobiera aktualny snapshot bezpośrednio z publicznego repozytorium. Statyczna strona zachowuje 13 rekordów v2.3.1 jako awaryjną bazę lokalną.

## Poprawka audytu A-16 — integracja 29.10.2026

Kod rozróżnia identyfikatory ofert Vaia, zachowuje dowody źródłowe i nie przywraca aktywnego statusu wpisom z nierozstrzygniętym konfliktem tożsamości lub lokalizacji. [Integracja i odbiór](docs/operations/audit-release-a16-2026-10-29.md) opisują zastosowanie [poprawki z 28.10](docs/operations/audit-repair-a16-2026-10-28.md) do nowszego snapshotu. Pliki danych zachowują daty ostatniego rzeczywistego skanu; sama publikacja korekty nie odświeża ogłoszeń.

## Uruchomienie lokalne

```bash
npm install
npm run seed
npm run build
```

Kontrola jakości:

```bash
npm run check
npm run acceptance
```

Stabilny `NAV_FEED_TOKEN` trzeba uzyskać zgodnie z aktualnymi warunkami NAV; token eksperymentalny nie jest pobierany automatycznie. Jeśli token jest używany, przechowuj go wyłącznie jako sekret repozytorium GitHub.

Przycisk „Pobierz najnowszą bazę” pobiera ostatni zapisany snapshot, ale sam nie uruchamia skanu. Ręczny skan można uruchomić w GitHub Actions przez workflow `Scan job offers`. Szczegóły źródeł opisuje [polityka źródeł](docs/operations/source-policy.md).

## Aktualność informacji o skanie (R27)

Etykieta uwzględnia `lastSuccessfulScanAt`, a nie datę pobrania ani `generatedAt` pliku. Roboczy próg ostrzegawczy wynosi **więcej niż 24 godziny** (przy planowanym skanie co 6 godzin); dokładnie 24 godziny nie przekracza progu. Po jego przekroczeniu pojawia się **DANE WYMAGAJĄ PONOWNEJ WERYFIKACJI**, data skanu oraz przyczyna. Brak daty, nieprawidłowy format/kalendarz, brak strefy czasowej i data z przyszłości również wymagają weryfikacji.

Informacja o częściowo niedostępnych źródłach, kopii awaryjnej lub trybie lokalnym pozostaje widoczna. Pomyślne pobranie pliku nie odmładza bazy. Widok przelicza wiek także w otwartej karcie i po powrocie do niej, bez dodatkowych zapytań sieciowych. Ocena opiera się na zegarze urządzenia; błędny zegar może wymagać korekty.

Ostrzeżenie dotyczy wieku całej bazy. Nie usuwa ofert i nie zmienia klasyfikacji pojedynczych ogłoszeń, ulubionych ani reguł archiwizacji. Niedawny skan nie potwierdza, że konkretna rekrutacja nadal trwa.

Korekta zgłoszenia z 16.10.2026: ofertę Indeed `c15ed66dface1e9c` oznaczono jako archiwalną po potwierdzeniu komunikatu o wygaśnięciu. Przywrócono też dwie wcześniejsze decyzje archiwizacji zapisane w bazie początkowej. Upływ czasu ani awaria źródła nie przywracają już zarchiwizowanej oferty do zwykłych wyników; może to zrobić ponowna obserwacja oferty przez źródło. Wpis pozostaje w archiwum, a zapisane notatki użytkownika są zachowane. Indeed ma tryb `probe-only` i nie jest źródłem regularnego importu; ta korekta nie dodaje skanowania Indeed.

Dalsza ręczna kontrola 16.10.2026 objęła wszystkie 33 pozostałe niearchiwalne rekordy. Pięć potwierdzonych wygasłych ofert przeniesiono do archiwum; pozostałe rekordy i datę skanu zachowano. [Wyniki kontroli i źródła](docs/operations/source-audit-2026-10-16.md) rozróżniają dostępność strony od potwierdzenia trwającej rekrutacji. Kontrola nie uruchamiała skanera.

Ustawienia Cloudflare Pages:

- komenda budowania: `npm run build`
- katalog wynikowy: `dist`
- Node.js: `22`
