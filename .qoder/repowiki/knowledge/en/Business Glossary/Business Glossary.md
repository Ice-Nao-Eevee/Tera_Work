---
kind: business_term
name: Business Glossary
category: business_term
scope:
    - '**'
---

### Warkop Betawa
- Definition：The project's product name — a Next.js-based digital menu and order system for a warung (Indonesian eatery). All routes, menus, and admin screens revolve around this brand.

### orderCode
- Definition：Human-readable order identifier in the format `ARU-XXXX` (e.g. `ARU-4821`) shown to customers on the status page and used by staff for verbal reference; distinct from the internal MongoDB ObjectId.
- Aliases：order number

### PB1
- Definition：Internal shorthand for the tax rate (Pajak) stored in the `Settings` singleton; displayed to customers as 'tax' and calculated at checkout using `taxRatePercent`.
- Aliases：tax

### service charge
- Definition：A fixed-percentage surcharge (default 5%) applied on top of subtotal alongside PB1/tax; rate is controlled centrally in the Settings document so admin changes propagate to future orders without redeploying.
- Aliases：service fee

### QR scan landing
- Definition：The `/table/[tableId]?token=...` entry point reached by scanning a table's QR code; it saves the table session and redirects the customer to the menu/order flow.
- Aliases：table link

### admin panel
- Definition：The protected dashboard at `/admin` used by staff to manage menu items, categories, promos, orders, settings, tables, and coupons. Login is local-only (localStorage/sessionStorage) with default credentials `admin` / `admin123`.
- Aliases：dashboard

### Kupon Hemat
- Definition：Indonesian term for discount coupon; the seeded default codes include `BETAWAHEMAT` (20% percentage discount) and `KASIH10K` (fixed Rp 10,000 off). Coupons support `PERCENTAGE` or `FIXED` discount types with min-order and max-discount caps.
- Aliases：coupon
