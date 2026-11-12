import { describe, expect, it } from "vitest";
import { calculateNewPrice } from "../src/pricing/calculate.js";
import { periodStartOf, previousPeriodStart } from "../src/pricing/period.js";

const price = (currentPrice: number, unitsSold: number, { basePrice = currentPrice, minPrice = 0.1, maxPrice = 100 } = {}) =>
  calculateNewPrice({ currentPrice, basePrice, minPrice, maxPrice, unitsSold }).toFixed(2);

describe("calculateNewPrice", () => {
  it("rast sledi ln(1 + enote) s padajočim donosom", () => {
    expect(price(4, 1)).toBe("4.03"); // +0,69 %
    expect(price(4, 2)).toBe("4.04"); // +1,10 %
    expect(price(4, 5)).toBe("4.07"); // +1,79 %
    expect(price(4, 10)).toBe("4.10"); // +2,40 %
  });

  it("rast je omejena na 3 % na obdobje", () => {
    expect(price(4, 50)).toBe("4.12");
    expect(price(4, 500)).toBe("4.12");
  });

  it("brez prodaje nad osnovno ceno pada za 0,5 %", () => {
    expect(price(5, 0, { basePrice: 4 })).toBe("4.98"); // 4,975
  });

  it("brez prodaje pri ali pod osnovno ceno pada za 0,2 %", () => {
    expect(price(4, 0)).toBe("3.99"); // 3,992
    expect(price(3.5, 0, { basePrice: 4 })).toBe("3.49"); // 3,493
  });

  it("se premakne vsaj za 0,01 €, ko bi zaokroževanje spremembo izničilo", () => {
    expect(price(1.5, 0)).toBe("1.49"); // 1,497 → 1,50
    expect(price(0.5, 1)).toBe("0.51"); // 0,5035 → 0,50
  });

  it("cena ne preseže max_price", () => {
    expect(price(4.9, 10, { basePrice: 4, minPrice: 2, maxPrice: 5 })).toBe("5.00");
    expect(price(5, 10, { basePrice: 4, minPrice: 2, maxPrice: 5 })).toBe("5.00");
  });

  it("cena ne pade pod min_price", () => {
    expect(price(2.01, 0, { basePrice: 4, minPrice: 2, maxPrice: 5 })).toBe("2.00");
    expect(price(2, 0, { basePrice: 4, minPrice: 2, maxPrice: 5 })).toBe("2.00");
  });
});

describe("30-sekundna obdobja", () => {
  it("zaokroži čas na začetek obdobja v UTC", () => {
    expect(periodStartOf(new Date("2026-11-11T10:47:42Z")).toISOString()).toBe("2026-11-11T10:47:30.000Z");
    expect(periodStartOf(new Date("2026-11-11T10:47:12Z")).toISOString()).toBe("2026-11-11T10:47:00.000Z");
  });

  it("prejšnje obdobje je zadnje v celoti zaključeno", () => {
    expect(previousPeriodStart(new Date("2026-11-11T10:00:30.500Z")).toISOString()).toBe("2026-11-11T10:00:00.000Z");
    expect(previousPeriodStart(new Date("2026-11-11T10:00:29Z")).toISOString()).toBe("2026-11-11T09:59:30.000Z");
  });
});
