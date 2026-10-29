# 01 – Zasnova rešitve

## Ime rešitve
**DrinkExchange – borza pijač**

## Namen in problem
DrinkExchange je spletna aplikacija za bar, v katerem se cene pijač spreminjajo glede na povpraševanje, podobno kot borzni tečaji. Pri običajnem ceniku so cene stalne, gostje pa nimajo dodatnega razloga za spremljanje ponudbe. Aplikacija omogoča dinamično oblikovanje cen po vnaprej določenih pravilih ter natakarjem olajša spremljanje naročil in veljavnih cen.

## Ciljni uporabniki
- **Gost** sedi v baru, na telefonu ali javnem zaslonu preveri trenutno ceno in gibanje cen pijač ter natakarju pove, kaj želi naročiti.
- **Natakar** med strežbo v aplikacijo vnese naročilo po trenutno veljavni ceni, preveri stanje naročila in ga zaključi ali prekliče.
- **Upravitelj bara** pred začetkom obratovanja določi ponudbo, izhodiščne in dovoljene cene ter spremlja prodajo.

## Kako rešitev deluje
1. Upravitelj vnese pijače, osnovne cene ter najnižjo in najvišjo dovoljeno ceno vsake pijače.
2. Gost na javni spletni strani spremlja trenutne cene, smer gibanja in zgodovino sprememb. Za ogled ne potrebuje računa.
3. Gost naroči pijačo pri natakarju. Natakar ustvari naročilo in sistem ob dodajanju postavke shrani trenutno veljavno ceno (ta je za naročilo zaklenjena).
4. Ko natakar naročilo označi kot zaključeno, se njegove količine vključijo v izračun povpraševanja.
5. Sistem vsakih 30 minut za vsako pijačo preveri število prodanih enot v preteklih 30 minutah. Če jih je vsaj 5, ceno zviša za 5 %; če jih je 0, jo zniža za 5 %; sicer je ne spremeni. Rezultat se zaokroži na dve decimalki in omeji na nastavljeno najnižjo oziroma najvišjo ceno.
6. Nova cena se prikaže gostom in natakarjem, sprememba pa se shrani za graf zgodovine cen.

**Primer:** Osnovna cena limonade je 4,00 €, dovoljeni razpon je od 3,00 € do 6,00 €. Če se v enem 30-minutnem obdobju proda šest limonad, se cena za naslednje obdobje zviša na 4,20 €. Že ustvarjena naročila obdržijo prvotno ceno.

## Glavni cilj prve različice
Delujoča spletna aplikacija z javnim prikazom ponudbe, evidentiranjem naročil, samodejnim preračunavanjem cen, zgodovino cen in ločenimi pravicami za gosta, natakarja in upravitelja.

> Navdih: članek o baru z borzno zasnovanimi cenami pijač: https://www.insidehook.com/cocktails/stock-market-themed-bar. DrinkExchange je samostojen študijski projekt in ni povezan z omenjenim barom.
