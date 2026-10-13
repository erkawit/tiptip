# ⚡ TipTip Live — LiveStream Donation & Alert Notification Platform (SaaS)

> A modern, ergonomic SaaS alternative to Streamlabs and Tipme, styled in a bespoke **Deep Forest Green** (`#064E3B`), **Neon Emerald** (`#10B981`), and **Deep Obsidian** (`#090D0C`) tactical design system.

---

## 🌟 Key Highlights

- **⚡ Zero-Latency OBS Alerts**: Instant browser source updates via Supabase Realtime and broadcast channels with an automated FIFO queue buffer.
- **🔊 Howler Audio Engine**: Reliable audio chime playback for OBS browser sources, with Web Audio API synthetic fallback chimes and Web Speech Text-to-Speech (TTS).
- **💳 Multi-Gateway Checkouts**: PromptPay QR, TrueMoney Wallet, and Stripe International Cards with automated idempotency guards.
- **🎨 Custom Alert Studio**: Real-time live canvas sandbox to preview sound volumes, animated GIFs, Google/custom typography, and template variables (`{donor_name}`, `{amount}`, `{currency}`, `{message}`).
- **🛡️ Enterprise Supabase PostgreSQL**: Full Row-Level Security (RLS) policies, automatic balance recalculation via Postgres triggers, and Storage buckets.
- **👑 Super Admin & Payouts**: Real-time GMV analytics, 3% platform fee ledger, streamer verification/banning tools, and webhook health diagnostics.

---

## 🏗️ Project Architecture & Directory Structure

```
tiptip/
├── .github/
│   └── workflows/
│       └── ci.yml                     # GitHub Actions CI for TypeScript & build tests
├── public/                            # Static assets and demo media
├── src/
│   ├── app/
│   │   ├── [streamer_slug]/           # Public Donor Portal (e.g. /chromakitsune)
│   │   │   └── page.tsx
│   │   ├── admin/                     # Super Admin Panel (GMV, Payouts, Bans)
│   │   │   └── page.tsx
│   │   ├── api/
│   │   │   ├── donations/             # Donation intake API
│   │   │   └── webhooks/
│   │   │       ├── stripe/            # Stripe Webhook with signature & idempotency
│   │   │       └── truemoney/         # TrueMoney / PromptPay reconciliation webhook
│   │   ├── dashboard/
│   │   │   ├── page.tsx               # Streamer Overview & OBS URL Generator
│   │   │   ├── studio/page.tsx        # Alert Customization Studio & Live Sandbox
│   │   │   ├── donations/page.tsx     # Transaction History Ledger & CSV Export
│   │   │   └── payouts/page.tsx       # PromptPay & Bank Payout Requests
│   │   ├── overlay/
│   │   │   └── [widgetToken]/         # Transparent OBS Browser Source Endpoint
│   │   │       └── page.tsx
│   │   ├── globals.css                # Forest Green / Emerald tokens & SweetAlert2 classes
│   │   ├── layout.tsx                 # Root Layout with ThemeProvider
│   │   └── page.tsx                   # Showcase Landing Page
│   ├── components/
│   │   ├── DashboardNavbar.tsx        # Streamer navigation header with live balance
│   │   ├── ThemeProvider.tsx          # Next-themes dark/light mode provider
│   │   └── ThemeToggle.tsx            # Interactive theme toggle button
│   └── lib/
│       ├── sound.ts                   # Howler.js audio engine, synth chime & TTS
│       ├── swal.ts                    # Customized SweetAlert2 Forest & Emerald modal
│       ├── types.ts                   # Unified TypeScript schemas & models
│       └── supabase/
│           ├── client.ts              # Browser Supabase client
│           ├── admin.ts               # Service role admin client
│           ├── server.ts              # Server actions client
│           └── mock-data.ts           # Demo streamer, widget settings & donations
├── supabase/
│   ├── migrations/
│   │   └── 20241012000000_initial_schema.sql  # Complete SQL migration with RLS
│   └── seed.sql                       # Seed data for demo testing
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json                        # Vercel deployment & OBS iframe security headers
└── package.json
```

---

## 🎨 Design System Tokens

| Element | Dark Mode Token | Light Mode Token | Hex Code |
| :--- | :--- | :--- | :--- |
| **Primary Identity** | Deep Forest (`forest-800`) | Forest Green | `#064E3B` / `#042F2E` |
| **Accent / Neon Pop** | Emerald Pop (`neon-500`) | Emerald Mint | `#10B981` / `#34D399` |
| **Background Neutral**| Deep Obsidian (`obsidian-950`) | Mint Slate (`mintlight-50`)| `#090D0C` / `#F7FAF8` |
| **Card Surface** | Tactical Zinc (`obsidian-900`) | Soft Mint (`mintlight-100`)| `#121816` / `#EDF4F0` |
| **VIP / Top Donor** | Warm Gold (`ambervip-500`) | Amber Gold | `#F59E0B` |

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎥 OBS Studio Integration Guide

1. Open your Streamer Dashboard at `/dashboard`.
2. Click **Copy Link** under **OBS Studio Browser Source URL**.
3. In OBS Studio:
   - Click the **`+`** icon under **Sources** -> Select **Browser**.
   - Paste the copied URL (`http://localhost:3000/overlay/[token]`).
   - Set **Width**: `800` (or `1920`), **Height**: `600` (or `1080`).
   - Check **"Control audio via OBS"** or leave unchecked to let OBS route browser audio directly.
   - Click **OK**.
4. Return to your Dashboard or Alert Studio and click **"Test Alert"** to watch the visual burst and hear the chime trigger live on your OBS canvas!

---

## 🗄️ Database Setup (Supabase)

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to the **SQL Editor**.
3. Copy and execute the contents of [`supabase/migrations/20241012000000_initial_schema.sql`](supabase/migrations/20241012000000_initial_schema.sql).
4. Run [`supabase/seed.sql`](supabase/seed.sql) to populate demo streamers, widgets, and sample donations.

---

## 🌐 Production Deployment (Vercel)

The repository includes a production-ready `vercel.json` configured with appropriate CORS headers (`Access-Control-Allow-Origin: *`) and iframe framing headers (`X-Frame-Options: ALLOWALL`) specifically required for OBS Studio and Streamlabs browser sources.
