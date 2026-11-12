# 05 – Uporabniške zgodbe

Zgodbe so zapisane v obliki *Kot \<vloga\> želim \<cilj\>, da \<korist\>.* Vsaka ima kriterije sprejemljivosti in povezavo na funkcionalnost iz [02 – Funkcionalnosti in obseg](02-funkcionalnosti-in-obseg.md). Zgodbe US-01 do US-09 sodijo v MVP, US-10 do US-14 so kasnejše nadgradnje.

## MVP

### US-01 – Ogled javnega borznega cenika
**Kot** gost **želim** videti trenutne cene vseh aktivnih pijač, **da** se lahko odločim, kaj naročiti, ko je cena ugodna.
*Funkcionalnost:* #1

Kriteriji sprejemljivosti:
- Za vsako aktivno pijačo so prikazani ime, kategorija, trenutna cena, osnovna cena in sprememba v zadnjih 5 minutah (v € in %).
- Rast cene je označena drugače kot padec (barva in puščica).
- Neaktivne pijače niso prikazane.
- Cenik se samodejno osveži vsaki 2 sekundi brez ročnega osveževanja strani; cena ob spremembi zasveti zeleno ali rdeče.
- Stran deluje brez prijave in je uporabna na mobilnem telefonu.

### US-02 – Zgodovina in trend cene pijače
**Kot** gost **želim** videti, kako se je cena izbrane pijače spreminjala v zadnji uri, **da** ocenim, ali cena raste ali pada.
*Funkcionalnost:* #5

Kriteriji sprejemljivosti:
- Ob izbiri pijače se prikaže graf cen za zadnjo uro.
- Graf prikazuje vsako spremembo cene (čas, cena); prodaje so označene s piko in prodano količino.
- Če zgodovine še ni, je prikazano ustrezno sporočilo.
- Zahteva za neobstoječo ali neaktivno pijačo vrne 404.

### US-03 – Prijava in odjava zaposlenih
**Kot** zaposleni (natakar ali upravitelj) **želim** se prijaviti z e-pošto in geslom, **da** dostopam do funkcij svoje vloge.
*Funkcionalnost:* #7

Kriteriji sprejemljivosti:
- Pravilni podatki ustvarijo sejo v piškotku `HttpOnly`, `SameSite=Lax` (v produkciji `Secure`).
- Napačni podatki ali deaktiviran račun vrnejo enotno napako, ki ne razkrije, kaj je bilo narobe.
- Gesla so shranjena kot Argon2id hash.
- Po odjavi seja ni več veljavna.
- Prvega upravitelja ustvari začetni skript; javne registracije ni.

### US-04 – Dovoljenja po vlogah
**Kot** upravitelj **želim**, da ima vsak zaposleni dostop samo do funkcij svoje vloge, **da** natakarji ne morejo spreminjati cen in ponudbe.
*Funkcionalnost:* #7

Kriteriji sprejemljivosti:
- Zaščitene poti brez veljavne seje vrnejo 401, poti brez ustrezne vloge pa 403.
- Natakar vidi in ureja samo svoja naročila; upravitelj vidi vsa.
- Zahteve, ki spreminjajo podatke, so zaščitene pred CSRF.
- Frontend skrije nedovoljene strani, vendar je preverjanje vedno na strežniku.

### US-05 – Ustvarjanje naročila in dodajanje postavk
**Kot** natakar **želim** ustvariti naročilo in mu dodati pijače s količinami, **da** evidentiram, kaj je gost naročil, po ceni, ki velja v tistem trenutku.
*Funkcionalnost:* #2

Kriteriji sprejemljivosti:
- Natakar ustvari odprto naročilo (`OPEN`).
- Pri dodajanju postavke strežnik zapiše trenutno ceno pijače v `unit_price`; cene, ki jo pošlje odjemalec, ne upošteva.
- Količina mora biti celo število > 0; neaktivne pijače ni mogoče dodati.
- Kasnejša sprememba tečaja ne vpliva na že dodane postavke.
- Med vnosom je viden skupni znesek naročila.

### US-06 – Zaključevanje in preklic naročila
**Kot** natakar **želim** zaključiti ali preklicati svoje odprto naročilo, **da** se v izračunu cen upoštevajo samo dejansko prodane pijače.
*Funkcionalnost:* #3

Kriteriji sprejemljivosti:
- Zaključiti je mogoče samo odprto naročilo z vsaj eno postavko; ob tem se zapiše `completed_at`.
- Preklicano naročilo ima status `CANCELLED` in ne vpliva na povpraševanje.
- Zaključenega ali preklicanega naročila ni več mogoče spreminjati.
- Natakar lahko spreminja samo svoja naročila.

### US-07 – Samodejni borzni izračun cen
**Kot** upravitelj **želim**, da se cena ob prodaji takoj zviša in se brez prodaje sama ohlaja, **da** cene sledijo povpraševanju brez ročnega posega.
*Funkcionalnost:* #4

Kriteriji sprejemljivosti:
- Ob zaključku naročila z n enotami pijače se njena cena takoj pomnoži z 1 + min(2 % × ln(1 + n), 6 %) in se zviša vsaj za 0,01 €; odprta in preklicana naročila cene ne spremenijo.
- Opravilo vsakih 5 sekund ohladi cene: nad osnovno ceno se odmik od nje razpolovi vsake 3 minute, pri ali pod njo se odmik od `min_price` razpolovi vsakih 30 minut.
- Cena se zaokroži na 0,01 € in ostane v mejah `min_price`–`max_price`.
- Vsaka sprememba cene se zapiše v `PriceHistory` (prodaja s prodano količino, ohlajanje s količino 0).
- Ohlajanje je odvisno samo od časa od zadnje spremembe cene; ponovni ali zamujeni zagon cene ne zniža dvakrat.

### US-08 – Upravljanje ponudbe in cenovnih omejitev
**Kot** upravitelj **želim** dodajati in urejati pijače ter določati osnovno, najnižjo in najvišjo ceno, **da** nadziram ponudbo in razpon gibanja cen.
*Funkcionalnost:* #6

Kriteriji sprejemljivosti:
- Upravitelj doda pijačo z imenom, kategorijo, osnovno ceno, `min_price` in `max_price`.
- Veljati mora `0 < min_price ≤ base_price ≤ max_price`; neveljavni podatki vrnejo 400 z opisom napake.
- Pijačo je mogoče deaktivirati in znova aktivirati; deaktivirana izgine iz cenika in iz izbire pri naročilih.
- Sprememba omejitev ne spreminja zaklenjenih cen na obstoječih postavkah ali zgodovine cen.

### US-09 – Upravljanje računov in pregled naročil
**Kot** upravitelj **želim** ustvarjati in deaktivirati račune natakarjev ter pregledovati vsa naročila, **da** imam nadzor nad osebjem in prodajo.
*Funkcionalnost:* #7

Kriteriji sprejemljivosti:
- Upravitelj ustvari račun z imenom, e-pošto, začetnim geslom in vlogo; e-pošta mora biti enolična.
- Deaktiviran uporabnik se ne more prijaviti, njegove obstoječe seje pa prenehajo veljati.
- Upravitelj vidi seznam vseh naročil s filtrom po statusu, natakarju in datumu.
- Upravitelj ne more brisati zgodovine cen ali spreminjati zaklenjenih cen zaključenih naročil.

## Kasnejše nadgradnje (izven MVP)

### US-10 – Najbolj prodajane pijače
**Kot** upravitelj **želim** videti razvrstitev pijač po prodani količini v izbranem obdobju, **da** vem, kaj je najbolj priljubljeno.
*Funkcionalnost:* #8

Kriteriji sprejemljivosti:
- Izbira obdobja (danes, 7 dni, poljubno); upoštevana so samo zaključena naročila.
- Prikazani so količina, prihodek in delež prodaje.

### US-11 – Borzni indeks bara
**Kot** gost **želim** videti skupni indeks gibanja cen, **da** na prvi pogled vidim, ali so cene na splošno visoke ali nizke.
*Funkcionalnost:* #9

Kriteriji sprejemljivosti:
- Indeks je povprečna odstotna sprememba cen vseh aktivnih pijač glede na osnovno ceno.
- Prikazan je na vrhu cenika skupaj s spremembo v zadnjih 5 minutah.

### US-12 – Filtriranje cenika po kategorijah
**Kot** gost **želim** filtrirati pijače po kategoriji, **da** hitreje najdem, kar me zanima.
*Funkcionalnost:* #10

Kriteriji sprejemljivosti:
- Filter prikaže samo kategorije aktivnih pijač; izbira se ohrani ob samodejnem osveževanju.

### US-13 – Simulacija gibanja cen
**Kot** upravitelj **želim** vnesti testne količine in videti predvideno novo ceno, **da** preverim nastavitve omejitev, ne da bi spremenil podatke.
*Funkcionalnost:* #11

Kriteriji sprejemljivosti:
- Simulacija uporablja isto funkcijo izračuna kot opravilo in ničesar ne zapiše v bazo.

### US-14 – Izvoz poročila o prodaji
**Kot** upravitelj **želim** izvoziti zaključena naročila v CSV, **da** jih lahko obdelam v preglednici.
*Funkcionalnost:* #12

Kriteriji sprejemljivosti:
- Izvoz za izbrano obdobje vsebuje naročilo, natakarja, čas zaključka, pijačo, količino in ceno na enoto (UTF-8, ločilo `;`).
