# DrinkExchange – borza pijač

DrinkExchange je spletna aplikacija za bar, v katerem se cene pijač spreminjajo glede na povpraševanje, podobno kot borzni tečaji. Gostje na javnem ceniku spremljajo trenutne cene, trend in zgodovino cen, natakarji evidentirajo naročila po trenutno veljavni (zaklenjeni) ceni, upravitelj pa določa ponudbo in dovoljeni cenovni razpon. Sistem vsakih 30 minut na podlagi prodanih količin samodejno zviša ali zniža ceno vsake pijače.

## Tehnologije

| Del | Tehnologije |
|---|---|
| Frontend | React, Vite, TypeScript, Recharts |
| Backend | Node.js, Express, TypeScript, node-cron |
| Podatkovna baza | PostgreSQL, Prisma ORM |
| Avtentikacija | express-session (strežniške seje), Argon2id |
| Testiranje | Vitest, Supertest |
| Razvojno okolje | Docker Compose, npm, Git |

## Struktura repozitorija

```text
.
├── frontend/            # React + Vite aplikacija
├── backend/             # Express API, cenovno opravilo, Prisma
│   ├── prisma/          # shema, migracije, seed
│   ├── src/
│   └── test/            # Vitest + Supertest
├── docker/              # inicializacija baze
├── docker-compose.yml   # PostgreSQL za lokalni razvoj
└── docs/                # projektna dokumentacija in ADR
```

## Lokalni zagon

### Predpogoji
- Node.js 20.19+ (preizkušeno z Node 26) in npm
- Docker z Docker Compose

### 1. Podatkovna baza
```bash
docker compose up -d
```
PostgreSQL teče na `localhost:5434` (drug port nastaviš z `DB_PORT=5440 docker compose up -d` in ustrezno popraviš `DATABASE_URL`). Ob prvem zagonu se ustvarita bazi `drinkexchange` in `drinkexchange_test`.

### 2. Backend (http://localhost:3000)
```bash
cd backend
cp .env.example .env      # po želji nastavi SESSION_SECRET
npm install
npx prisma migrate dev    # ustvari tabele
npm run seed              # vzorčne pijače
npm run dev
```

### 3. Frontend (http://localhost:5173)
```bash
cd frontend
npm install
npm run dev
```
Vite preusmeri zahteve na `/api` na backend (`http://localhost:3000`, spremeniš z `API_URL`).

### Testi in preverjanje kode
```bash
cd backend
npm test          # uporablja bazo drinkexchange_test (.env.test)
npm run lint
npm run typecheck
cd ../frontend && npm run lint && npm run build
```

## Dokumentacija

- [01 – Zasnova rešitve](docs/01-zasnova-resitve.md)
- [02 – Funkcionalnosti in obseg](docs/02-funkcionalnosti-in-obseg.md)
- [03 – Podatkovni model](docs/03-podatkovni-model.md)
- [04 – Arhitektura in tehnološki sklad](docs/04-arhitektura-in-tehnoloski-sklad.md)
- [05 – Uporabniške zgodbe](docs/05-uporabniske-zgodbe.md)
- [06 – Wireframes](docs/06-wireframes.md)

### Arhitekturne odločitve (ADR)

Odločitve so zapisane po predlogi [MADR](https://adr.github.io/madr/) ([predloga](docs/adr/adr-template.md)). Nova pomembna odločitev dobi nov ADR; če se sprejeta odločitev spremeni, nov ADR v glavi navede, katerega nadomešča, staremu pa se status spremeni v »nadomeščeno«.

| # | Odločitev | Status |
|---|---|---|
| [0001](docs/adr/0001-locen-react-frontend-in-rest-api.md) | Ločen React frontend in REST API na strežniku | sprejeto |
| [0002](docs/adr/0002-relacijska-baza-postgresql.md) | Relacijska podatkovna baza PostgreSQL s Prisma ORM | sprejeto |
| [0003](docs/adr/0003-zaklenjena-cena-postavke.md) | Zaklepanje cene na postavki naročila | sprejeto |
| [0004](docs/adr/0004-strezniski-izracun-cen-s-periodicnim-opravilom.md) | Strežniški izračun cen s periodičnim opravilom na 30 minut | sprejeto |
| [0005](docs/adr/0005-seje-v-piskotkih-in-rbac.md) | Strežniške seje v piškotkih in preverjanje vlog na strežniku | sprejeto |
| [0006](docs/adr/0006-ena-instanca-backenda-v-mvp.md) | Ena instanca backenda z vgrajenim cenovnim opravilom v MVP | sprejeto |
| [0007](docs/adr/0007-periodicno-osvezevanje-cenika.md) | Periodično osveževanje javnega cenika namesto sprotnih povezav | sprejeto |
