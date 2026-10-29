---
status: sprejeto
date: 2026-10-29
---

# Ločen React frontend in REST API na strežniku

## Kontekst in opis problema

DrinkExchange ima tri vrste uporabnikov (gost, natakar, upravitelj) z različnimi pogledi: javni borzni cenik z grafi, vnos naročil med strežbo in upravljanje ponudbe. Vsi pogledi morajo uporabljati ista poslovna pravila (zaklepanje cen, izračun povpraševanja, preverjanje vlog). Kako razdeliti aplikacijo, da pravila ostanejo na enem mestu, uporabniški vmesnik pa je dovolj interaktiven za sprotni prikaz cen in grafov?

## Obravnavane možnosti

* Enostranska aplikacija (SPA) v Reactu + ločen REST API (Node.js, Express)
* Strežniško upodabljanje (Express + predloge, npr. EJS) v enem monolitu
* Ogrodje s polnim skladom (npr. Next.js s strežniškimi akcijami)

## Izid odločitve

Izbrana možnost: »SPA v Reactu + ločen REST API«, ker jasno loči predstavitveni sloj od poslovne logike: vsa pravila (cena postavke, vloge, izračun cen) so v API-ju in veljajo enako za vsak odjemalec, tudi za morebiten kasnejši celozaslonski prikaz v baru ali naročanje prek QR-kod (nadgradnji 4 in 5). React omogoča interaktiven cenik z grafi (Recharts) brez ponovnega nalaganja strani. Strežniško upodabljanje bi grafe in periodično osveževanje otežilo, Next.js pa bi zabrisal mejo med odjemalcem in strežnikom ter prinesel dodatno kompleksnost, ki je v MVP ne potrebujemo.

### Posledice

* Dobro, ker so poslovna pravila na enem mestu in jih je mogoče testirati neodvisno od vmesnika (Vitest + Supertest).
* Dobro, ker lahko frontend in backend razvijamo in poganjamo ločeno (`frontend/`, `backend/`).
* Dobro, ker lahko API brez sprememb uporabijo novi odjemalci.
* Slabo, ker potrebujemo dva projekta, dve konfiguraciji gradnje in usklajevanje oblike podatkov (tipi v TypeScriptu se ne delijo samodejno).
* Slabo, ker moramo urediti CORS oziroma posredovanje zahtev ter zaščito pred CSRF za piškotne seje (glej [ADR-0005](0005-seje-v-piskotkih-in-rbac.md)).
* Slabo, ker je SPA manj prijazna za iskalnike – za aplikacijo v baru to ni pomembno.
