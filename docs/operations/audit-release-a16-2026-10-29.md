# A-16 — integracja poprawki audytu, 29.10.2026

## Zakres

Poprawkę tożsamości ofert, zachowania dowodów i statusów konfliktu z 28.10.2026 zintegrowano z nowszym commitem `534b27794830349dac1187ada7ff9c34c89b225f`. Ten commit zawierał automatyczny snapshot z 28.10.2026, 22:32:59 UTC. Nie zastąpiono go starszą kopią z paczki audytowej.

- Parser JSON-LD używa `identifier.value`, a nie nazwy wydawcy.
- Vaia rozróżnia numery ofert w URL. Zachowane są raportowane ID, kraj i lokalizacja.
- Różne jawne ID jednego dostawcy nie łączą się na podstawie podobieństwa ani za pośrednictwem trzeciego portalu.
- Nierozstrzygnięte sprzeczności tożsamości i geografii nie znikają od kolejnej obserwacji.
- Historyczny rekord `vaia:Moja Norwegia` ma status `uncertain` oraz konflikty `country` i `sourceJobId`. Korekta dotyczy tylko tych dwóch pól w bieżącej bazie, snapshotcie i stanie cyklu życia. Poprzedni snapshot, wszystkie daty, pozostałe 47 rekordów, adresy, opis oraz istniejące ID pozostały bez zmian.

## Odbiór przed publikacją

W Node.js 22.23.4 wykonano test regresji na kodzie sprzed integracji: 12 niepowodzeń i 2 sukcesy. Po integracji wszystkie 14 przypadków przechodzi. Pełny zestaw, kontrola TypeScript i kompilacja produkcyjna są obowiązkowymi bramkami tej publikacji; wyniki są zapisane w raporcie dostawy.

## Sposób publikacji

Publiczny frontend pobiera `data/jobs.json` z gałęzi `main` tego repozytorium. Publikacja poprawionej bazy działa przez aktualizację tego pliku. Kod skanera będzie użyty przez następne uruchomienie istniejącego harmonogramu. Nie zmieniono konfiguracji hostingu, sekretów, harmonogramu, frontendowego adresu danych ani kopii Netlify. Sam ten etap nie uruchamia ręcznego skanu ofert ani płatnych usług.

Nie zmienia się kod frontendu, więc publikacja A-16 nie wymaga zastępowania istniejącego Cloudflare Workera. Dostępność HTTP Workera musi być raportowana osobno od odczytu publicznej bazy i repozytorium; powodzenie push nie jest dowodem działania całego UI.

## Nadal do rozstrzygnięcia

Status rekrutacji i relacja obu publikacji Vaia pozostają niepotwierdzone. Nie zmieniono `US / Wind Lake` na odgadywane miejsce pracy. Stare wspólne ID zachowano dla notatek użytkownika; przypisanie tych notatek do nowych odrębnych ID wymaga wskazania właściwej publikacji. Testy parsera używają jawnie syntetycznych danych i nie zastępują odczytu żywego źródła.
