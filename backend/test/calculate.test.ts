import { describe, expect, it } from "vitest";
import { priceAfterIdle, priceAfterSale } from "../src/pricing/calculate.js";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

const afterSale = (currentPrice: number, unitsSold: number, { basePrice = currentPrice, minPrice = 0.1, maxPrice = 100 } = {}) =>
  priceAfterSale({ currentPrice, basePrice, minPrice, maxPrice }, unitsSold).toFixed(2);

const afterIdle = (currentPrice: number, idleMs: number, { basePrice = currentPrice, minPrice = 0.1, maxPrice = 100 } = {}) =>
  priceAfterIdle({ currentPrice, basePrice, minPrice, maxPrice }, idleMs).toFixed(2);

describe("priceAfterSale", () => {
  it("skok sledi ln(1 + enote) s padajočim donosom", () => {
    expect(afterSale(4, 1)).toBe("4.06"); // +1,39 %
    expect(afterSale(4, 2)).toBe("4.09"); // +2,20 %
    expect(afterSale(4, 5)).toBe("4.14"); // +3,58 %
    expect(afterSale(4, 10)).toBe("4.19"); // +4,80 %
  });

  it("skok je omejen na 6 %", () => {
    expect(afterSale(4, 50)).toBe("4.24");
    expect(afterSale(4, 500)).toBe("4.24");
  });

  it("se premakne vsaj za 0,01 €, ko bi zaokroževanje skok izničilo", () => {
    expect(afterSale(0.3, 1)).toBe("0.31"); // 0,3042 → 0,30
  });

  it("cena ne preseže max_price", () => {
    expect(afterSale(4.9, 10, { basePrice: 4, minPrice: 2, maxPrice: 5 })).toBe("5.00");
    expect(afterSale(5, 10, { basePrice: 4, minPrice: 2, maxPrice: 5 })).toBe("5.00");
  });
});

describe("priceAfterIdle", () => {
  const limits = { basePrice: 4, minPrice: 2, maxPrice: 6 };

  it("nad osnovno ceno se odmik razpolovi vsake 3 minute", () => {
    expect(afterIdle(5, 0, limits)).toBe("5.00");
    expect(afterIdle(5, 5 * SECOND, limits)).toBe("4.98");
    expect(afterIdle(5, 3 * MINUTE, limits)).toBe("4.50");
    expect(afterIdle(5, 6 * MINUTE, limits)).toBe("4.25");
  });

  it("pri ali pod osnovno ceno se odmik od min_price razpolovi vsakih 30 minut", () => {
    expect(afterIdle(4, 5 * SECOND, limits)).toBe("4.00");
    expect(afterIdle(4, 30 * MINUTE, limits)).toBe("3.00");
    expect(afterIdle(4, 60 * MINUTE, limits)).toBe("2.50");
    expect(afterIdle(3.5, 30 * MINUTE, limits)).toBe("2.75");
  });

  it("po dolgem mirovanju se cena najprej vrne na osnovno in nato pada pod njo", () => {
    // 4,04 → 4,00 traja 9 minut (odmik pod pol centa), preostalih 30 minut teče pod osnovno ceno
    expect(afterIdle(4.04, 9 * MINUTE - SECOND, limits)).toBe("4.01");
    expect(afterIdle(4.04, 39 * MINUTE, limits)).toBe("3.00");
  });

  it("cena ne pade pod min_price in ostane v mejah", () => {
    expect(afterIdle(2, 60 * MINUTE, limits)).toBe("2.00");
    expect(afterIdle(2.01, 24 * 60 * MINUTE, limits)).toBe("2.00");
    expect(afterIdle(7, 0, limits)).toBe("6.00");
  });
});
