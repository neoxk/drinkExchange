export interface PublicDrink {
  id: string;
  name: string;
  category: string;
  currentPrice: string;
  basePrice: string;
  previousPrice: string;
  change: string;
  changePercent: number;
}

export interface HistoryPoint {
  periodStart: string;
  oldPrice: string;
  price: string;
  unitsSold: number;
}

export interface DrinkHistory {
  drink: PublicDrink;
  history: HistoryPoint[];
}
