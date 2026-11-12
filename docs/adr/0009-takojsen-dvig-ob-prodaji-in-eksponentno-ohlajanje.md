---
status: sprejeto
date: 2026-11-12
nadomešča: [ADR-0008](0008-kratka-obdobja-in-zvezno-cenovno-pravilo.md)
---

# Takojšen dvig cene ob prodaji in eksponentno ohlajanje

## Kontekst in opis problema

Tudi pri 30-sekundnih obdobjih (ADR-0008) borza ni zanimiva za spremljanje: naročilo ceno premakne šele ob koncu obdobja, torej z zamikom do 30 sekund, brez prodaje pa cena pada z enakim korakom, kar na grafu izriše ravno žago in ne spominja na gibanje tečaja. Ker je večina 30-sekundnih obdobij brez prodaje, cene poleg tega sistematično drsijo proti `min_price`. Kako naj se cena odzove na naročilo takoj in kako naj pada, da bo gibanje videti realno?

## Obravnavane možnosti

* Še krajša obdobja (npr. 5 s) z istim pravilom
* Dogodkovni model: prodaja ceno dvigne takoj, med prodajami se cena ohlaja sorazmerno z odmikom (eksponentno)
* Dogodkovni model z naključnim šumom in navzkrižnim vplivom (prodaja ene pijače zniža druge)

## Izid odločitve

Izbrana možnost: »Dogodkovni model z eksponentnim ohlajanjem«, ker gost dvig vidi v trenutku naročila, padec pa je tak kot pri tečaju po skoku: sprva hiter, nato vse počasnejši. Krajša obdobja ne odpravijo zamika in ravne žage. Šum in navzkrižni vpliv bi gibanje še popestrila, vendar cena potem ne bi bila več razložljiva samo s prodajo; po potrebi ju dodamo pozneje.

Pravilo (`backend/src/pricing/calculate.ts`):

* **Prodaja** (zaključek naročila z `n` enotami pijače) → cena takoj × (1 + min(2 % × ln(1 + n), 6 %)); npr. 1 enota +1,39 %, 5 enot +3,58 %, 10 enot +4,80 %. Skok je vsaj 0,01 € in največ do `max_price`.
* **Ohlajanje nad osnovno ceno** → odmik od osnovne cene se razpolovi vsake 3 minute (pijača pri 5,00 € z osnovno ceno 4,00 € je po 3 minutah pri 4,50 €, po 6 minutah pri 4,25 €).
* **Ohlajanje pri ali pod osnovno ceno** → odmik od `min_price` se razpolovi vsakih 30 minut; pijača brez povpraševanja se počasi ceni, dokler je kdo ne naroči.
* Cena je zaokrožena na 0,01 € in ostane v mejah `min_price`–`max_price`.

Izvedba:

* Dvig se zgodi v isti transakciji kot zaključek naročila (`applySale`); vrstice pijač so zaklenjene (`SELECT … FOR UPDATE`), zato se hkratne prodaje seštejejo.
* Ohlajanje izvaja opravilo `node-cron` vsakih 5 sekund (`coolPrices`). Nova cena je funkcija trenutne cene in časa od zadnje spremembe (`Drink.price_updated_at`), ne števila zagonov. Ponovni, hkratni ali zamujeni zagon zato ne pokvari cen, po izpadu strežnika pa se ob zagonu nadoknadi ves pretečeni čas.
* `PriceHistory` je dnevnik sprememb: vrstica nastane ob vsaki prodaji in ob vsaki spremembi cene zaradi ohlajanja (`changed_at` namesto `period_start`, brez enoličnega ključa na obdobje).
* Sprememba na ceniku je razlika do cene pred 5 minutami.
* Cenik in graf poizvedujeta vsaki 2 s, stran naročila vsakih 5 s (pristop iz [ADR-0007](0007-periodicno-osvezevanje-cenika.md) ostane, krajši je le interval); cena ob spremembi zasveti zeleno ali rdeče.

### Posledice

* Dobro, ker se cena na naročilo odzove takoj in je cenik zanimiv za spremljanje.
* Dobro, ker je pri enakomerni prodaji cena v ravnovesju nad osnovno ceno (pri eni enoti na minuto približno +6 %), namesto da bi drsela proti `min_price`.
* Dobro, ker izračun ostane deterministična funkcija (cena, prodane enote, pretečeni čas) in ga je enostavno enotsko testirati.
* Dobro, ker ni več izgubljenih obdobij ob izpadu strežnika.
* Slabo, ker več manjših naročil ceno dvigne bolj kot eno veliko z enako količino (ln je subaditiven).
* Slabo, ker zaključek naročila zdaj zaklepa vrstice pijač; pri eni instanci backenda (ADR-0006) to ni ozko grlo.
* Slabo, ker je število zapisov `PriceHistory` odvisno od prometa (do ene vrstice na pijačo vsakih 5 s med ohlajanjem) in ker odjemalci poizvedujejo pogosteje.
