# A-16 — prywatna naprawa tożsamości i konfliktów ofert, 28.10.2026

Dokument historyczny opisujący przygotowanie poprawki. Jej późniejszą integrację do bieżącego repozytorium opisuje [raport z 29.10.2026](audit-release-a16-2026-10-29.md).

**Stan: poprawka lokalna, bez push, publikacji, wdrożenia lub uruchomienia skanera.** Baza to commit `f75d4a58ce2b614274f0c6b03071fc78f4cc2f89` repozytorium [d2id2iu5x/pipe-radar](https://github.com/d2id2iu5x/pipe-radar/commit/f75d4a58ce2b614274f0c6b03071fc78f4cc2f89).

## Potwierdzony problem i źródła

Audytowana baza łączyła dwa różne URL Vaia w rekord `vaia:Moja Norwegia`, z `sourceJobId: Moja Norwegia`. Rekord miał `US / Wind Lake`, a jego opis wskazywał numer ogłoszenia 105908 i pracę w Norwegii.

- [Pierwotne ogłoszenie MojaNorwegia 105908](https://www.mojanorwegia.pl/ogloszenia_o_prace/pipe_fitter_norwegia-s105908.html) było dostępne podczas tej kontroli. Nagłówek podaje Vestland i datę 16.03.2026, a treść opisuje pracę w Norwegii. Jest to źródłowe potwierdzenie sprzeczności w zapisanym rekordzie, **nie potwierdzenie, że rekrutacja nadal trwa**.
- [Pierwszy URL Vaia](https://talents.vaia.com/companies/moja-norwegia/wind-lake/pipe-fitter-norwegia-116660164/) i [drugi URL Vaia](https://talents.vaia.com/companies/moja-norwegia/wind-lake/pipe-fitter-offshore-shipyard-norway-flights-housing-116661769/) nie były dostępne przez narzędzie odczytu internetu. Nie obchodzono zabezpieczeń i nie pobierano ich alternatywnym klientem.
- W samym kodzie potwierdzono: parser JSON-LD używał ogólnego helpera `text`, który wybierał `identifier.name` przed `identifier.value`. Prawidłowe `PropertyValue` z nazwą wydawcy mogło więc tworzyć współdzielone ID. Odtworzono to na syntetycznym HTML. Dzisiejszy markup Vaia pozostaje nieodczytany; nie przedstawiamy fixture'a jako kopii tamtej strony.

## Zmiana kodu

1. **JSON-LD:** tożsamość jest pobierana z wartości `identifier.value` albo jawnego tekstowego identyfikatora. Sama nazwa przestrzeni/wydawcy nie jest ID oferty; brak wartości powoduje użycie URL.
2. **Vaia:** numer kończący kanoniczną ścieżkę oferty rozróżnia 116660164 i 116661769. Gdy takiego numeru nie ma, używany jest origin i ścieżka. Raportowane ID zostaje zachowane w `sources[].reportedSourceJobId`.
3. **Ślad źródłowy:** normalizacja zachowuje także `reportedCountry` i `reportedLocation` przy każdej nowej referencji. Pole `country`, lokalizacja i opis nie są zamieniane na zgadywane wartości.
4. **Konserwatywna flaga:** w adapterze Vaia jawne sformułowanie w opisie o pracy w Norwegii, sprzeczne z podanym innym krajem, ustawia konflikt `country`. Nie bierze się kraju z tytułu ani nazwy rekrutera. Brak kraju nadal oznacza brak danych. Ta wąska reguła nie jest uniwersalnym geokoderem ani dowodem rozstrzygającym miejsce pracy.
5. **Łączenie:** różne jawne ID jednego dostawcy, mające różne URL, nie są scalane tylko z powodu podobnych opisów. Sprawdzana jest cała grupa, także połączenie przechodnie przez trzeci portal. Gdy takie połączenie narusza rozdzielenie jawnych ID, grupa pozostaje rozdzielona według źródła i ID z flagą do weryfikacji; nie wybiera się losowo jednej oferty dla portalu. Dla jednoznacznych międzyźródłowych połączeń wykrywana jest również sprzeczność kraju/lokalizacji; zachowane pozostają referencje i ich zgłoszone pola.
6. **Status:** obecny konflikt nie otrzymuje `new` ani `active`. Historyczne flagi kraju, lokalizacji i tożsamości nie znikają od samego następnego odczytu strony; ich zdjęcie wymaga jawnej korekty po weryfikacji źródeł. Istniejące reguły archiwizacji pozostają nadrzędne. Brak nowej obserwacji nie odświeża dat wpisu.

## Prywatna korekta znanego rekordu

Zmieniono wyłącznie `status: active → uncertain` i dopisano flagi `country`, `sourceJobId` w trzech aktualnych reprezentacjach jednego rekordu: `data/jobs.json`, bieżący `snapshot` oraz `lifecycle` w `data/scan-state.json`. Poprzedni snapshot pozostał historią.

Liczba rekordów pozostaje 48. Zachowano obecne ID (ważne dla istniejących notatek), oba URL, `US`, `Wind Lake`, opis, wszystkie daty skanu/obserwacji, warunki handlowe i pozostałe 47 rekordów. Nie rozdzielano starego zlepionego wpisu na dwie domniemane historyczne oferty. Przy przyszłym prawidłowym odczycie adapter wytworzy odrębne ID; nie przenosi automatycznie notatek z dawnego wspólnego ID, bo nie wiadomo, której publikacji dotyczą.

Ta prywatna kopia nie zmienia pliku pobieranego obecnie z GitHub przez publiczny frontend. Zbudowany frontend nadal korzysta z dotychczasowej konfiguracji źródła; nie stanowi dowodu wdrożenia poprawki skanera.

## Weryfikacja i ograniczenia

Nowy zestaw `tests/sources/vaia-integrity.test.ts` zawiera 14 scenariuszy. Pierwsze 12 przed zmianą dało 10 FAIL / 2 PASS; dodatkowe testy zachowania dwóch sprzecznych dowodów z tego samego URL oraz przechodniego sklejenia przez trzeci portal najpierw również wykazały błędy. Po naprawach 14/14 przechodzi. Ostatni test obejmuje wszystkie sześć kolejności wejścia trzech rekordów. Obejmuje identyfikatory, dwa URL, zachowanie pól źródłowych, brak zgadywania kraju, równe opisy różnych ofert, konflikty pomiędzy źródłami i ich status w cyklu życia. Wszystkie żądania adaptera w testach obsługuje zamknięty fetcher fixture'ów; nie uruchomiono skanowania dostawców.

Pełny zestaw przed ostatnim dodatkowym przypadkiem na Node 24.22.1 i Node 22.23.4: 249/249 przypadków w 41 plikach, TypeScript PASS. Końcowy zestaw obejmuje 251 przypadków; jego wynik wraz z buildem jest zapisany w dołączonym `VERIFICATION.json`. Repozytorium wymaga Node 22; do jego kontroli przygotowano odrębny tymczasowy runtime, bez zmian zależności projektu i pliku blokady.

Pozostało: rzeczywisty ponowny odczyt Vaia w dozwolonych warunkach, rozstrzygnięcie obu publikacji u pierwotnego wystawcy, aktualność rekrutacji, ewentualne przypisanie dawnych notatek po rozdzieleniu ID oraz przyszła autoryzowana integracja/publikacja. Blokowane źródła nie zostały obejściem „naprawione”.
