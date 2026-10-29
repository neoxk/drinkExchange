---
status: sprejeto
date: 2026-10-29
---

# Ena instanca backenda z vgrajenim cenovnim opravilom v MVP

## Kontekst in opis problema

Cenovno opravilo ([ADR-0004](0004-strezniski-izracun-cen-s-periodicnim-opravilom.md)) se mora za vsako obdobje izvesti natanko enkrat. Če bi teklo več instanc backenda, bi vsaka sprožila svoje opravilo. Obremenitev enega bara je majhna (nekaj natakarjev in zaslonov). Ali v MVP potrebujemo ločen proces za opravila in porazdeljeno zaklepanje?

## Obravnavane možnosti

* Ena instanca backenda, opravilo teče v istem procesu kot API
* Ločen proces (worker) za opravila in čakalna vrsta (npr. Redis + BullMQ)
* Več instanc API-ja s porazdeljenim zaklepom (npr. PostgreSQL advisory lock)

## Izid odločitve

Izbrana možnost: »Ena instanca backenda«, ker za obseg enega bara zadošča in bistveno poenostavi razvoj, zagon in testiranje. Ločen worker in čakalna vrsta bi dodala novo infrastrukturo (Redis) brez koristi za MVP. Kot varovalo že zdaj uporabljamo transakcijo in enolični ključ `UNIQUE(drink_id, period_start)`, zato tudi nehoten dvojni zagon ne pokvari cen. Ob skaliranju bomo opravilo ločili v samostojen proces z zaklepanjem v bazi in to zapisali v novem ADR, ki bo nadomestil tega.

### Posledice

* Dobro, ker je zagon preprost (en `npm run dev`) in ni dodatnih storitev razen baze.
* Dobro, ker idempotentnost na ravni baze omogoča kasnejši prehod brez spremembe podatkovnega modela.
* Slabo, ker je backend ena točka odpovedi: med izpadom ni API-ja niti izračuna cen.
* Slabo, ker obdobja, zamujena med izpadom, ostanejo neobračunana (nadoknadenje ni del MVP).
* Slabo, ker horizontalno skaliranje API-ja ni mogoče brez nove odločitve.
