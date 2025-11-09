import type { Timestamp } from "firebase/firestore";

export type OrderStatus = "Pending" | "Cooking" | "Ready" | "Delivered";

export type Table = {
  id: string;
  name: string;
  qrUrl: string;
  qrImage?: string;
  createdAt?: Timestamp;
};

export type Category = {
  id: string;
  name: string;
  createdAt?: Timestamp;
};

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  createdAt?: Timestamp;
};

export type Order = {
  id: string;
  tableId: string;
  status: OrderStatus;
  createdAt?: Timestamp;
  note?: string | null;
};

export type OrderItem = {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
};


