import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentReference,
} from "firebase/firestore";
import QRCode from "qrcode";

import { db } from "./firebase";
import type {
  Category,
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  Table,
} from "./types";

const tablesRef = collection(db, "tables");
const categoriesRef = collection(db, "categories");
const menuItemsRef = collection(db, "menuItems");
const ordersRef = collection(db, "orders");
const orderItemsRef = collection(db, "orderItems");

export function watchTables(
  callback: (tables: Table[]) => void,
): () => void {
  return onSnapshot(
    query(tablesRef, orderBy("createdAt", "desc")),
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Table[],
      );
    },
  );
}

export async function createTable(name: string) {
  const docRef = await addDoc(tablesRef, {
    name,
    qrUrl: "",
    createdAt: serverTimestamp(),
  });

  const qrPath = `/table/${docRef.id}`;
  let qrImage: string | undefined;
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    qrImage = await QRCode.toDataURL(`${origin}${qrPath}`, {
      margin: 2,
      scale: 8,
    });
  }

  await updateDoc(docRef, {
    qrUrl: qrPath,
    ...(qrImage ? { qrImage } : {}),
  });

  return docRef.id;
}

export async function deleteTable(id: string) {
  await deleteDoc(doc(tablesRef, id));
}

export function watchCategories(
  callback: (categories: Category[]) => void,
): () => void {
  return onSnapshot(
    query(categoriesRef, orderBy("createdAt", "desc")),
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Category[],
      );
    },
  );
}

export async function createCategory(name: string) {
  await addDoc(categoriesRef, {
    name,
    createdAt: serverTimestamp(),
  });
}

export async function updateCategory(
  id: string,
  data: Partial<Category>,
) {
  await updateDoc(doc(categoriesRef, id), data);
}

export async function removeCategory(id: string) {
  await deleteDoc(doc(categoriesRef, id));
}

export function watchMenu(
  callback: (items: MenuItem[]) => void,
): () => void {
  return onSnapshot(
    query(menuItemsRef, orderBy("createdAt", "desc")),
    (snapshot) => {
      callback(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as MenuItem[],
      );
    },
  );
}

export async function createMenuItem(data: {
  name: string;
  price: number;
  image?: string;
  category?: string;
}) {
  await addDoc(menuItemsRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateMenuItem(
  id: string,
  data: Partial<MenuItem>,
) {
  await updateDoc(doc(menuItemsRef, id), data);
}

export async function removeMenuItem(id: string) {
  await deleteDoc(doc(menuItemsRef, id));
}

export function watchOrders(
  callback: (orders: Order[]) => void,
) {
  return onSnapshot(
    query(ordersRef, orderBy("createdAt", "desc")),
    (snapshot) => {
      callback(
        snapshot.docs.map((order) => ({
          id: order.id,
          ...order.data(),
        })) as Order[],
      );
    },
  );
}

export function watchOrdersByStatuses(
  statuses: OrderStatus[],
  callback: (orders: Order[]) => void,
) {
  return onSnapshot(
    query(
      ordersRef,
      where("status", "in", statuses),
      orderBy("createdAt", "asc"),
    ),
    (snapshot) => {
      callback(
        snapshot.docs.map((order) => ({
          id: order.id,
          ...order.data(),
        })) as Order[],
      );
    },
  );
}

export function watchLatestOrderForTable(
  tableId: string,
  callback: (order: Order | null) => void,
) {
  return onSnapshot(
    query(
      ordersRef,
      where("tableId", "==", tableId),
      orderBy("createdAt", "desc"),
      limit(1),
    ),
    (snapshot) => {
      if (snapshot.empty) {
        callback(null);
        return;
      }
      const docSnap = snapshot.docs[0];
      callback({ id: docSnap.id, ...docSnap.data() } as Order);
    },
  );
}

export function watchOrderItems(
  callback: (items: OrderItem[]) => void,
) {
  return onSnapshot(orderItemsRef, (snapshot) => {
    callback(
      snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as OrderItem[],
    );
  });
}

export async function createOrder(
  tableId: string,
  items: { menuItemId: string; quantity: number }[],
  note?: string,
) {
  const orderRef = await addDoc(ordersRef, {
    tableId,
    status: "Pending",
    createdAt: serverTimestamp(),
    note: note ?? null,
  });

  await Promise.all(
    items.map((item) =>
      addDoc(orderItemsRef, {
        orderId: orderRef.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
      }),
    ),
  );

  return orderRef.id;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
) {
  await updateDoc(doc(ordersRef, id), { status });
}

export async function getOrderItemsByOrder(
  orderId: string,
) {
  const snapshot = await getDocs(
    query(orderItemsRef, where("orderId", "==", orderId)),
  );
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as OrderItem[];
}

export function orderDoc(id: string): DocumentReference {
  return doc(ordersRef, id);
}


