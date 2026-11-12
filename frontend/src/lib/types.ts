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

export type Role = "WAITER" | "MANAGER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export type OrderStatus = "OPEN" | "COMPLETED" | "CANCELLED";

export interface OrderItem {
  id: string;
  drinkId: string;
  drinkName: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  waiter: { id: string; name: string };
  createdAt: string;
  completedAt: string | null;
  items: OrderItem[];
  total: string;
}
