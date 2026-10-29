---
status: sprejeto
date: 2026-10-29
---

# Strežniški izračun cen s periodičnim opravilom na 30 minut

## Kontekst in opis problema

Jedro aplikacije je borzni mehanizem: cena pijače se spremeni glede na prodane količine. Izračun mora biti enoten za vse uporabnike, odporen na zlorabo in ponovljiv (isto obdobje se ne sme obračunati dvakrat, tudi če se strežnik ponovno zažene). Kje in kdaj naj se izračun izvaja?

## Obravnavane možnosti

* Periodično opravilo na strežniku (`node-cron`) na mejah 30-minutnih obdobij
* Sprotni izračun ob vsakem zaključenem naročilu
* Izračun v odjemalcu (brskalniku) ob prikazu cenika
* Ročni sprožilec, ki ga upravitelj zažene po potrebi

## Izid odločitve

Izbrana možnost: »Periodično opravilo na strežniku«, ker diskretna obdobja dajo gostom predvidljive, berljive »tečaje« in jasno pravilo (≥ 5 enot → +5 %, 0 enot → −5 %). Sprotni izračun bi cene spreminjal prepogosto in otežil razumevanje pravila, izračun v odjemalcu bi omogočal manipulacijo in neenake cene na različnih napravah, ročni sprožilec pa ni zanesljiv. Opravilo obdela predhodno zaključeno obdobje `[period_start, period_end)` v eni transakciji; enolični ključ `UNIQUE(drink_id, period_start)` v `PriceHistory` zagotavlja idempotentnost.

### Posledice

* Dobro, ker je izračun deterministična funkcija prodanih količin in ga je enostavno enotsko testirati.
* Dobro, ker ponovni zagon opravila ne povzroči dvojnega dviga ali padca cene.
* Dobro, ker vsak izračun pusti zapis v `PriceHistory`, ki napaja graf zgodovine.
* Slabo, ker se cena odzove na povpraševanje šele ob koncu obdobja (do 30 minut zamika).
* Slabo, ker je opravilo vezano na proces backenda; če ta ne teče, se obdobje ne obračuna (glej [ADR-0006](0006-ena-instanca-backenda-v-mvp.md)).
* Slabo, ker je potrebna dosledna uporaba UTC, da meje obdobij niso odvisne od časovnega pasu.
