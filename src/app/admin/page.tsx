"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import QRCode from "qrcode";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  createCategory,
  removeCategory,
  watchCategories,
} from "@/lib/firestore";
import { auth, db } from "@/lib/firebase";
import { formatCurrency, timeSince } from "@/lib/format";
import type {
  Category,
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  Table,
} from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Home, LogOut, PenLine, QrCode, Trash2 } from "lucide-react";

const TABS = [
  { value: "tables", label: "Tables" },
  { value: "menu", label: "Menu" },
  { value: "orders", label: "Orders" },
];

const STATUS_STEPS: OrderStatus[] = ["Pending", "Cooking", "Ready", "Delivered"];

function statusBadgeStyles(status: OrderStatus) {
  switch (status) {
    case "Pending":
      return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-200";
    case "Cooking":
      return "bg-orange-500/20 text-orange-500 dark:text-orange-200";
    case "Ready":
      return "bg-emerald-500/15 text-emerald-500 dark:text-emerald-200";
    case "Delivered":
      return "bg-slate-900 text-white dark:bg-white dark:text-slate-900";
    default:
      return "";
  }
}

type EditableMenuItem = {
  id: string;
  name: string;
  price: string;
  image: string;
  category: string;
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("tables");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const [tables, setTables] = useState<Table[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [newTableName, setNewTableName] = useState("");
  const [creatingTable, setCreatingTable] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);

  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    image: "",
    category: "",
  });
  const [editingItem, setEditingItem] = useState<EditableMenuItem | null>(null);
  const [menuBusy, setMenuBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const tablesQuery = query(
      collection(db, "tables"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribeTables = onSnapshot(tablesQuery, (snapshot) => {
      setTables(
        snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Table),
        ),
      );
    });

    const menuQuery = query(
      collection(db, "menuItems"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribeMenu = onSnapshot(menuQuery, (snapshot) => {
      setMenu(
        snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as MenuItem),
        ),
      );
    });

    const unsubscribeCategories = watchCategories((list) => {
      setCategories(list);
    });

    const ordersQuery = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(
        snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Order),
        ),
      );
    });

    const unsubscribeOrderItems = onSnapshot(
      collection(db, "orderItems"),
      (snapshot) => {
        setOrderItems(
          snapshot.docs.map(
            (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as OrderItem),
          ),
        );
      },
    );

    return () => {
      unsubscribeTables();
      unsubscribeMenu();
      unsubscribeCategories();
      unsubscribeOrders();
      unsubscribeOrderItems();
    };
  }, [user]);

  useEffect(() => {
    if (!categories.length) {
      setNewItem((prev) => ({ ...prev, category: "" }));
      setCategoryTouched(false);
      return;
    }
    setNewItem((prev) => {
      if (categoryTouched) {
        if (
          prev.category === "" ||
          categories.some((cat) => cat.name === prev.category)
        ) {
          return prev;
        }
      }
      if (prev.category && categories.some((cat) => cat.name === prev.category)) {
        return prev;
      }
      return { ...prev, category: categories[0].name };
    });
  }, [categories, categoryTouched]);

  const menuMap = useMemo(
    () =>
      menu.reduce<Record<string, MenuItem>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [menu],
  );

  const categoryCounts = useMemo(
    () =>
      menu.reduce<Record<string, number>>((acc, item) => {
        const key = item.category ?? "Uncategorised";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    [menu],
  );

  const tablesMap = useMemo(
    () =>
      tables.reduce<Record<string, Table>>((acc, table) => {
        acc[table.id] = table;
        return acc;
      }, {}),
    [tables],
  );

  const orderGroups = useMemo(() => {
    const grouped = new Map<string, Order[]>();
    orders.forEach((order) => {
      const list = grouped.get(order.tableId) ?? [];
      list.push(order);
      grouped.set(order.tableId, list);
    });
    return grouped;
  }, [orders]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginBusy(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : "Unable to sign in. Try again.",
      );
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleCreateTable(e: React.FormEvent) {
    e.preventDefault();
    if (!newTableName.trim()) return;
    setCreatingTable(true);
    try {
      const tablesCollection = collection(db, "tables");
      const docRef = await addDoc(tablesCollection, {
        name: newTableName.trim(),
        createdAt: serverTimestamp(),
        qrUrl: "",
      });
      const qrPath = `/table/${docRef.id}`;
      let qrImage: string | undefined;
      if (typeof window !== "undefined") {
        qrImage = await QRCode.toDataURL(`${window.location.origin}${qrPath}`, {
          margin: 2,
          scale: 8,
        });
      }
      await updateDoc(docRef, {
        qrUrl: qrPath,
        ...(qrImage ? { qrImage } : {}),
      });
      setNewTableName("");
    } catch (error) {
      console.error("Failed to create table", error);
    } finally {
      setCreatingTable(false);
    }
  }

  async function handleDeleteTable(id: string) {
    await deleteDoc(doc(db, "tables", id));
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setCategoryBusy(true);
    try {
      await createCategory(newCategoryName.trim());
      setNewCategoryName("");
    } catch (error) {
      console.error("Failed to create category", error);
    } finally {
      setCategoryBusy(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    try {
      await removeCategory(id);
    } catch (error) {
      console.error("Failed to remove category", error);
    }
  }

  async function handleCreateMenuItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.name.trim() || !newItem.price.trim()) return;
    setMenuBusy(true);
    try {
      await addDoc(collection(db, "menuItems"), {
        name: newItem.name.trim(),
        price: Number(newItem.price),
        image: newItem.image.trim() || null,
        category: newItem.category.trim() || null,
        createdAt: serverTimestamp(),
      });
      setNewItem({ name: "", price: "", image: "", category: "" });
      setCategoryTouched(false);
    } catch (error) {
      console.error("Failed to create menu item", error);
    } finally {
      setMenuBusy(false);
    }
  }

  async function handleSaveMenuItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    setMenuBusy(true);
    try {
      await updateDoc(doc(db, "menuItems", editingItem.id), {
        name: editingItem.name.trim(),
        price: Number(editingItem.price),
        image: editingItem.image.trim() ? editingItem.image.trim() : null,
        category: editingItem.category.trim()
          ? editingItem.category.trim()
          : null,
      });
      setEditingItem(null);
    } catch (error) {
      console.error("Failed to update menu item", error);
    } finally {
      setMenuBusy(false);
    }
  }

  async function handleDeleteMenuItem(id: string) {
    await deleteDoc(doc(db, "menuItems", id));
    if (editingItem?.id === id) {
      setEditingItem(null);
    }
  }

  async function handleAdvanceStatus(order: Order) {
    const currentIndex = STATUS_STEPS.indexOf(order.status);
    const next = STATUS_STEPS[currentIndex + 1];
    if (!next) return;
    await updateDoc(doc(db, "orders", order.id), { status: next });
  }

  const renderedOrders = useMemo(
    () =>
      Array.from(orderGroups.entries()).map(([tableId, tableOrders]) => ({
        table: tablesMap[tableId],
        orders: tableOrders.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() ?? 0;
          const timeB = b.createdAt?.toMillis?.() ?? 0;
          return timeB - timeA;
        }),
      })),
    [orderGroups, tablesMap],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-white to-amber-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="rounded-3xl border border-white/50 bg-white/80 px-10 py-8 text-lg font-medium text-slate-700 shadow-xl backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
          Syncing with Firebase…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-white to-amber-50 px-4 dark:from-slate-950 dark:via-slate-950/80 dark:to-slate-900">
        <Card className="w-full max-w-md border border-white/70 bg-white/85 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-white/10">
          <CardHeader className="space-y-2 text-center">
            <Badge className="mx-auto w-fit rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-orange-500 dark:bg-orange-500/20 dark:text-orange-200">
              Admin access
            </Badge>
            <CardTitle className="text-2xl font-semibold text-slate-900 dark:text-white">
              Sign in to PulseBite Control
            </CardTitle>
            <CardDescription className="text-sm text-slate-500 dark:text-slate-300">
              Use your staff credentials to manage tables, menu, and live orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-200">
                  Email
                </label>
                <Input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="chef@pulsebite.io"
                  className="h-11 rounded-2xl border-white/60 bg-white/70 text-base shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-200">
                  Password
                </label>
                <Input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder="••••••••"
                  className="h-11 rounded-2xl border-white/60 bg-white/70 text-base shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10"
                />
              </div>
              {loginError ? (
                <p className="text-sm text-rose-500">{loginError}</p>
              ) : null}
              <Button
                type="submit"
                disabled={loginBusy}
                className="h-11 w-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 text-base font-semibold text-white shadow-lg shadow-orange-500/40 hover:from-orange-600 hover:via-amber-600 hover:to-rose-600"
              >
                {loginBusy ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-amber-50 px-4 pb-20 pt-12 text-slate-900 dark:from-slate-950 dark:via-slate-950/80 dark:to-slate-900 dark:text-slate-100 md:px-8 lg:px-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
        <header className="flex flex-col gap-6 rounded-4xl border border-white/60 bg-white/80 p-8 shadow-2xl shadow-orange-200/20 backdrop-blur-lg dark:border-white/10 dark:bg-white/10 dark:shadow-black/30 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <Badge className="rounded-full bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-slate-800 shadow-sm backdrop-blur dark:bg-white/10 dark:text-white">
              PulseBite Control
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Welcome back, {user.email}
              </h1>
              <p className="mt-2 max-w-2xl text-base text-slate-600 dark:text-slate-300">
                Synchronise your dining room, kitchen, and guests in real-time. Manage QR tables, curate menu items, and monitor every ticket from a single view.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              className="rounded-full text-slate-600 hover:bg-white/70 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Landing
              </Link>
            </Button>
            <Button
              onClick={() => signOut(auth)}
              className="rounded-full bg-slate-900 px-5 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-white/90"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </header>

        <Card className="border border-white/60 bg-white/75 shadow-xl shadow-orange-200/25 backdrop-blur-lg dark:border-white/10 dark:bg-white/10">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6 rounded-full bg-white/70 p-2 shadow-sm backdrop-blur dark:bg-white/10">
                {TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 transition data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:text-slate-300 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="tables" className="space-y-8">
                <section className="grid gap-6 md:grid-cols-[1.2fr_2fr]">
                  <Card className="border border-white/60 bg-white/80 shadow-md shadow-orange-200/20 backdrop-blur dark:border-white/10 dark:bg-white/10">
                    <CardHeader>
                      <CardTitle>Create table</CardTitle>
                      <CardDescription>
                        Generate a QR-ready table in seconds. Guests scan to open their menu.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleCreateTable} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-200">
                            Table name or number
                          </label>
                          <Input
                            required
                            placeholder="Table 12 · Rooftop"
                            value={newTableName}
                            onChange={(event) => setNewTableName(event.target.value)}
                            className="h-11 rounded-2xl border-white/60 bg-white/70 text-base shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10"
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={creatingTable}
                          className="h-11 w-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 text-base font-semibold text-white shadow-lg shadow-orange-400/40 hover:from-orange-600 hover:via-amber-600 hover:to-rose-600"
                        >
                          {creatingTable ? "Generating QR…" : "Create table"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  <Card className="border border-white/60 bg-white/80 shadow-md shadow-orange-200/20 backdrop-blur dark:border-white/10 dark:bg-white/10">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-semibold">Active tables</CardTitle>
                        <CardDescription>
                          Download and print QR codes for in-service use.
                        </CardDescription>
                      </div>
                      <Badge className="rounded-full bg-slate-900/90 px-3 py-1 text-xs font-semibold text-white dark:bg-white/90 dark:text-slate-900">
                        {tables.length}
                      </Badge>
                    </CardHeader>
                    <CardContent className="px-0 pb-0">
                      <ScrollArea className="h-[380px] px-6">
                        <div className="grid gap-4">
                          {tables.map((table) => (
                            <div
                              key={table.id}
                              className="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 md:flex-row md:items-center md:justify-between"
                            >
                              <div className="space-y-1">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                  {table.name}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-300">
                                  {table.qrUrl}
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                  Created {timeSince(table.createdAt)}
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                {table.qrImage ? (
                                  <Image
                                    src={table.qrImage}
                                    alt={`QR code for ${table.name}`}
                                    width={96}
                                    height={96}
                                    className="h-24 w-24 rounded-2xl border border-white/60 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-white/10"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-white/60 text-slate-400 dark:border-white/15 dark:text-slate-500">
                                    <QrCode className="h-8 w-8" />
                                  </div>
                                )}
                                <Button
                                  variant="ghost"
                                  className="rounded-full text-rose-500 hover:bg-rose-500/10 dark:text-rose-300"
                                  onClick={() => handleDeleteTable(table.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                          {tables.length === 0 ? (
                            <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-300">
                              No tables created yet. Spin up your first QR to start taking orders.
                            </p>
                          ) : null}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </section>
              </TabsContent>
              <TabsContent value="menu" className="space-y-8">
                <section className="grid gap-6 md:grid-cols-[1.4fr_2fr]">
                  <div className="space-y-6">
                    <Card className="border border-white/60 bg-white/80 shadow-md shadow-orange-200/20 backdrop-blur dark:border-white/10 dark:bg-white/10">
                      <CardHeader>
                        <CardTitle>Add menu item</CardTitle>
                        <CardDescription>
                          Showcase new dishes, cocktails, or seasonal features instantly.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleCreateMenuItem} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-200">
                              Item name
                            </label>
                            <Input
                              required
                              placeholder="Cedar Plank Salmon"
                              value={newItem.name}
                              onChange={(event) =>
                                setNewItem((prev) => ({ ...prev, name: event.target.value }))
                              }
                              className="h-11 rounded-2xl border-white/60 bg-white/70 text-base shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10"
                            />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-600 dark:text-slate-200">
                                Price
                              </label>
                              <Input
                                required
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="28.00"
                                value={newItem.price}
                                onChange={(event) =>
                                  setNewItem((prev) => ({ ...prev, price: event.target.value }))
                                }
                                className="h-11 rounded-2xl border-white/60 bg-white/70 text-base shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-600 dark:text-slate-200">
                                Category
                              </label>
                              {categories.length ? (
                                <>
                                  <select
                                    value={newItem.category}
                                    onChange={(event) => {
                                      setCategoryTouched(true);
                                      setNewItem((prev) => ({
                                        ...prev,
                                        category: event.target.value,
                                      }));
                                    }}
                                    className="h-11 w-full rounded-2xl border border-white/60 bg-white/70 px-3 text-sm font-medium text-slate-700 shadow-sm outline-none backdrop-blur transition focus-visible:ring-2 focus-visible:ring-orange-500/40 dark:border-white/10 dark:bg-white/10 dark:text-white"
                                  >
                                    <option value="">Uncategorised</option>
                                    {categories.map((category) => (
                                      <option key={category.id} value={category.name}>
                                        {category.name}
                                      </option>
                                    ))}
                                  </select>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Manage categories below. Choose “Uncategorised” to skip.
                                  </p>
                                </>
                              ) : (
                                <Input
                                  placeholder="Mains, Bar, Dessert…"
                                  value={newItem.category}
                                  onChange={(event) =>
                                    setNewItem((prev) => ({
                                      ...prev,
                                      category: event.target.value,
                                    }))
                                  }
                                  className="h-11 rounded-2xl border-white/60 bg-white/70 text-base shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10"
                                />
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-200">
                              Image URL (optional)
                            </label>
                            <Input
                              placeholder="https://cdn.pulsebite.io/menu/salmon.jpg"
                              value={newItem.image}
                              onChange={(event) =>
                                setNewItem((prev) => ({ ...prev, image: event.target.value }))
                              }
                              className="h-11 rounded-2xl border-white/60 bg-white/70 text-base shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10"
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={menuBusy}
                            className="h-11 w-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 text-base font-semibold text-white shadow-lg shadow-orange-400/40 hover:from-orange-600 hover:via-amber-600 hover:to-rose-600"
                          >
                            {menuBusy ? "Saving…" : "Add to menu"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>

                    <Card className="border border-white/60 bg-white/80 shadow-md shadow-orange-200/20 backdrop-blur dark:border-white/10 dark:bg-white/10">
                      <CardHeader>
                        <CardTitle>Categories</CardTitle>
                        <CardDescription>
                          Keep dishes organised for staff and guests.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <form onSubmit={handleCreateCategory} className="flex flex-col gap-3 sm:flex-row">
                          <Input
                            placeholder="e.g. Small Plates"
                            value={newCategoryName}
                            onChange={(event) => setNewCategoryName(event.target.value)}
                            className="h-11 flex-1 rounded-2xl border-white/60 bg-white/70 text-base shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10"
                          />
                          <Button
                            type="submit"
                            disabled={categoryBusy}
                            className="h-11 rounded-full bg-slate-900 px-6 text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-white/90"
                          >
                            {categoryBusy ? "Adding…" : "Add"}
                          </Button>
                        </form>
                        <Separator className="border-white/60 dark:border-white/10" />
                        <div className="space-y-3">
                          {categories.length ? (
                            categories.map((category) => (
                              <div
                                key={category.id}
                                className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {category.name}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-300">
                                    {categoryCounts[category.name] ?? 0} item
                                    {(categoryCounts[category.name] ?? 0) === 1 ? "" : "s"}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="rounded-full text-rose-500 hover:bg-rose-500/10 dark:text-rose-300"
                                  onClick={() => handleDeleteCategory(category.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove
                                </Button>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-300">
                              No categories yet. Create one to start grouping dishes.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border border-white/60 bg-white/80 shadow-md shadow-orange-200/20 backdrop-blur dark:border-white/10 dark:bg-white/10">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-semibold">Menu library</CardTitle>
                        <CardDescription>
                          Edit pricing, categories, or retire dishes as needed.
                        </CardDescription>
                      </div>
                      <Badge className="rounded-full bg-slate-900/90 px-3 py-1 text-xs font-semibold text-white dark:bg-white/90 dark:text-slate-900">
                        {menu.length}
                      </Badge>
                    </CardHeader>
                    <CardContent className="px-0 pb-0">
                      <ScrollArea className="h-[380px] px-6">
                        <div className="grid gap-4">
                          {menu.map((item) => {
                            const isEditing = editingItem?.id === item.id;
                            return (
                              <div
                                key={item.id}
                                className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10"
                              >
                                {isEditing ? (
                                  <form onSubmit={handleSaveMenuItem} className="space-y-4">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <Input
                                        required
                                        value={editingItem.name}
                                        onChange={(event) =>
                                          setEditingItem((prev) =>
                                            prev ? { ...prev, name: event.target.value } : prev,
                                          )
                                        }
                                        className="h-10 rounded-xl border-white/60 bg-white/70 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10"
                                      />
                                      <Input
                                        required
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editingItem.price}
                                        onChange={(event) =>
                                          setEditingItem((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  price: event.target.value,
                                                }
                                              : prev,
                                          )
                                        }
                                        className="h-10 rounded-xl border-white/60 bg-white/70 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10"
                                      />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      {categories.length ? (
                                        <select
                                          value={editingItem.category}
                                          onChange={(event) =>
                                            setEditingItem((prev) =>
                                              prev
                                                ? { ...prev, category: event.target.value }
                                                : prev,
                                            )
                                          }
                                          className="h-10 w-full rounded-xl border border-white/60 bg-white/70 px-3 text-sm font-medium text-slate-700 shadow-sm outline-none backdrop-blur transition focus-visible:ring-2 focus-visible:ring-orange-500/40 dark:border-white/10 dark:bg-white/10 dark:text-white"
                                        >
                                          <option value="">Uncategorised</option>
                                          {editingItem.category &&
                                            !categories.some(
                                              (cat) => cat.name === editingItem.category,
                                            ) && (
                                              <option value={editingItem.category}>
                                                {editingItem.category}
                                              </option>
                                            )}
                                          {categories.map((category) => (
                                            <option key={category.id} value={category.name}>
                                              {category.name}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <Input
                                          placeholder="Category"
                                          value={editingItem.category}
                                          onChange={(event) =>
                                            setEditingItem((prev) =>
                                              prev
                                                ? { ...prev, category: event.target.value }
                                                : prev,
                                            )
                                          }
                                          className="h-10 rounded-xl border-white/60 bg-white/70 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10"
                                        />
                                      )}
                                      <Input
                                        placeholder="Image URL"
                                        value={editingItem.image}
                                        onChange={(event) =>
                                          setEditingItem((prev) =>
                                            prev ? { ...prev, image: event.target.value } : prev,
                                          )
                                        }
                                        className="h-10 rounded-xl border-white/60 bg-white/70 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10"
                                      />
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        className="rounded-full text-slate-500 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-white/10"
                                        onClick={() => setEditingItem(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        type="submit"
                                        disabled={menuBusy}
                                        className="rounded-full bg-slate-900 px-4 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-white/90"
                                      >
                                        Save changes
                                      </Button>
                                    </div>
                                  </form>
                                ) : (
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                        {item.name}
                                      </h3>
                                      <p className="text-sm text-slate-600 dark:text-slate-300">
                                        {item.category ?? "Uncategorised"}
                                      </p>
                                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                                        {formatCurrency(item.price)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        className="rounded-full text-slate-600 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-white/10"
                                        onClick={() =>
                                          setEditingItem({
                                            id: item.id,
                                            name: item.name,
                                            price: String(item.price),
                                            image: item.image ?? "",
                                            category: item.category ?? "",
                                          })
                                        }
                                      >
                                        <PenLine className="mr-2 h-4 w-4" />
                                        Edit
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        className="rounded-full text-rose-500 hover:bg-rose-500/10 dark:text-rose-300"
                                        onClick={() => handleDeleteMenuItem(item.id)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Remove
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {menu.length === 0 ? (
                            <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-300">
                              Your menu is currently empty. Add dishes to get started.
                            </p>
                          ) : null}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </section>
              </TabsContent>
              <TabsContent value="orders" className="space-y-8">
                <Card className="border border-white/60 bg-white/80 shadow-md shadow-orange-200/20 backdrop-blur dark:border-white/10 dark:bg-white/10">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-semibold">
                        Live orders by table
                      </CardTitle>
                      <CardDescription>
                        Track progression from Pending → Cooking → Ready → Delivered in real time.
                      </CardDescription>
                    </div>
                    <Badge className="rounded-full bg-slate-900/90 px-3 py-1 text-xs font-semibold text-white dark:bg-white/90 dark:text-slate-900">
                      {orders.length} total
                    </Badge>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    <ScrollArea className="h-[480px] px-6">
                      <div className="space-y-6">
                        {renderedOrders.length === 0 ? (
                          <p className="py-20 text-center text-sm text-slate-500 dark:text-slate-300">
                            No active orders yet. Orders placed from QR menus will appear immediately.
                          </p>
                        ) : (
                          renderedOrders.map(({ table, orders: orderList }) => (
                            <div
                              key={table?.id ?? "unknown"}
                              className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    {table?.name ?? `Table ${table?.id ?? "Unknown"}`}
                                  </h3>
                                  <p className="text-sm text-slate-500 dark:text-slate-300">
                                    {orderList.length} active ticket{orderList.length === 1 ? "" : "s"}
                                  </p>
                                </div>
                              </div>
                              <Separator className="my-4 border-white/70 dark:border-white/10" />
                              <div className="space-y-4">
                                {orderList.map((order) => {
                                  const items = orderItems.filter(
                                    (item) => item.orderId === order.id,
                                  );
                                  const total = items.reduce((sum, orderItem) => {
                                    const menuItem = menuMap[orderItem.menuItemId];
                                    return menuItem
                                      ? sum + menuItem.price * orderItem.quantity
                                      : sum;
                                  }, 0);
                                  const statusIndex = STATUS_STEPS.indexOf(order.status);
                                  const nextStatus = STATUS_STEPS[statusIndex + 1];

                                  return (
                                    <div
                                      key={order.id}
                                      className="flex flex-col gap-4 rounded-2xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 md:flex-row md:items-center md:justify-between"
                                    >
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                          <Badge
                                            className={cn(
                                              "rounded-full px-3 py-1 text-xs font-semibold",
                                              statusBadgeStyles(order.status),
                                            )}
                                          >
                                            {order.status}
                                          </Badge>
                                          <span className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                                            {timeSince(order.createdAt)}
                                          </span>
                                        </div>
                                        <div className="space-y-1">
                                          {items.length ? (
                                            items.map((orderItem) => {
                                              const menuItem = menuMap[orderItem.menuItemId];
                                              if (!menuItem) return null;
                                              return (
                                                <p
                                                  key={orderItem.id}
                                                  className="text-sm text-slate-600 dark:text-slate-300"
                                                >
                                                  {orderItem.quantity} × {menuItem.name}
                                                </p>
                                              );
                                            })
                                          ) : (
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                              Awaiting item sync…
                                            </p>
                                          )}
                                          {order.note ? (
                                            <p className="text-xs italic text-slate-500 dark:text-slate-300">
                                              “{order.note}”
                                            </p>
                                          ) : null}
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end gap-3 md:items-center md:flex-row">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                                          {total > 0 ? formatCurrency(total) : "—"}
                                        </p>
                                        {nextStatus ? (
                                          <Button
                                            className="rounded-full bg-slate-900 px-4 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-white/90"
                                            onClick={() => handleAdvanceStatus(order)}
                                          >
                                            Mark {nextStatus.toLowerCase()}
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                          </Button>
                                        ) : (
                                          <Badge className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-200">
                                            Completed
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

