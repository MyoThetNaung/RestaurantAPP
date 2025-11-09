"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import {
  watchMenu,
  watchOrderItems,
  watchOrdersByStatuses,
  watchTables,
  updateOrderStatus,
} from "@/lib/firestore";
import { timeSince } from "@/lib/format";
import type { MenuItem, Order, OrderItem, Table } from "@/lib/types";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  ChefHat,
  Clock,
  Flame,
  LeafyGreen,
  LogOut,
  RefreshCw,
} from "lucide-react";

const ACTIVE_STATUSES: Order["status"][] = ["Pending", "Cooking"];

type Priority = "Expedite" | "Rush" | "Standard";

function resolvePriority(order: OrderItem[], menuLookup: Record<string, MenuItem>) {
  const containsHot =
    order.some((item) => (menuLookup[item.menuItemId]?.category ?? "").toLowerCase().includes("hot")) ||
    order.length >= 3;
  if (containsHot) return "Expedite";
  if (order.length >= 2) return "Rush";
  return "Standard";
}

export default function KitchenPage() {
  const { user, loading } = useAuth();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [filter, setFilter] = useState<"all" | Priority>("all");

  useEffect(() => {
    if (!user) return;
    const unsubOrders = watchOrdersByStatuses(ACTIVE_STATUSES, setOrders);
    const unsubItems = watchOrderItems(setOrderItems);
    const unsubMenu = watchMenu(setMenu);
    const unsubTables = watchTables(setTables);

    return () => {
      unsubOrders();
      unsubItems();
      unsubMenu();
      unsubTables();
    };
  }, [user]);

  const menuMap = useMemo(
    () =>
      menu.reduce<Record<string, MenuItem>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [menu],
  );

  const tableMap = useMemo(
    () =>
      tables.reduce<Record<string, Table>>((acc, table) => {
        acc[table.id] = table;
        return acc;
      }, {}),
    [tables],
  );

  const tickets = useMemo(() => {
    return orders.map((order) => {
      const items = orderItems.filter((item) => item.orderId === order.id);
      const priority = resolvePriority(items, menuMap);
      return {
        order,
        items,
        priority,
        table: tableMap[order.tableId],
      };
    });
  }, [orders, orderItems, menuMap, tableMap]);

  const filteredTickets =
    filter === "all"
      ? tickets
      : tickets.filter((ticket) => ticket.priority === filter);

  async function handleMarkReady(orderId: string) {
    await updateOrderStatus(orderId, "Ready");
  }

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black px-4 text-slate-200">
        <div className="rounded-3xl border border-white/10 bg-white/10 px-8 py-6 text-lg shadow-2xl shadow-black/40 backdrop-blur">
          Syncing kitchen rail…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black px-4 text-slate-100">
        <Card className="w-full max-w-md border border-white/10 bg-white/10 shadow-2xl backdrop-blur">
          <CardHeader className="space-y-2 text-center">
            <Badge className="mx-auto w-fit rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
              Kitchen login
            </Badge>
            <CardTitle className="text-2xl font-semibold">
              PulseBite Line
            </CardTitle>
            <CardDescription className="text-sm text-slate-300">
              Authenticate with your kitchen credentials to view the live ticket rail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2 text-left">
                <label className="text-sm font-medium text-slate-200">
                  Email
                </label>
                <Input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="expediter@pulsebite.io"
                  className="h-11 rounded-2xl border-white/20 bg-white/10 text-base text-white placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-sm font-medium text-slate-200">
                  Password
                </label>
                <Input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder="••••••••"
                  className="h-11 rounded-2xl border-white/20 bg-white/10 text-base text-white placeholder:text-slate-400"
                />
              </div>
              {loginError ? (
                <p className="text-sm text-rose-400">{loginError}</p>
              ) : null}
              <Button
                type="submit"
                disabled={loginBusy}
                className="h-11 w-full rounded-full bg-emerald-400 text-base font-semibold text-slate-900 shadow-lg shadow-emerald-500/40 hover:bg-emerald-300"
              >
                {loginBusy ? "Signing in…" : "Enter kitchen"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black px-4 pb-16 pt-12 text-slate-100 md:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] backdrop-blur-lg">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge className="rounded-full bg-emerald-500/25 px-3 py-1 text-xs font-semibold uppercase text-emerald-200 backdrop-blur">
                Kitchen view · Live tickets
              </Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                PulseBite Line Leader
              </h1>
              <p className="mt-3 max-w-2xl text-base text-slate-300">
                Fire, plate, and pass dishes with confidence. Every order syncs from the dining room in real-time.
              </p>
            </div>
            <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-inner">
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <ChefHat className="h-5 w-5 text-emerald-300" />
                <span>{orders.length} ticket{orders.length === 1 ? "" : "s"} on the rail</span>
              </div>
              <Separator className="border-white/10" />
              <div className="text-sm text-slate-300">
                <p>Staff: {user.email}</p>
              </div>
              <Button
                variant="outline"
                className="rounded-full border-white/20 text-slate-200 hover:bg-white/10"
                onClick={() => signOut(auth)}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>

          <Tabs value={filter} className="mt-8">
            <TabsList className="inline-flex gap-2 rounded-full border border-white/10 bg-white/10 p-1">
              <TabsTrigger
                value="all"
                onClick={() => setFilter("all")}
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-slate-200 data-[state=active]:bg-white data-[state=active]:text-slate-900"
              >
                All tickets
              </TabsTrigger>
              {(["Expedite", "Rush", "Standard"] as Priority[]).map((priority) => (
                <TabsTrigger
                  key={priority}
                  value={priority}
                  onClick={() => setFilter(priority)}
                  className="rounded-full px-4 py-1.5 text-sm font-semibold text-slate-200 data-[state=active]:bg-white data-[state=active]:text-slate-900"
                >
                  {priority}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </header>

        <ScrollArea className="h-[60vh] rounded-3xl border border-white/10 bg-white/5 p-6 shadow-inner backdrop-blur-lg">
          <div className="grid gap-6 lg:grid-cols-2">
            {filteredTickets.length === 0 ? (
              <div className="col-span-full flex h-full items-center justify-center rounded-3xl border border-dashed border-white/15 p-12 text-sm text-slate-300">
                Waiting for the next ticket…
              </div>
            ) : (
              filteredTickets.map(({ order, items, priority, table }) => (
                <Card
                  key={order.id}
                  className="group border border-white/10 bg-white/10 text-white shadow-[0_16px_50px_-16px_rgba(0,0,0,0.7)] backdrop-blur transition hover:-translate-y-1 hover:border-emerald-400/40 hover:bg-white/15"
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-white/10 pb-6">
                    <div>
                      <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        Ticket #{order.id.slice(-6).toUpperCase()}
                      </CardDescription>
                      <CardTitle className="mt-2 text-2xl font-semibold text-white">
                        {table?.name ?? `Table ${order.tableId}`}
                      </CardTitle>
                      <p className="text-sm text-slate-300">
                        {items.reduce((total, item) => total + item.quantity, 0)} item
                        {items.length === 1 && items[0].quantity === 1 ? "" : "s"} · {timeSince(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                      <Badge
                        className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold uppercase text-emerald-200"
                      >
                        {priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
                        Items
                      </p>
                      <div className="space-y-3">
                        {items.map((ticketItem) => {
                          const menuItem = menuMap[ticketItem.menuItemId];
                          return (
                            <div
                              key={ticketItem.id}
                              className="rounded-xl border border-white/10 bg-white/10 p-4"
                            >
                              <div className="flex items-center justify-between text-sm text-white">
                                <span className="font-medium">
                                  {ticketItem.quantity} × {menuItem?.name ?? "Unknown item"}
                                </span>
                                <Flame className="h-4 w-4 text-orange-300/90" />
                              </div>
                              {menuItem?.category ? (
                                <p className="mt-2 text-xs text-emerald-200/80">
                                  {menuItem.category}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {order.note ? (
                      <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-emerald-200/90">
                        Guest note: {order.note}
                      </div>
                    ) : null}
                  </CardContent>
                  <CardFooter className="flex items-center justify-between border-t border-white/10 pt-6 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span>{order.status}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        className="rounded-full bg-emerald-400 px-4 text-slate-900 hover:bg-emerald-300"
                        onClick={() => handleMarkReady(order.id)}
                      >
                        Mark ready
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

        <footer className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/10 px-6 py-4 text-xs text-slate-300 backdrop-blur">
          <div className="flex items-center gap-2">
            <LeafyGreen className="h-4 w-4 text-emerald-300" />
            Mise prepped · ready for next wave
          </div>
          <Button
            variant="ghost"
            className="rounded-full text-slate-200 hover:bg-white/10"
            disabled
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Auto-refresh enabled
          </Button>
        </footer>
      </div>
    </div>
  );
}

