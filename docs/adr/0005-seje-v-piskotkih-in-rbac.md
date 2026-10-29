---
status: sprejeto
date: 2026-10-29
---

# Strežniške seje v piškotkih in preverjanje vlog na strežniku

## Kontekst in opis problema

Gost aplikacijo uporablja brez računa, natakarji in upravitelji pa se prijavijo in imajo različne pravice (natakar ne sme spreminjati cen, upravitelj upravlja račune). Računov je malo, ustvari jih upravitelj, javne registracije ni. Kako izvesti prijavo in avtorizacijo, da bo varna, enostavna in da bo mogoče dostop zaposlenega takoj preklicati (npr. ko natakar zapusti delo)?

## Obravnavane možnosti

* Strežniške seje (`express-session`, shramba v PostgreSQL) s piškotkom `HttpOnly`
* JWT žetoni brez stanja (v `localStorage` ali piškotku)
* Zunanji ponudnik identitete (OAuth, npr. Google, Auth0)

## Izid odločitve

Izbrana možnost: »Strežniške seje s piškotkom `HttpOnly`«, ker je sejo mogoče takoj preklicati (odjava, deaktivacija računa), piškotek `HttpOnly` pa JavaScriptu v brskalniku ni dostopen, kar zmanjša posledice napada XSS. JWT bi zahteval dodaten mehanizem za preklic in osveževanje žetonov, kar je za majhno število zaposlenih nepotrebno. Zunanji ponudnik bi dodal odvisnost in od zaposlenih zahteval zunanji račun. Gesla hranimo kot Argon2id hash. Vlogo (`WAITER`, `MANAGER`) in lastništvo naročila preveri vmesna programska oprema v API-ju pred vsako zaščiteno operacijo; skrivanje gumbov v vmesniku ni varnostni mehanizem.

### Posledice

* Dobro, ker je preklic dostopa takojšen in je stanje prijave pod nadzorom strežnika.
* Dobro, ker so pravila dostopa na enem mestu in jih je mogoče testirati (npr. »natakar ne more spreminjati cen«).
* Slabo, ker piškotne seje zahtevajo zaščito pred CSRF in pravilno nastavitev `SameSite`/`Secure`.
* Slabo, ker vsaka zaščitena zahteva bere sejo iz baze (pri obsegu enega bara zanemarljivo).
* Slabo, ker je treba pri ločenem frontendu urediti piškotke med izvoroma (posredovanje v Vite ali skupna domena).
