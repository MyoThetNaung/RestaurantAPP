import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  ChefHat,
  CookingPot,
  Flame,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const panels = [
  {
    name: "Admin Control",
    description:
      "Track live sales, manage menus, and orchestrate service effortlessly.",
    href: "/admin",
    icon: TrendingUp,
    accent: "from-amber-400/80 via-orange-500/70 to-orange-600/60",
  },
  {
    name: "Kitchen Display",
    description:
      "Receive tickets instantly, prioritize cooking, and keep dishes flowing.",
    href: "/kitchen",
    icon: CookingPot,
    accent: "from-lime-400/80 via-emerald-500/70 to-teal-600/60",
  },
  {
    name: "Guest Menu",
    description:
      "Delight guests with a fast, mobile-first ordering experience via QR.",
    href: "/table/demo",
    icon: MonitorSmartphone,
    accent: "from-fuchsia-400/80 via-purple-500/70 to-indigo-600/60",
  },
];

const highlights = [
  {
    title: "Real-time Sync",
    description:
      "Every screen updates instantly with Firestore-backed state, no refresh required.",
    icon: Sparkles,
  },
  {
    title: "Role-based Access",
    description:
      "Secure Firebase Auth guard ensures each persona only sees what they need.",
    icon: ShieldCheck,
  },
  {
    title: "Menu Experiments",
    description:
      "Launch seasonal dishes, adjust pricing, and push updates to guests in seconds.",
    icon: Flame,
  },
  {
    title: "Service Rhythm",
    description:
      "Kitchen load, table turn time, and fulfillment status at a glance.",
    icon: ChefHat,
  },
];

export default function Home() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex h-[40rem] justify-center blur-3xl">
        <div className="mt-[-6rem] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle_at_center,theme(colors.orange.300)/70%,transparent)] dark:bg-[radial-gradient(circle_at_center,theme(colors.orange.500)/40%,transparent)]" />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-16 px-6 pb-20 pt-28 md:px-10 lg:px-16">
        <section className="flex flex-col items-center text-center md:text-left md:items-start">
          <Badge className="mb-6 rounded-full border border-white/20 bg-white/70 px-4 py-1 text-sm font-medium text-slate-900 shadow-sm backdrop-blur dark:bg-white/10 dark:text-white">
            PulseBite · Restaurant OS
          </Badge>
          <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl lg:text-6xl dark:text-slate-100">
            Run your entire dining room from a single, beautifully crafted
            workspace.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            PulseBite brings operators, chefs, and guests together. Launch QR
            menus, monitor the kitchen queue, and steer the business using a
            cohesive interface powered by Firebase.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="group h-12 rounded-full bg-slate-900 px-8 text-base font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
            >
              <Link href="/admin">
                Explore the admin demo
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-white/60 bg-white/60 backdrop-blur-sm hover:bg-white dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/20"
            >
              <Link href="/customer">Scan the guest menu preview</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {panels.map((panel) => (
            <Card
              key={panel.name}
              className="group relative overflow-hidden border border-white/50 bg-white/70 shadow-xl shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/10 dark:border-white/10 dark:bg-white/5"
            >
              <div
                className={`pointer-events-none absolute inset-x-4 top-4 h-32 rounded-3xl bg-gradient-to-br ${panel.accent} opacity-80 blur-2xl transition group-hover:opacity-100`}
              />
              <CardHeader className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/60 bg-white/80 text-slate-900 shadow-sm backdrop-blur dark:border-white/20 dark:bg-white/10 dark:text-white">
                    <panel.icon className="h-6 w-6" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full border border-transparent text-slate-600 transition hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    asChild
                  >
                    <Link href={panel.href}>
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                </div>
                <CardTitle className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {panel.name}
                </CardTitle>
                <CardDescription className="text-base text-slate-600 dark:text-slate-300">
                  {panel.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <Link
                  href={panel.href}
                  className="inline-flex items-center text-sm font-medium text-slate-900 transition hover:text-slate-700 dark:text-white dark:hover:text-slate-200"
                >
                  Go to {panel.name}
                  <ArrowRight className="ml-2 inline h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/70 p-10 shadow-lg shadow-slate-900/5 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Built for high-velocity hospitality
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Launch PulseBite in minutes. Connect to Firebase, invite your
                team, and unify service across front-of-house, kitchen, and
                guests.
              </p>
            </div>
            <Button
              asChild
              className="h-11 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 px-6 text-base font-semibold text-white shadow-lg shadow-orange-500/40 hover:from-orange-600 hover:via-amber-600 hover:to-rose-600"
            >
              <Link href="/admin">Launch the Control Room</Link>
            </Button>
          </div>
          <Separator className="my-8 border-white/50 dark:border-white/10" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {highlights.map((item) => (
              <Card
                key={item.title}
                className="border border-white/60 bg-white/50 shadow-md shadow-slate-900/5 backdrop-blur dark:border-white/10 dark:bg-white/10"
              >
                <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/90 text-white shadow-sm dark:bg-white/20">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-slate-900 dark:text-white">
                      {item.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
                      {item.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

