---
status: sprejeto
date: 2026-10-29
---

# Periodično osveževanje javnega cenika namesto sprotnih povezav

## Kontekst in opis problema

Gostje in zasloni v baru morajo videti nove cene kmalu po izračunu. Cene se spremenijo največ enkrat na 30 minut, poleg tega se ob zaključku obdobja hkrati spremenijo vse pijače. Kako naj frontend izve za nove cene?

## Obravnavane možnosti

* Periodično poizvedovanje (polling) `GET /api/drinks` približno vsako minuto
* WebSocket povezava (npr. Socket.IO), strežnik pošlje nove cene
* Server-Sent Events (SSE)

## Izid odločitve

Izbrana možnost: »Periodično poizvedovanje vsako minuto«, ker pri spremembah na 30 minut pomeni največ minuto zamika, kar je za goste sprejemljivo, hkrati pa ne zahteva dodatne strežniške infrastrukture, upravljanja povezav ali ponovnega povezovanja. Uporablja isti javni REST endpoint kot prvi prikaz strani, zato ni dodatne logike. WebSocket in SSE bi bila smiselna pri pogostejših spremembah; sprotno posodabljanje je zato načrtovano kot kasnejša nadgradnja in bo, ko bo uvedeno, opisano v novem ADR, ki bo nadomestil tega.

### Posledice

* Dobro, ker je rešitev preprosta, brez stanja in deluje z obstoječim REST API-jem.
* Dobro, ker je odgovor javnega cenika mogoče predpomniti.
* Slabo, ker nova cena na zaslonu zamuja do ene minute.
* Slabo, ker odjemalci pošiljajo zahteve, tudi ko se nič ne spremeni (pri obsegu enega bara zanemarljivo).
