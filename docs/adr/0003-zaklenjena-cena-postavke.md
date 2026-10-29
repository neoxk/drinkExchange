---
status: sprejeto
date: 2026-10-29
---

# Zaklepanje cene na postavki naročila

## Kontekst in opis problema

Cene pijač se spreminjajo vsakih 30 minut. Natakar lahko naročilo ustvari pred spremembo cene in ga zaključi po njej. Katero ceno mora gost plačati in kako zagotoviti, da poznejša sprememba cene ali urejanje ponudbe ne spremeni zneska že evidentiranih in zaključenih naročil?

## Obravnavane možnosti

* Kopija cene (`unit_price`) na postavki ob dodajanju v naročilo
* Cena se izračuna ob zaključku naročila iz `Drink.current_price`
* Cena se ob prikazu izračuna iz `PriceHistory` glede na čas dodajanja postavke

## Izid odločitve

Izbrana možnost: »Kopija cene na postavki ob dodajanju«, ker gost dobi ceno, ki jo je videl ob naročilu, in znesek naročila ostane nespremenljiv ne glede na poznejše tečaje. Cena ob zaključku bi gosta presenetila (cena se lahko med strežbo zviša), izračun iz zgodovine pa bi bil zapleten, krhek (zgodovina je po obdobjih, ne po trenutkih) in počasen. Ceno vedno prebere strežnik iz baze; vrednosti, ki jo pošlje odjemalec, ne upoštevamo.

### Posledice

* Dobro, ker je znesek naročila stabilen in revizijsko sledljiv; poročila o prodaji (funkcionalnost 12) uporabijo dejanske cene.
* Dobro, ker so zaključena naročila nespremenljiva, kar poenostavi logiko in preverjanje.
* Dobro, ker odjemalec ne more vplivati na obračunano ceno.
* Slabo, ker je cena podvojena (v `Drink` in v `OrderItem`), kar je namerna denormalizacija.
* Slabo, ker lahko gost dobi staro (nižjo) ceno, če natakar postavko doda tik pred dvigom in naročilo zaključi pozneje – to sprejemamo kot poslovno pravilo.
