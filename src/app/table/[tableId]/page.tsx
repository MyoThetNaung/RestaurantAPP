"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createOrder, watchMenu, watchLatestOrderForTable } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { formatCurrency } from "@/lib/format";
import type { MenuItem, Order, OrderItem, Table } from "@/lib/types";
import { Heart, Minus, Plus, Sparkles, Star } from "lucide-react";

type CartState = Record<string, number>;

const STATUS_STEPS: Order["status"][] = ["Pending", "Cooking", "Ready", "Delivered"];

export default function CustomerTablePage() {
  const params = useParams<{ tableId: string }>();
  const tableId = params?.tableId;

  const [table, setTable] = useState<Table | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartState>({});
  const [placingOrder, setPlacingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [activeOrderItems, setActiveOrderItems] = useState<OrderItem[]>([]);
  const [note, setNote] = useState("");

  // Subscribe to table metadata
  useEffect(() => {
    if (!tableId) return;
    const unsub = onSnapshot(doc(db, "tables", tableId), (snapshot) => {
      if (snapshot.exists()) {
        setTable({ id: snapshot.id, ...snapshot.data() } as Table);
      } else {
        setTable(null);
      }
    });
    return () => unsub();
  }, [tableId]);

  // Subscribe to menu items
  useEffect(() => {
    if (!tableId) return;
    const unsub = watchMenu(setMenuItems);
    return () => unsub();
  }, [tableId]);

  // Subscribe to latest order for this table
  useEffect(() => {
    if (!tableId) return;
    const unsub = watchLatestOrderForTable(tableId, setActiveOrder);
    return () => unsub();
  }, [tableId]);

  // Subscribe to order items for active order
  useEffect(() => {
    if (!activeOrder) {
      setActiveOrderItems([]);
      return;
    }
    const orderItemsQuery = query(
      collection(db, "orderItems"),
      where("orderId", "==", activeOrder.id),
      orderBy("menuItemId", "asc"),
    );
    const unsubscribe = onSnapshot(orderItemsQuery, (snapshot) => {
      setActiveOrderItems(
        snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as OrderItem),
        ),
      );
    });
    return () => unsubscribe();
  }, [activeOrder]);

  const sections = useMemo(() => {
    if (!menuItems.length) return [];
    const groups = new Map<string, MenuItem[]>();
    menuItems.forEach((item) => {
      const key = item.category?.trim() || "Chef's Picks";
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    });
    return Array.from(groups.entries()).map(([key, items]) => ({
      id: key.toLowerCase().replace(/\s+/g, "-"),
      title: key,
      items,
    }));
  }, [menuItems]);

  const totalItems = useMemo(
    () => Object.values(cart).reduce((sum, count) => sum + count, 0),
    [cart],
  );

  const subtotal = useMemo(() => {
    return Object.entries(cart).reduce((sum, [itemId, quantity]) => {
      const item = menuItems.find((menuItem) => menuItem.id === itemId);
      if (!item) return sum;
      return sum + item.price * quantity;
    }, 0);
  }, [menuItems, cart]);

  const taxAmount = subtotal * 0.12;
  const totalAmount = subtotal + taxAmount;

  const statusIndex = activeOrder
    ? STATUS_STEPS.indexOf(activeOrder.status)
    : -1;

  function addItem(itemId: string) {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] ?? 0) + 1,
    }));
  }

  function removeItem(itemId: string) {
    setCart((prev) => {
      const nextQty = (prev[itemId] ?? 0) - 1;
      if (nextQty <= 0) {
        const rest = { ...prev };
        delete rest[itemId];
        return rest;
      }
      return {
        ...prev,
        [itemId]: nextQty,
      };
    });
  }

  async function placeOrder() {
    if (!tableId || totalItems === 0) return;
    setPlacingOrder(true);
    try {
      const items = Object.entries(cart).map(([menuItemId, quantity]) => ({
        menuItemId,
        quantity,
      }));
      const orderId = await createOrder(tableId, items, note.trim() || undefined);
      setCart({});
      setNote("");
      setActiveOrder({
        id: orderId,
        tableId,
        status: "Pending",
      });
    } finally {
      setPlacingOrder(false);
    }
  }

  if (!tableId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white via-white to-amber-50 px-6">
        <Card className="max-w-md border border-white/70 bg-white/80 p-6 text-center shadow-xl backdrop-blur">
          <CardTitle className="text-2xl font-semibold text-slate-900">
            Missing table id
          </CardTitle>
          <CardDescription className="mt-2 text-slate-600">
            Scan a valid QR code to view the menu for your table.
          </CardDescription>
        </Card>
      </div>
    );
  }

  if (table === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white via-white to-amber-50 px-6 text-slate-900">
        <Card className="max-w-md border border-white/70 bg-white/80 p-6 text-center shadow-xl backdrop-blur">
          <CardTitle className="text-2xl font-semibold">
            Table not found
          </CardTitle>
          <CardDescription className="mt-2 text-slate-600">
            Ask your host for a fresh QR code or try rescanning.
          </CardDescription>
        </Card>
      </div>
    );
  }

  const activeItemsDetailed = activeOrderItems.map((item) => ({
    ...item,
    menuItem: menuItems.find((menuItem) => menuItem.id === item.menuItemId),
  }));

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-white to-amber-50 pb-32 pt-14 text-slate-900 dark:from-slate-950 dark:via-slate-950/90 dark:to-slate-900 dark:text-slate-100">
      <div className="absolute inset-x-0 top-0 flex justify-center">
        <div className="h-32 w-[480px] rounded-full bg-gradient-to-r from-orange-200 via-amber-300 to-rose-200 blur-3xl dark:from-orange-500/40 dark:via-amber-500/40 dark:to-rose-500/40" />
      </div>

      <main className="relative mx-auto flex w-full max-w-4xl flex-col gap-8 px-5">
        <header className="mt-4 space-y-5 text-center sm:text-left">
          <Badge className="mx-auto w-fit rounded-full bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-800 shadow-sm backdrop-blur sm:mx-0 dark:bg-white/10 dark:text-white">
            {table?.name ?? `Table ${tableId}`} · PulseBite
          </Badge>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Feast your curiosity.
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Tap plates to add to your cart. When you&apos;re ready, send your order straight to the kitchen.
            </p>
          </div>
        </header>

        {sections.length === 0 ? (
          <Card className="rounded-3xl border border-white/70 bg-white/80 p-6 text-center shadow-lg backdrop-blur dark:border-white/10 dark:bg-white/10">
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
              Menu syncing
            </CardTitle>
            <CardDescription className="mt-2 text-slate-600 dark:text-slate-300">
              The menu is being prepared. Please wait a moment…
            </CardDescription>
          </Card>
        ) : (
          <>
            <ScrollArea className="rounded-full border border-white/70 bg-white/80 py-2 shadow-sm shadow-orange-200/40 backdrop-blur dark:border-white/10 dark:bg-white/10">
              <div className="flex items-center gap-2 px-4">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60",
                      "text-slate-600 hover:bg-orange-100/60 dark:text-slate-300 dark:hover:bg-white/10",
                    )}
                  >
                    <Sparkles className="h-4 w-4 text-orange-500" />
                    {section.title}
                  </a>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-12">
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="space-y-6">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <h2 className="text-2xl font-semibold">{section.title}</h2>
                      <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
                        Crafted by our chefs, refreshed throughout the night.
                      </p>
                    </div>
                    <Badge className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase text-orange-500 dark:bg-orange-500/20 dark:text-orange-200">
                      Seasonal
                    </Badge>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    {section.items.map((item) => {
                      const quantity = cart[item.id] ?? 0;
                      return (
                        <Card
                          key={item.id}
                          className="relative overflow-hidden border border-white/70 bg-white/80 shadow-lg shadow-orange-200/20 transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/10 dark:shadow-black/30"
                        >
                          <div className="pointer-events-none absolute inset-x-4 top-4 h-28 rounded-3xl bg-gradient-to-br from-orange-300/40 via-amber-300/40 to-rose-300/40 blur-2xl dark:from-orange-500/10 dark:via-amber-500/10 dark:to-rose-500/10" />
                          <CardHeader className="relative z-10 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                                {item.name}
                              </CardTitle>
                              {item.image ? (
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  width={64}
                                  height={64}
                                  className="h-16 w-16 rounded-2xl object-cover"
                                  unoptimized
                                />
                              ) : (
                                <Heart className="h-4 w-4 text-rose-300" />
                              )}
                            </div>
                            <CardDescription className="text-base text-slate-600 dark:text-slate-300">
                              {item.category ?? "Signature"}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="relative z-10 space-y-4">
                            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-300">
                              <span>Chef crafted</span>
                              <span className="font-medium text-slate-900 dark:text-white">
                                {formatCurrency(item.price)}
                              </span>
                            </div>
                            <Separator className="border-dashed border-white/70 dark:border-white/10" />
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 rounded-full border border-orange-200/70 bg-white/80 p-1 shadow-sm dark:border-white/10 dark:bg-white/10">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-full text-slate-500 hover:bg-orange-50 dark:text-slate-200 dark:hover:bg-white/10"
                                  onClick={() => removeItem(item.id)}
                                  disabled={quantity === 0}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="min-w-[2ch] text-center text-sm font-semibold text-slate-800 dark:text-white">
                                  {quantity}
                                </span>
                                <Button
                                  size="icon"
                                  className="h-8 w-8 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 text-white hover:from-orange-600 hover:via-amber-600 hover:to-rose-600"
                                  onClick={() => addItem(item.id)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                className="rounded-full text-sm font-semibold text-orange-500 hover:text-orange-600 dark:text-orange-200 dark:hover:text-orange-100"
                              >
                                More details
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-4xl px-5 pb-6 sm:pb-10">
        <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-2xl shadow-orange-200/40 backdrop-blur dark:border-white/10 dark:bg-white/10 dark:shadow-black/40">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                {totalItems > 0
                  ? `${totalItems} item${totalItems > 1 ? "s" : ""} in cart`
                  : activeOrder
                    ? `Order status: ${activeOrder.status}`
                    : "Your order is waiting"}
              </p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                {formatCurrency(subtotal)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button className="rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 px-6 text-base font-semibold text-white shadow-lg shadow-orange-500/40 hover:from-orange-600 hover:via-amber-600 hover:to-rose-600">
                    {totalItems ? "Review & send" : "View status"}
                    <Star className="ml-2 h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full max-w-md border-l border-white/20 bg-white/95 text-slate-900 backdrop-blur dark:border-white/10 dark:bg-slate-950/80 dark:text-white">
                  <div className="mt-6 space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {totalItems ? "Your cart" : "Latest order"}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-300">
                        Confirm your plates or check on kitchen progress.
                      </p>
                    </div>
                    {totalItems > 0 ? (
                      <>
                        <div className="space-y-4">
                          {Object.entries(cart).map(([itemId, quantity]) => {
                            const item = menuItems.find((menuItem) => menuItem.id === itemId);
                            if (!item) return null;
                            return (
                              <div
                                key={item.id}
                                className="flex items-start justify-between gap-4 rounded-2xl border border-orange-200/60 bg-orange-50/80 p-4 text-sm backdrop-blur dark:border-orange-500/20 dark:bg-orange-500/10"
                              >
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-white">
                                    {item.name}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                                    {item.category ?? "Chef's pick"}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                    <Badge className="rounded-full bg-white/70 px-2 py-0.5 text-slate-700 shadow dark:bg-white/10 dark:text-white">
                                      Qty {quantity}
                                    </Badge>
                                    <Badge className="rounded-full bg-white/70 px-2 py-0.5 text-slate-700 shadow dark:bg-white/10 dark:text-white">
                                      {formatCurrency(item.price)}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 rounded-full border border-orange-200/70 bg-white/80 p-1 shadow-sm dark:border-white/10 dark:bg-white/10">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-full text-slate-500 hover:bg-orange-100 dark:text-slate-200 dark:hover:bg-white/10"
                                    onClick={() => removeItem(item.id)}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="min-w-[2ch] text-center font-semibold text-slate-800 dark:text-white">
                                    {quantity}
                                  </span>
                                  <Button
                                    size="icon"
                                    className="h-8 w-8 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 text-white hover:from-orange-600 hover:via-amber-600 hover:to-rose-600"
                                    onClick={() => addItem(item.id)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="space-y-3">
                          <Input
                            placeholder="Add a note for the kitchen (allergies, preferences…)"
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            className="rounded-2xl border-white/70 bg-white/80 text-sm shadow-sm dark:border-white/10 dark:bg-white/10"
                          />
                          <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/10">
                            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-300">
                              <span>Subtotal</span>
                              <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-300">
                              <span>Service charge (12%)</span>
                              <span>{formatCurrency(taxAmount)}</span>
                            </div>
                            <Separator className="my-4 border-dashed border-white/60 dark:border-white/10" />
                            <div className="flex items-center justify-between text-base font-semibold text-slate-900 dark:text-white">
                              <span>Total</span>
                              <span>{formatCurrency(totalAmount)}</span>
                            </div>
                          </div>
                          <Button
                            className="w-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 text-base font-semibold text-white hover:from-orange-600 hover:via-amber-600 hover:to-rose-600"
                            disabled={placingOrder || totalItems === 0}
                            onClick={placeOrder}
                          >
                            {placingOrder ? "Sending…" : "Send order to kitchen"}
                          </Button>
                          <p className="text-xs text-slate-500 dark:text-slate-300">
                            We&apos;ll confirm availability instantly and update your order status in real-time.
                          </p>
                        </div>
                      </>
                    ) : activeOrder ? (
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500">
                            Status
                          </h4>
                          <div className="mt-4 flex items-center gap-3">
                            {STATUS_STEPS.map((status, index) => (
                              <div key={status} className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-full border text-xs font-semibold",
                                    index <= statusIndex
                                      ? "border-emerald-400 bg-emerald-400 text-slate-900"
                                      : "border-white/40 bg-white/10 text-slate-400",
                                  )}
                                >
                                  {index + 1}
                                </div>
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                  {status}
                                </span>
                                {index < STATUS_STEPS.length - 1 ? (
                                  <div className="h-px w-10 bg-gradient-to-r from-white/40 to-transparent" />
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500">
                            Items
                          </h4>
                          <div className="space-y-3">
                            {activeItemsDetailed.map((item) => (
                              <div
                                key={item.id}
                                className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/10"
                              >
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {item.quantity} × {item.menuItem?.name ?? "Item"}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-300">
                                  {item.menuItem?.category ?? "Chef's pick"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-300">
                        Add dishes to your cart to begin a new order.
                      </p>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


