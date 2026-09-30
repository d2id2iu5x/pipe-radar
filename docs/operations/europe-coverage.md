# PIPE RADAR — zakres europejski (30.09.2026)

Filtr kraju oferuje 51 europejskich pozycji, łącznie z krajami częściowo położonymi w Europie. Wartości filtra pozostają po polsku, etykiety przełączają się PL/EN. Brak kraju nie jest zastępowany Norwegią ani adresem rekrutera. Rozpoznawane są wielojęzyczne nazwy zawodu; nie każdy zawód przemysłowy jest pipefitterem.

## Import a wyszukiwanie zewnętrzne

- Istniejące źródła norweskie pozostają podłączone.
- JobTech/Arbetsförmedlingen: publiczny JobSearch API, trzy zapytania branżowe i ograniczone stronicowanie. Tylko kompletne odpowiedzi mogą dać success. To źródło szwedzkie, nie feed całej Europy.
- Bilfinger i Silverhand: ograniczony odczyt publicznych stron kariery i JobPosting, respektujący robots.txt oraz blokady. Odczyt ma zawsze status partial, więc nieobecność w uciętej liście nie archiwizuje oferty.
- Szukaj w internecie: zewnętrzne zapytanie z wybranym krajem, branżą i frazą. Nie importuje wyników.
- EURES: link do portalu; kraj trzeba wybrać tam. Nie udajemy dostępu API.

Lista krajów nie oznacza automatycznego pokrycia każdego rynku. Brak wyników w snapshotcie nie oznacza braku pracy. Status importu wynika z snapshot.sources. Nie są oceniane uprawnienia do pracy ani bezpieczeństwo wyjazdu.

## Waluty

Waluta i okres wypłaty pozostają źródłowe. Bez domyślnego kursu i bez zamiany wynagrodzenia miesięcznego na godzinowe. Filtr 300+ NOK i istniejący kalkulator nadal dotyczą NOK. Niejednoznaczne kwoty nie stają się gwarantowaną stawką; 1 250 nie jest parsowane jako 250.

## Publikacja i testy

npm run build kopiuje jawną listę 7 publicznych plików i dołącza moduł europe-view.js do wynikowego index.html. Publikuj katalog dist, nie surowy index.html. Dotychczasowy monolit i klucze localStorage pozostają bez zmian.

npm run check, npm run acceptance oraz npm run build sprawdzają regresję. Opcjonalnie node --import tsx scripts/probe-europe.ts zapisuje review/europe-live-probe.json. To ograniczony test żywych źródeł, nie aktualizacja produkcyjnego snapshotu. Blokada lub pusta odpowiedź jest raportowana, nie obchodzona.

## Dokumentacja źródeł

- https://arbetsformedlingen.se/om-webbplatsen/apier-och-oppna-data
- https://jobsearch.api.jobtechdev.se/
- https://jobs.bilfinger.com/
- https://silverhand.eu/oferty-pracy/
- https://europa.eu/eures/portal/jv-se/home?lang=pl
