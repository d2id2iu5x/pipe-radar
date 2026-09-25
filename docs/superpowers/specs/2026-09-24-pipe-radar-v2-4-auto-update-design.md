# PIPE RADAR v2.4 — automatyczna aktualizacja ofert

Data: 24.09.2026  
Status: projekt zatwierdzony koncepcyjnie, oczekuje na odbiór specyfikacji

## 1. Cel

PIPE RADAR v2.4 ma zastąpić ręcznie osadzoną bazę ofert mechanizmem, który cztery razy dziennie pobiera dostępne ogłoszenia, sprowadza je do jednego formatu, usuwa duplikaty, aktualizuje statusy i publikuje ostatnią poprawną bazę przez API działające na Netlify.

Produkt pozostaje narzędziem decyzyjnym dla osób przeglądających oferty pracy w branży rurociągowej. System ma wyraźnie odróżniać dane potwierdzone, niepełne i niepewne. Nie może dopowiadać brakującej stawki, rotacji, zakwaterowania ani transportu.

## 2. Zakres źródeł

Pierwsze wydanie obsługuje szeroki skan źródeł występujących już w PIPE RADAR:

- NAV / Arbeidsplassen;
- FINN;
- Indeed;
- Jobs.pl;
- Poloniusz;
- MojaNorwegia;
- Adecco;
- Simona Stadpipe;
- Soprana;
- publiczne strony pracodawców.

„Wszystkie portale” oznacza szerokie pokrycie technicznie i prawnie dostępnych źródeł, a nie gwarancję pobierania całego Internetu. System nie obchodzi CAPTCHA, logowania, blokad antybotowych ani ograniczeń dostępu. Źródło niedostępne automatycznie pozostaje widoczne jako wymagające ręcznej kontroli.

## 3. Architektura

Rozwiązanie wykorzystuje Netlify Functions oraz Netlify Blobs:

1. Funkcja harmonogramowa uruchamia skan cztery razy dziennie.
2. Skan w tle wywołuje niezależne adaptery źródeł.
3. Adaptery zwracają dane w jednym kontrakcie wejściowym.
4. Warstwa normalizacji oczyszcza dane, filtruje oferty branżowe i przelicza pola porównawcze.
5. Warstwa deduplikacji łączy tę samą ofertę znalezioną w kilku miejscach.
6. Warstwa cyklu życia nadaje statusy i archiwizuje oferty zgodnie z regułami.
7. Walidator decyduje, czy nowy snapshot może zastąpić poprzedni.
8. Ostatni poprawny snapshot i raport skanu są zapisywane w trwałym, site-scoped Netlify Blobs.
9. Publiczna funkcja API udostępnia tylko zwalidowany snapshot.
10. Interfejs v2.4 pobiera snapshot przy uruchomieniu i zachowuje lokalną bazę startową jako awaryjną.

Każdy adapter jest oddzielnym modułem. Awaria lub zmiana HTML jednego portalu nie może przerwać skanowania pozostałych źródeł.

## 4. Przepływ danych

Każdy skan przechodzi przez następujące stany:

`pobranie → parsowanie → filtrowanie branżowe → normalizacja → deduplikacja → aktualizacja cyklu życia → walidacja → zapis snapshotu`

Słowa wyszukiwania obejmują polskie, angielskie i norweskie określenia zawodu i specjalizacji, między innymi: monter rurociągów, pipefitter, pipe fitter, industrirørlegger, rørlegger, piping, prefabrykacja, shipyard i stocznia. Lista ma być konfigurowalna bez zmiany logiki skanera.

Skanowanie źródeł odbywa się równolegle z osobnymi limitami czasu. Wynik pojedynczego adaptera ma status `success`, `partial`, `blocked` albo `failed`.

## 5. Model oferty

Znormalizowana oferta zawiera co najmniej:

- stabilny identyfikator;
- tytuł stanowiska;
- nazwę firmy;
- kraj i lokalizację;
- rodzaj zatrudnienia;
- rotację w wersji źródłowej i znormalizowanej;
- stawkę w wersji źródłowej oraz możliwą do porównania wartość liczbową;
- informacje o zakwaterowaniu i transporcie;
- wymagania oraz umiejętności;
- główne źródło i wszystkie alternatywne źródła;
- adres oryginalnego ogłoszenia;
- typ źródła: pracodawca, oficjalne API, portal albo agregator;
- poziom wiarygodności źródła;
- datę publikacji, jeżeli źródło ją podaje;
- `firstSeenAt`, `lastSeenAt` i `lastVerifiedAt`;
- liczbę kolejnych udanych skanów, w których oferty nie znaleziono;
- status: `new`, `active`, `uncertain` albo `archived`;
- tagi i wynik FIT wraz z uzasadnieniem.

Brak informacji jest zapisywany jawnie jako brak danych. System nie tworzy szacunków nieoznaczonych jako przybliżenia.

## 6. Deduplikacja

Deduplikacja wykorzystuje w kolejności:

1. kanoniczny adres URL lub identyfikator źródłowy;
2. znormalizowaną kombinację firmy, stanowiska i lokalizacji;
3. podobieństwo kluczowych danych, gdy dwa portale publikują kopię tego samego ogłoszenia.

Po połączeniu zachowywane są wszystkie adresy źródłowe. Pierwszeństwo danych mają kolejno: strona pracodawcy, oficjalne API, portal ogłoszeniowy, agregator. Sprzeczności nie są rozstrzygane przez zgadywanie; oferta otrzymuje oznaczenie wymagające weryfikacji.

## 7. Cykl życia i archiwizacja

- Oferta jest `new` przez 72 godziny od pierwszego wykrycia.
- Potwierdzona obecność ustawia `active` i zeruje licznik nieobecności.
- Jednoznaczny status `INACTIVE`, `EXPIRED`, `DELETED` albo komunikat źródła o wygaśnięciu usuwa ofertę z publicznych aktywnych wyników natychmiast. Dla NAV system zachowuje po takim zdarzeniu wyłącznie techniczne metadane cyklu życia potrzebne do deduplikacji i audytu; nie republikuje nieaktywnej treści ogłoszenia.
- Częściowy lub nieudany skan nie zwiększa licznika nieobecności.
- Gdy źródło nie udostępnia jednoznacznego statusu, oferta jest archiwizowana po nieobecności w trzech kolejnych udanych skanach właściwego źródła.
- Gdy źródło jest długotrwale niedostępne, oferta otrzymuje `uncertain`, a nie `archived`.
- Snapshot zachowuje oferty archiwalne, aby filtry i historia nadal działały.

## 8. FIT i jakość danych

Istniejąca heurystyka FIT pozostaje jawna i nie może być przedstawiana jako prawdopodobieństwo zatrudnienia. Mechanizm v2.4 przelicza FIT dopiero po normalizacji danych.

Walidacja snapshotu odrzuca zapis, gdy wystąpi co najmniej jeden z warunków:

- wynik ma nieprawidłowy format;
- wszystkie adaptery zakończyły się błędem;
- liczba ofert spadła w sposób wskazujący na awarię parserów, bez wiarygodnych potwierdzeń archiwizacji;
- brakuje metadanych skanu;
- oferty nie posiadają źródła lub stabilnego identyfikatora.

Odrzucony snapshot nie zastępuje ostatniej poprawnej bazy.

## 9. Przechowywanie

Site-scoped Netlify Blobs przechowuje:

- `snapshots/latest` — ostatnią poprawną bazę;
- `snapshots/previous` — poprzednią poprawną bazę do szybkiego wycofania;
- `reports/latest` — raport ostatniego skanu;
- `state/lifecycle` — liczniki obecności i nieobecności ofert;
- `locks/scan` — blokadę zapobiegającą równoległym skanom.

Zapis snapshotu używa silnej spójności. Najpierw zapisywany jest kompletny kandydat, a dopiero po walidacji wskaźnik `latest` jest aktualizowany.

## 10. API

Publiczny endpoint `GET /api/jobs` zwraca:

- zwalidowaną listę ofert;
- czas ostatniego udanego skanu;
- czas wygenerowania snapshotu;
- status ogólny: `fresh`, `partial` albo `fallback`;
- zbiorcze informacje o stanie źródeł;
- wersję schematu danych.

Endpoint nie uruchamia skanu. Przycisk w interfejsie pobiera najnowszy zapisany snapshot, dzięki czemu publiczny użytkownik nie może generować kosztownych operacji.

Szczegółowe raporty, komunikaty parserów i dane diagnostyczne nie są publicznie ujawniane.

## 11. Interfejs użytkownika

Strona automatycznie pobiera `/api/jobs` przy uruchomieniu. Widoczny status przyjmuje jedną z czterech postaci:

- `DANE AKTUALNE` — ostatni skan zakończył się prawidłowo;
- `DANE CZĘŚCIOWE` — snapshot jest użyteczny, ale część źródeł nie odpowiedziała;
- `KOPIA AWARYJNA` — API zwraca ostatni poprawny snapshot po nieudanym skanie;
- `TRYB LOKALNY` — API jest niedostępne i używana jest baza dołączona do aplikacji.

Interfejs pokazuje czas ostatniego udanego skanu, liczbę działających źródeł oraz zwijany panel ich stanu. Każda karta pokazuje datę ostatniego potwierdzenia i typ źródła.

Przycisk `Pobierz najnowszą bazę` ponawia pobranie snapshotu. Nie uruchamia skanowania.

Lokalne dane użytkownika — profil FIT, zapisane oferty, notatki, status aplikacji i follow-upy — zachowują obecne klucze oraz pozostają niezależne od aktualizacji bazy.

## 12. Obsługa błędów

- Adaptery mają niezależne timeouty i maksymalnie jedną kontrolowaną próbę ponowienia.
- Błąd jednego adaptera jest rejestrowany, ale nie przerywa całego skanu.
- Źródło z CAPTCHA lub blokadą otrzymuje `blocked`; system nie próbuje omijać zabezpieczenia.
- Niepełne dane są akceptowane tylko wtedy, gdy zachowane jest źródło i podstawowa tożsamość oferty.
- Brak API w przeglądarce uruchamia bazę lokalną bez utraty funkcji decyzyjnych.
- Równoległy skan jest pomijany dzięki blokadzie z czasem wygaśnięcia.

## 13. Harmonogram

Skan ma działać co sześć godzin według cron `0 */6 * * *`, czyli około 00:00, 06:00, 12:00 i 18:00 UTC. Krótka funkcja harmonogramowa uruchamia funkcję tła, ponieważ pełne skanowanie wielu źródeł nie mieści się bezpiecznie w limicie funkcji harmonogramowej. Funkcja tła zapisuje rezultat w Netlify Blobs.

Harmonogram działa wyłącznie na opublikowanej wersji produkcyjnej. W środowisku podglądowym skan uruchamia się kontrolowanym mechanizmem testowym, chronionym przed publicznym użyciem.

## 14. Testy

### Testy jednostkowe

- parser i normalizator każdego adaptera na zapisanych, nieszkodliwych fixture'ach;
- przeliczanie stawki i rotacji;
- deduplikacja;
- priorytet źródeł;
- cykl życia oraz reguła trzech udanych nieobecności;
- zachowanie brakujących danych;
- przeliczanie FIT.

### Testy integracyjne

- pełny skan z odpowiedziami kontrolowanymi;
- awaria jednego i wielu źródeł;
- timeout, błędny HTML, pusta odpowiedź i limit HTTP;
- odrzucenie wadliwego snapshotu;
- zapis i odczyt Netlify Blobs;
- zachowanie poprzedniej bazy po błędzie.

### Testy interfejsu

- cztery stany świeżości danych;
- ręczne ponowienie pobrania snapshotu;
- zachowanie filtrów, porównywarki i kalkulatora;
- ochrona lokalnych danych użytkownika;
- widok komputerowy i mobilny.

### Test odbiorczy na Netlify

1. Opublikować wersję podglądową.
2. Wykonać kontrolowany skan.
3. Potwierdzić zapis nowego snapshotu.
4. Potwierdzić pojawienie się nowej oferty bez ponownego wdrożenia strony.
5. Zasymulować awarię jednego źródła.
6. Potwierdzić status częściowy i zachowanie danych.
7. Sprawdzić brak regresji funkcji v2.3.1.
8. Dopiero wtedy opublikować wersję produkcyjną.

## 15. Kryteria ukończenia

Wersja v2.4 jest ukończona, gdy:

- harmonogram i skan w tle działają na produkcyjnym Netlify;
- nowa oferta może pojawić się bez ręcznego wdrożenia;
- snapshot przechodzi walidację i jest trwale zapisywany;
- pojedyncza awaria źródła nie powoduje przerwy w działaniu;
- duplikaty są łączone;
- archiwizacja respektuje trzy kolejne udane skany;
- tryb awaryjny działa;
- stan źródeł i czas aktualizacji są prawdziwe;
- osobiste dane użytkownika pozostają zachowane;
- wszystkie testy automatyczne i test odbiorczy przechodzą;
- wersja produkcyjna została zweryfikowana po wdrożeniu.

## 16. Poza zakresem v2.4

- konta użytkowników;
- płatności i monetyzacja;
- powiadomienia e-mail, SMS i push;
- automatyczne aplikowanie;
- generowanie CV lub wiadomości rekrutacyjnych;
- omijanie CAPTCHA, logowania i blokad antybotowych;
- pełnotekstowe przechowywanie cudzych ogłoszeń ponad zakres potrzebny do wyszukania i porównania;
- system administracyjny dla wielu operatorów.

## 17. Wymagania wdrożeniowe

Do uruchomienia produkcyjnego potrzebne są:

- dostęp do właściwego projektu Netlify `pipe-radar`;
- możliwość wdrożenia katalogu projektu z funkcjami;
- włączenie zależności Netlify Functions i Netlify Blobs;
- sekrety lub klucze wyłącznie dla źródeł, które oficjalnie ich wymagają;
- zatwierdzona konfiguracja harmonogramu;
- testowa wersja podglądowa przed wdrożeniem produkcyjnym.

Obecny brak zalogowanej sesji Netlify w środowisku wykonawczym blokuje dopiero publikację i test produkcyjny, a nie lokalne przygotowanie oraz sprawdzenie kodu.
