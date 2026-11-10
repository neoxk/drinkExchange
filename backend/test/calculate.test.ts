import { describe, expect, it } from "vitest";
import { calculateNewPrice } from "../src/pricing/calculate.js";
import { periodStartOf, previousPeriodStart } from "../src/pricing/period.js";

const price = (currentPrice: number, unitsSold: number, minPrice = 1, maxPrice = 100) =>
  calculateNewPrice({ currentPrice, minPrice, maxPrice, unitsSold }).toFixed(2);

describe("calculateNewPrice", () => {
  it("pri 5 ali več prodanih enotah zviša ceno za 5 %", () => {
    expect(price(4, 5)).toBe("4.20");
    expect(price(4, 50)).toBe("4.20");
  });

  it("pri 0 prodanih enotah zniža ceno za 5 %", () => {
    expect(price(4, 0)).toBe("3.80");
  });

  it.each([1, 2, 3, 4])("pri %i prodanih enotah cena ostane enaka", (units) => {
    expect(price(4, units)).toBe("4.00");
  });

  it("zaokroži na 0,01 € (polovico navzgor)", () => {
    expect(price(3.33, 5)).toBe("3.50"); // 3,4965
    expect(price(2.5, 0)).toBe("2.38"); // 2,375
    expect(price(3.15, 5)).toBe("3.31"); // 3,3075
  });

  it("cena ne preseže max_price", () => {
    expect(price(4.9, 10, 2, 5)).toBe("5.00");
    expect(price(5, 10, 2, 5)).toBe("5.00");
  });

  it("cena ne pade pod min_price", () => {
    expect(price(2.05, 0, 2, 5)).toBe("2.00");
    expect(price(2, 0, 2, 5)).toBe("2.00");
  });
});

describe("30-minutna obdobja", () => {
  it("zaokroži čas na začetek obdobja v UTC", () => {
    expect(periodStartOf(new Date("2026-11-11T10:47:12Z")).toISOString()).toBe("2026-11-11T10:30:00.000Z");
    expect(periodStartOf(new Date("2026-11-11T10:00:00Z")).toISOString()).toBe("2026-11-11T10:00:00.000Z");
  });

  it("prejšnje obdobje je zadnje v celoti zaključeno", () => {
    expect(previousPeriodStart(new Date("2026-11-11T10:30:00.500Z")).toISOString()).toBe("2026-11-11T10:00:00.000Z");
    expect(previousPeriodStart(new Date("2026-11-11T10:29:59Z")).toISOString()).toBe("2026-11-11T09:30:00.000Z");
  });
});
