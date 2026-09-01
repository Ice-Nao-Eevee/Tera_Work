# Selera Sambal — Digital Menu & Order System

A Next.js 14 restaurant ordering app with a full MongoDB backend.

---

## Prerequisites

- **Node.js** 18+
- **MongoDB** running locally (or a MongoDB Atlas URI)

### Install & Start Local MongoDB (Windows)

1. Download from https://www.mongodb.com/try/download/community
2. Install and start the service:
   ```powershell
   # If installed as a service, it auto-starts. Otherwise:
   mongod --dbpath "C:\data\db"
   ```
   Or use [MongoDB Compass](https://www.mongodb.com/products/compass) (GUI tool).

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
copy .env.example .env.local
# Edit .env.local — the default local URI works out of the box:
# MONGODB_URI=mongodb://localhost:27017/selera-sambal

# 3. Start the dev server
npm run dev
```

The database is **automatically seeded** on first startup (menu items, categories, promo, settings, and tables 1–10).

---

## Switching to Production (MongoDB Atlas)

Just change `MONGODB_URI` in `.env.local` — no code changes needed:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/selera-sambal?retryWrites=true&w=majority
```

---

## Architecture & Routes

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/table/[tableId]?token=...` | QR scan landing — saves table session |
| `/menu` | Customer-facing menu (live from MongoDB) |
| `/menu/[itemId]` | Item detail + add-ons selector |
| `/cart` | Cart review + notes |
| `/checkout` | Order confirmation + submit |
| `/order/[orderId]` | Live order status (polls every 5s) |
| `/admin` | Admin dashboard (protected by local login) |

### API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/menu` | List all active menu items + categories |
| POST | `/api/menu` | Create menu item |
| GET/PUT/DELETE | `/api/menu/[id]` | Single menu item CRUD |
| GET/POST | `/api/categories` | List / create categories |
| PUT/DELETE | `/api/categories/[id]` | Update / delete category |
| GET/POST | `/api/promos` | List active promos / create promo |
| PUT/DELETE | `/api/promos/[id]` | Update / delete promo |
| GET/POST | `/api/orders` | List all orders / create order |
| GET/PATCH/DELETE | `/api/orders/[id]` | Get, update status, delete order |
| GET/PUT | `/api/settings` | Get / update tax rates + restaurant info |
| GET/POST | `/api/tables` | List / create tables |
| DELETE | `/api/tables/[id]` | Delete a table |

---

## Data Model Decisions

### `MenuItem.category` — String slug, not ObjectId ref
The existing UI filters menu items by comparing category slugs (e.g. `"makanan"`, `"minuman"`). To avoid a significant UI rewrite, `category` is stored as a plain slug string rather than a MongoDB ObjectId reference. The `Category` collection is the source of truth for slugs; the admin panel uses category slugs when creating/editing menu items.

### Tax rates — Single source of truth
Tax (PB1) and service charge rates are stored as a singleton `Settings` document in MongoDB (`taxRatePercent`, `serviceChargeRatePercent`). Cart and checkout pages fetch these rates from `/api/settings` on mount, so updating them in the admin Settings panel immediately affects all future customer orders — no code or deployment needed.

### Order codes
Orders use human-readable codes in the format `ARU-XXXX` (e.g. `ARU-4821`) rather than MongoDB ObjectIds. This is what customers see on their status page and what staff use to reference orders verbally.

---

## Admin Panel

- **URL**: `/admin`
- **Default credentials**: `admin` / `admin123` (change in Settings)
- Login is local-only (stored in localStorage/sessionStorage) — not a production auth system.
- All data mutations (menu items, categories, promos, orders, settings) persist to MongoDB.
- Orders page auto-refreshes every 10 seconds to catch new customer orders.