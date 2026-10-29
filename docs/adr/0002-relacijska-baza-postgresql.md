---
status: sprejeto
date: 2026-10-29
---

# Relacijska podatkovna baza PostgreSQL s Prisma ORM

## Kontekst in opis problema

Podatki so izrazito povezani: naročilo pripada natakarju, vsebuje postavke, postavke se nanašajo na pijače, za vsako pijačo pa se vodi zgodovina cen. Izračun nove cene mora prebrati prodane količine in v enem koraku posodobiti `current_price` ter zapisati `PriceHistory`. Napaka (npr. delno shranjen izračun ali dvakrat obdelano obdobje) neposredno pomeni napačno ceno za goste. Kje in kako hraniti podatke, da so takšne napake preprečene na ravni baze?

## Obravnavane možnosti

* PostgreSQL (relacijska baza) s Prisma ORM
* MongoDB (dokumentna baza)
* SQLite (vgrajena relacijska baza)

## Izid odločitve

Izbrana možnost: »PostgreSQL s Prisma ORM«, ker ponuja transakcije ACID, tuje ključe, omejitve `CHECK` (npr. `min_price <= current_price <= max_price`) in enolične indekse (`UNIQUE(drink_id, period_start)`), s katerimi baza sama zagotavlja pravila iz [03 – Podatkovni model](../03-podatkovni-model.md). Tip `NUMERIC(10,2)` omogoča natančno računanje z denarjem. Poizvedba za povpraševanje je naraven SQL `JOIN` z `GROUP BY`. MongoDB bi za enake zagotovitve zahteval več logike v aplikaciji, SQLite pa slabše podpira hkratne zapise in se razlikuje od produkcijskega okolja. Prisma prinaša tipizirane poizvedbe v TypeScriptu in sledljive migracije.

### Posledice

* Dobro, ker integritetna pravila preverja baza in jih ne more zaobiti napaka v kodi.
* Dobro, ker transakcija zagotovi, da se izračun obdobja shrani v celoti ali pa sploh ne.
* Dobro, ker migracije v repozitoriju dokumentirajo razvoj sheme.
* Slabo, ker je za lokalni razvoj potreben strežnik baze (rešujemo z Docker Compose).
* Slabo, ker Prisma nekaterih omejitev (npr. `CHECK`) ne izrazi v shemi, zato jih dodamo ročno v migracijo SQL.
* Slabo, ker spremembe sheme zahtevajo migracije, kar je počasneje kot pri dokumentni bazi.
