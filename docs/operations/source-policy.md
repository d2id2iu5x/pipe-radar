# Polityka źródeł PIPE RADAR v2.4

System pobiera wyłącznie publicznie dostępne dane oraz oficjalne API używane zgodnie z ich warunkami. Nie obchodzi CAPTCHA, logowania, `robots`, limitów ani zabezpieczeń antybotowych. Odpowiedź ochronna ma stan `blocked`, pozostaje widoczna w zbiorczym zdrowiu źródeł i nie tworzy fikcyjnych ofert.

| Źródło | Rodzaj | Punkt odkrywania | Parser | Timeout | Dozwolony stan awarii |
|---|---|---|---|---:|---|
| NAV | oficjalne API | `https://pam-stilling-feed.nav.no/api/v1/feed` | przyrostowy JSON + szczegóły aktywnych wpisów | 10 s | `blocked` bez tokenu; `partial`/`failed` przy błędzie |
| FINN | portal | dwa zapytania `www.finn.no/job/search` dla `industrirørlegger` i `pipefitter` | kanoniczne linki `/job/ad/<id>` + `JobPosting` JSON-LD | 10 s | `blocked`, `partial`, `failed` |
| Adecco | pracodawca | `https://www.adecco.com/nb-no/ledige-stillinger` | linki tego samego originu + `JobPosting` JSON-LD | 10 s | `blocked`, `partial`, `failed` |
| Simona Stadpipe | pracodawca | `https://www.simona-stadpipe.com/en/career/` | linki tego samego originu + `JobPosting` JSON-LD | 10 s | `blocked`, `partial`, `failed` |
| Soprana | pracodawca | `https://stillinger.soprana.no/` | linki tego samego originu + `JobPosting` JSON-LD | 10 s | `blocked`, `partial`, `failed` |
| MojaNorwegia | portal | `https://www.mojanorwegia.pl/ogloszenia_o_prace/` | linki tego samego originu + `JobPosting` JSON-LD | 10 s | `blocked`, `partial`, `failed` |
| Vaia | agregator | `https://talents.vaia.com/companies/moja-norwegia/` | linki tego samego originu + `JobPosting` JSON-LD | 10 s | `blocked`, `partial`, `failed` |
| Indeed | agregator | wyłącznie stabilna publiczna strona wskazana przez wpis | tryb `probe-only`; tylko publiczne dane strukturalne | 10 s | każda bramka/403/429 → `blocked` |
| Jobs.pl | portal | znany URL rekordu startowego | `unavailable` do czasu potwierdzenia stabilnego indeksu fixture'em | — | widoczne jako niedostępne |
| Poloniusz | portal | znany URL rekordu startowego | `unavailable` do czasu potwierdzenia stabilnego indeksu fixture'em | — | widoczne jako niedostępne |

Każdy adapter ma najwyżej jedną kontrolowaną próbę ponowienia dla timeoutu, 429, 502, 503 lub 504. Dane handlowe, których źródło nie podaje, pozostają jako `Nie podano`.
