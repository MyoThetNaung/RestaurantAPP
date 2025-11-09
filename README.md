## PulseBite · Restaurant Ordering System

A polished, multi-persona restaurant experience powered by **Next.js 16**, **Firebase**, **TailwindCSS v4**, and **Shadcn/UI**.

The platform ships with three demo environments:

- `Admin Control` – analytics, live order queue, and menu management.
- `Kitchen Display` – focused ticket rail with priority filters and pass actions.
- `Guest Menu` – mobile-first QR ordering with a curated, interactive menu.

## Tech Stack

- **Frontend:** Next.js App Router, TypeScript, TailwindCSS v4, Shadcn/UI, lucide-react icons
- **State & Auth:** Firebase Auth + Firestore (realtime-ready via hooks)
- **Styling:** Modern glassmorphism vibes, gradient treatments, dark-mode aware
- **Deployment:** Optimised for Vercel (edge-ready)

## Quickstart

1. Install dependencies

   ```bash
   npm install
   ```

2. Configure Firebase by populating `.env.local` (already scaffolded) with these public values:

   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC9Q-M_GsQrrG8dKAWGVsnX3XkZO2LlUkU
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=restaurant-f01ac.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=restaurant-f01ac
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=restaurant-f01ac.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=864105851973
   NEXT_PUBLIC_FIREBASE_APP_ID=1:864105851973:web:99c47746f7b8381091472c
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-891LLM9S84
   ```

3. Run the dev server

   ```bash
   npm run dev
   ```

4. Explore the demos:
   - http://localhost:3000 – welcome portal (panel selection)
   - http://localhost:3000/admin – admin control room (email/password auth)
   - http://localhost:3000/kitchen – kitchen display (email/password auth)
   - http://localhost:3000/table/demo – guest QR menu preview (replace `demo` with a Firestore table id)

## Next Steps

- Wire the static data models to live Firestore collections (orders, menu, tables).
- Add Firebase Auth guards (admin, kitchen, guest roles) via middleware.
- Layer in analytics charts (e.g., Recharts or Tremor) for richer insights.
- Deploy to Vercel and configure environment variables in the dashboard.

---

Crafted with care. Feel free to adapt layouts, hook into realtime Firestore listeners, and extend flows like payments and table management. Enjoy!
