# 03 – Podatkovni model

## Podatkovna baza
Relacijska baza **PostgreSQL**. Primarni ključi so `UUID`, časovni žigi `TIMESTAMPTZ` (UTC), denarne vrednosti `NUMERIC(10,2)` (ne `FLOAT`).

## Entitete in glavna polja

| Entiteta | Polja | Namen |
|---|---|---|
| **User** | `id` PK, `name`, `email` UNIQUE, `password_hash`, `role` (`WAITER`, `MANAGER`), `active`, `created_at` | Zaposleni s prijavo; gost je anonimen. |
| **Drink** | `id` PK, `name`, `category`, `base_price`, `current_price`, `min_price`, `max_price`, `active`, `created_at` | Ponudba pijač z omejitvami cen. |
| **Order** | `id` PK, `waiter_id` FK → User, `status` (`OPEN`, `COMPLETED`, `CANCELLED`), `created_at`, `completed_at` NULL | Naročilo, ki ga evidentira natakar. |
| **OrderItem** | `id` PK, `order_id` FK → Order, `drink_id` FK → Drink, `quantity`, `unit_price` | Postavka naročila z zaklenjeno ceno ob dodajanju. |
| **PriceHistory** | `id` PK, `drink_id` FK → Drink, `period_start`, `old_price`, `new_price`, `units_sold`, `created_at` | Zapis izračuna cen za posamezno obdobje. |

## Povezave
- **User 1 : N Order** – en natakar lahko vnese več naročil; vsako naročilo ima natakarja.
- **Order 1 : N OrderItem** – naročilo vsebuje vsaj eno postavko pred zaključkom.
- **Drink 1 : N OrderItem** – ista pijača je lahko v številnih naročilih.
- **Drink 1 : N PriceHistory** – za vsako pijačo se beležijo izračuni in spremembe cen.

## Mermaid ER-diagram

```mermaid
erDiagram
    USER ||--o{ ORDER : evidentira
    ORDER ||--|{ ORDER_ITEM : vsebuje
    DRINK ||--o{ ORDER_ITEM : je_narocena
    DRINK ||--o{ PRICE_HISTORY : ima_zgodovino

    USER {
        uuid id PK
        string name
        string email UK
        string password_hash
        string role
        boolean active
        datetime created_at
    }
    DRINK {
        uuid id PK
        string name
        string category
        decimal base_price
        decimal current_price
        decimal min_price
        decimal max_price
        boolean active
        datetime created_at
    }
    ORDER {
        uuid id PK
        uuid waiter_id FK
        string status
        datetime created_at
        datetime completed_at
    }
    ORDER_ITEM {
        uuid id PK
        uuid order_id FK
        uuid drink_id FK
        integer quantity
        decimal unit_price
    }
    PRICE_HISTORY {
        uuid id PK
        uuid drink_id FK
        datetime period_start
        decimal old_price
        decimal new_price
        integer units_sold
        datetime created_at
    }
```

## Integritetna pravila
- `quantity > 0`; `base_price > 0`; `min_price > 0`; `min_price <= base_price <= max_price`; `min_price <= current_price <= max_price`.
- `unit_price` se ob dodajanju postavke prekopira iz `Drink.current_price`; poznejše spremembe cene ne vplivajo na naročilo.
- `Order.completed_at` se določi ob prehodu v `COMPLETED`. Samo status `COMPLETED` vpliva na prodano količino.
- `UNIQUE(drink_id, period_start)` v `PriceHistory` preprečuje dvojni zapis istega obdobja.
- Izračun in shranjevanje novih cen za eno obdobje potekata v podatkovni transakciji; opravilo uporablja zaklep, da se isto obdobje ne obračuna dvakrat.
- Naročil, postavk in zapisov zgodovine ne brišemo fizično; pijačo lahko označimo kot neaktivno, da ostanejo zgodovinski podatki pravilni.

## Primer poizvedbe za povpraševanje

```sql
SELECT oi.drink_id, SUM(oi.quantity) AS units_sold
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.status = 'COMPLETED'
  AND o.completed_at >= :period_start
  AND o.completed_at < :period_end
GROUP BY oi.drink_id;
```

Za pijače brez vrnjene vrstice je `units_sold = 0`. Upoštevamo polodprt interval `[period_start, period_end)`, zato eno naročilo ne more šteti v dve obdobji.
