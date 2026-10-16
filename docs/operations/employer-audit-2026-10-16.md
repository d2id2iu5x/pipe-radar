# Dalsza kontrola Poloniusz i Simona — 16.10.2026

Ręcznie sprawdzono dwie oferty pozostawione jako nierozstrzygnięte w poprzednim audycie. Baza: `58955de1421aec3520a1309846743da86fe444a4`. Nie uruchamiano skanera, API ofert pracy ani wysyłania zgłoszeń.

## Simona Stadpipe — archiwum

Rekord `simona-pipefitter` odpowiada ogłoszeniu o monterze rur do projektów akwakultury. Dawny [adres angielski](https://www.simona-stadpipe.com/en/career/industrial-construction-pipefitter-rotational-work/) i odnaleziona [wersja norweska](https://www.simona-stadpipe.com/karriere/industrirorlegger-anleggsrorlegger-i-rotasjon/) nie są już dostępne. Sam błąd strony nie był podstawą archiwizacji.

[Bieżąca strona firmy](https://www.simona-stadpipe.com/oppdateringer/) przyjmuje zgłoszenia ogólne. Nie potwierdza to wznowienia tej konkretnej publikacji. Indeks dawnej strony pracodawcy pozwolił porównać stanowisko, zakres prac, wymagania, rotacje i osobę HR z kopiami ogłoszenia.

- [Jobbsafari](https://jobbsafari.no/jobb/simona-stadpipe-sker-industrirrleggeranleggsrrlegger-i-rotasjon-422223): odczyt w przeglądarce potwierdza publikację 27.05.2026, termin 15.06.2026 i wyłączony przycisk „Søknadsperioden er avsluttet”.
- [Lønna](https://www.lonna.no/en/stillinger/72d6a21f-0caa-4d43-8681-954878f70d3c): identyczna oferta ma komunikat „Job listing is inactive”.

Zarchiwizowano konkretną zakończoną publikację na podstawie zgodnych kopii i porównania z treścią strony pracodawcy. Nie twierdzimy, że firma zakończyła wszelką rekrutację. Zachowano identyfikator, oryginalny adres i wszystkie daty skanowania.

## Poloniusz / SILVERHAND 25794 — nadal niepewna

[Poloniusz](https://www.poloniusz.pl/o1-2chci6/) jest dostępny w przeglądarce, mimo wcześniejszej odpowiedzi 403 narzędzia tekstowego. Rekruter to SILVERHAND, ref.25794, Molde; publikacja 07.09.2026. Strona nadal prezentuje formularz i nie zawiera komunikatu wygaszenia.

[Wyszukiwarka Silverhand](https://silverhand.eu/oferty-pracy/?q=Monter+rur&location=no) pokazuje inną rekrutację: [Ermeto, ref.24239, okolice Ålesund](https://silverhand.eu/job/monter-rur-w-rotacji-4-2-ermeto-praca-w-rotacji-4-2-norwegia-m-k-n/). Nie utożsamiono jej z ref.25794. Brak rekordu w aktualnym katalogu nie dowodzi wygaśnięcia.

Indeks [starszej publikacji JOBS.pl](https://www.jobs.pl/pracodawca/monter-rur-ze-stali-czarnej-praca-w-rotacji-4-2-darmowe-przeloty-i-zakwaterowanie-9m-k-n09moldenorwegia0-oferta-3949249) z 13.08.2026 wskazuje wygaśnięcie. Nie rozstrzyga to późniejszej publikacji na Poloniuszu. Pracodawca końcowy nie został ujawniony, a bezpośredniego potwierdzenia zamknięcia ref.25794 u rekrutera nie znaleziono. Rekord, status `uncertain` i wszystkie daty zachowano bez zmian.

## Zakres korekty i zachowanie danych

Zmiana dotyczy wyłącznie archiwizacji Simony w bieżących danych, stanie cyklu życia i bazie awaryjnej oraz powodu archiwizacji w interfejsie. Zachowano 40 rekordów: 13 archiwalnych i 27 pozostałych; istniejący filtr Europa nadal wyklucza jeden rekord US, więc widok domyślny pokazuje 26 ofert. `lastSuccessfulScanAt` pozostaje `2026-10-16T11:21:05.205Z`.

Nie zmieniono Poloniusza, pozostałych ofert, zapisów użytkownika, reguł R27, klasyfikacji ofert, konfiguracji hostingu ani Netlify. Testy obejmują ukrycie Simony w widoku domyślnym, dostępność w archiwum, powód i adres źródła, bazę awaryjną, zachowanie notatek oraz pozostawienie Poloniusza poza archiwum. Publikacja jest przeznaczona wyłącznie dla Cloudflare Worker `pipe-radar`; znacznik commitu `[skip actions] [skip netlify]` chroni przed uruchomieniem skanera i zapasowego wdrożenia.
