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
4. Ko natakar naročilo označi kot zaključeno, se cena naročenih pijač takoj zviša: za 2 % × ln(1 + enote), največ za 6 %.
5. Med prodajami se cena ohlaja. Nad osnovno ceno se odmik od nje razpolovi vsake 3 minute, pri ali pod osnovno ceno pa se cena počasi (razpolovni čas 30 minut) spušča proti najnižji ceni. Cena je zaokrožena na dve decimalki in omejena na nastavljeno najnižjo oziroma najvišjo ceno.
6. Nova cena se prikaže gostom in natakarjem, sprememba pa se shrani za graf zgodovine cen.

**Primer:** Osnovna cena limonade je 4,00 €, dovoljeni razpon je od 3,00 € do 6,00 €. Ko natakar zaključi naročilo s šestimi limonadami, se cena takoj zviša na 4,16 €; brez novih naročil je po treh minutah pri 4,08 €. Že ustvarjena naročila obdržijo prvotno ceno.

## Glavni cilj prve različice
Delujoča spletna aplikacija z javnim prikazom ponudbe, evidentiranjem naročil, samodejnim preračunavanjem cen, zgodovino cen in ločenimi pravicami za gosta, natakarja in upravitelja.

> Navdih: članek o baru z borzno zasnovanimi cenami pijač: https://www.insidehook.com/cocktails/stock-market-themed-bar. DrinkExchange je samostojen študijski projekt in ni povezan z omenjenim barom.
