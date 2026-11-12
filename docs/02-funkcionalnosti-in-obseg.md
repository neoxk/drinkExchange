# 02 – Funkcionalnosti in obseg

## Uporabniške vloge in pravice

| Vloga | Kaj lahko počne | Česa ne sme početi |
|---|---|---|
| **Gost** (neprijavljen) | Spremlja aktualni cenik, trend in zgodovino cen. | Ne more vnašati ali spreminjati naročil, cen, pijač ali uporabniških računov. |
| **Natakar** (prijavljen) | Ustvari naročilo, doda postavke, zaključi ali prekliče svoja odprta naročila in vidi veljavni cenik. | Ne more spreminjati cenovnih pravil, urejati kataloga pijač ali upravljati uporabnikov. |
| **Upravitelj** (prijavljen) | Upravlja katalog pijač in omejitve cen, spremlja prodajo, pregleduje naročila in upravlja račune natakarjev. | Ne more ročno spreminjati že zaklenjenih cen na postavkah zaključenih naročil ali brisati zgodovine cen. |

Gost nima uporabniškega računa. Račune natakarjev in upraviteljev ustvari upravitelj oziroma začetni administratorski skript. API preverja vlogo na strežniku, ne zgolj v uporabniškem vmesniku.

## Predvidene funkcionalnosti (12)

| # | Funkcionalnost | MVP | Opis |
|---|---|---|---|
| 1 | Javni borzni cenik | **MVP** | Gost vidi trenutno ceno, osnovno ceno in spremembo v zadnjih 5 minutah za vsako aktivno pijačo. |
| 2 | Evidentiranje naročil pri natakarju | **MVP** | Natakar izbira pijače in količine; pri dodajanju postavke sistem shrani veljavno ceno. |
| 3 | Zaključevanje in preklic naročil | **MVP** | Samo zaključena naročila vplivajo na povpraševanje; preklicana ne. |
| 4 | Samodejni borzni izračun cen | **MVP** | Prodaja ceno takoj zviša, med prodajami se cena ohlaja proti osnovni ceni; vedno ostane v cenovnih mejah. |
| 5 | Zgodovina in trend cen | **MVP** | Gost vidi zadnjo uro sprememb za posamezno pijačo. |
| 6 | Upravljanje ponudbe in cenovnih omejitev | **MVP** | Upravitelj določi aktivne pijače, osnovne cene ter dovoljeni minimum in maksimum. |
| 7 | Prijava zaposlenih in dovoljenja po vlogah | **MVP** | Natakar in upravitelj dostopata le do dovoljenih funkcij. |
| 8 | Pregled najbolj prodajanih pijač | Ne | Upravitelj spremlja razvrstitev po prodani količini v izbranem obdobju. |
| 9 | Prikaz borznega indeksa bara | Ne | Skupen kazalnik povprečnega odstotnega gibanja cen vseh aktivnih pijač. |
| 10 | Filtriranje ponudbe po kategorijah | Ne | Gost filtrira pijače, npr. brezalkoholne, pivo in koktajli. |
| 11 | Simulacija gibanja cen | Ne | Upravitelj lahko s testnimi količinami preveri predvideno novo ceno brez spremembe podatkov. |
| 12 | Izvoz poročila o prodaji | Ne | Upravitelj izvozi seznam zaključenih naročil v CSV. |

**MVP: 7 funkcionalnosti.** Domensko specifične so zlasti št. 1, 4 in 5 (tudi 6 je prilagojena borznemu modelu). Osnovni delovni proces je: **ustvari naročilo → zakleni cene postavk → zaključi naročilo → takoj zvišaj in zabeleži cene → ohlajaj cene → prikaži nove tečaje**.

### Pravila prve različice
- Cena se zviša **takoj ob zaključku naročila**; odprta in preklicana naročila nanjo ne vplivajo ([ADR-0009](adr/0009-takojsen-dvig-ob-prodaji-in-eksponentno-ohlajanje.md)).
- Če naročilo vsebuje **n** enot pijače, se njena cena pomnoži z **1 + min(0,02 × ln(1 + n), 0,06)** in se zviša vsaj za 0,01 €.
- Brez prodaje se cena **ohlaja**: nad osnovno ceno se odmik od nje razpolovi vsake **3 minute**, pri ali pod njo se odmik od `min_price` razpolovi vsakih **30 minut**. Ohlajanje se preračuna vsakih 5 sekund (strežniški čas, UTC).
- Cena se zaokroži na **0,01 €** in ne sme pasti pod `min_price` ali preseči `max_price`.
- Ohlajanje je odvisno samo od časa od zadnje spremembe cene; ponovni ali zamujeni zagon opravila ne povzroči dodatnega padca.
- Zaključena naročila so nespremenljiva. Plačevanje se opravi zunaj aplikacije.

## Kasnejše nadgradnje
1. Sprotno posodabljanje cen preko WebSocket povezave namesto periodičnega osveževanja strani.
2. Načrtovani »borzni zlom« (posebni časovno omejeni popusti).
3. Naprednejši algoritem, ki upošteva tudi primerjavo s povprečno prodajo.
4. QR-kode za posamezne mize in samostojno oddajanje naročil gostov.
5. Interaktivni zaslon za bar s celozaslonskim prikazom tečajev.
6. Več lokalov pod eno uporabniško organizacijo.
7. Obveščanje gostov o doseženi želeni ceni.

## Izven obsega (out of scope)
- Spletno plačevanje, blagajniško potrjevanje računov ali fiskalizacija.
- Samostojno naročanje gostov in dostava na mizo (v MVP naročilo vnese natakar).
- Integracija z dejanskimi borzami, kriptovalutami ali finančnimi naložbami.
- Upravljanje zalog, dobaviteljev in nabavnih cen.
- Mobilna aplikacija za Android ali iOS (namesto nje je predviden odziven spletni vmesnik).
- Večlokacijsko upravljanje in napredna analitika v prvi različici.
