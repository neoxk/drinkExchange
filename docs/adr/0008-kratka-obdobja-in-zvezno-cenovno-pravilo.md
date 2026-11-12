---
status: sprejeto
date: 2026-11-12
nadomešča: [ADR-0004](0004-strezniski-izracun-cen-s-periodicnim-opravilom.md)
---

# 30-sekundna obdobja in zvezno cenovno pravilo s padajočim donosom

## Kontekst in opis problema

Pri 30-minutnih obdobjih in pragovnem pravilu (≥ 5 enot → +5 %, 0 enot → −5 %) se je borza odzivala prepočasi: gost je spremembo videl šele po pol ure, med obdobji pa se ni zgodilo nič. Obdobje želimo skrajšati na 30 sekund. V tako kratkem obdobju pa je 5 prodanih kosov iste pijače redkost, praznih obdobij pa je veliko, zato bi pri starem pravilu cene skoraj samo padale in v nekaj minutah obtičale na `min_price`. Kako naj se cena spreminja, da bo gibanje pri kratkih obdobjih realno?

## Obravnavane možnosti

* Staro pravilo (±5 % s pragom 5 enot) pri 30-sekundnih obdobjih
* Manjši fiksni korak (npr. ≥ 1 enota → +1 %, 0 enot → −1 %)
* Zvezno pravilo: rast sorazmerna z ln(1 + enote) z zgornjo mejo, padec brez prodaje odvisen od odmika od osnovne cene

## Izid odločitve

Izbrana možnost: »Zvezno pravilo«, ker vsaka prodaja vpliva na ceno, večja prodaja vpliva bolj, a s padajočim donosom (ena velika runda ne izstreli cene), cena brez prodaje pa se najprej hitreje vrača proti osnovni ceni in šele nato počasi pada pod njo, kar je podobno vračanju tečaja proti povprečju. Fiksni korak ne loči med eno in dvajsetimi prodanimi enotami, staro pravilo pa pri kratkih obdobjih cene sistematično potiska navzdol.

Pravilo za eno obdobje (`backend/src/pricing/calculate.ts`):

* prodanih `n ≥ 1` enot → cena × (1 + min(1 % × ln(1 + n), 3 %)); npr. 1 enota +0,69 %, 5 enot +1,79 %, 10 enot +2,40 %;
* 0 enot in cena nad osnovno → −0,5 %; 0 enot in cena pri ali pod osnovno → −0,2 %;
* rezultat se zaokroži na 0,01 €; če bi zaokroževanje spremembo izničilo, se cena premakne za 0,01 € v smeri spremembe;
* cena ostane v mejah `min_price`–`max_price`.

Opravilo `node-cron` se zažene ob :00 in :30 vsake minute (UTC) in obdela predhodno obdobje. Strežniški izračun, transakcija in idempotentnost z `UNIQUE(drink_id, period_start)` ostanejo kot v ADR-0004.

### Posledice

* Dobro, ker se cena na povpraševanje odzove v največ 30 sekundah.
* Dobro, ker izračun ostane deterministična funkcija prodanih enot in osnovne cene ter ga je enostavno enotsko testirati.
* Slabo, ker je pravilo za goste manj očitno kot »±5 %«; razlago je treba prikazati v baru.
* Slabo, ker nastane 120 zapisov `PriceHistory` na pijačo na uro; graf zato prikazuje zadnjo uro namesto zadnjih 24 ur.
* Slabo, ker mora frontend pogosteje poizvedovati: cenik in graf vsakih 5 s, stran naročila vsakih 10 s (pristop iz [ADR-0007](0007-periodicno-osvezevanje-cenika.md) ostane, krajši je le interval).
* Slabo, ker ob zagonu strežnika nadoknadi samo zadnje obdobje; obdobja, ko strežnik ni tekel, se ne obračunajo.
