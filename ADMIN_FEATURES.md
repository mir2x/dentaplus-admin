# DentaPlus Admin (Super-Admin) — Feature List & Roadmap

## Context

The `dentaplus-admin` panel is the internal super-admin tool, but today it only has
**Orders**, **Products**, and **Customers** lists plus login — the home route just redirects
to `/orders` (no dashboard). Meanwhile the backend already exposes a large set of
admin-gated capabilities with **no UI** (credit review, invoicing, statements, QuickBooks,
promo codes, offers, content, review moderation), and a few areas need **new backend work**
(analytics, settings, inventory tools, AR reporting).

This document is a **brainstormed, prioritized feature list** to turn the panel into a tool
that runs the whole business — led by the **B2B credit / invoicing / QuickBooks** operations
just built. Decisions: **operations-first** priority; **single super-admin** (no staff/role
management yet); list includes both backend-ready and backend-gap features, **tagged**.

Legend: ✅ backend endpoint already exists · 🔧 needs new backend work.

## Existing admin conventions to reuse

- Next.js App Router with an `(admin)` route group + `(admin)/layout.tsx`; nav in
  `src/components/layout/admin-sidebar.tsx`.
- Per-domain folders `src/components/{orders,products,customers}/` using a `*-view.tsx` list
  + `*-detail-sheet.tsx` / `*-edit-sheet.tsx` slide-over pattern — **follow this for every
  new section**.
- axios client `src/lib/api.ts` (Bearer from Zustand `src/stores/auth.ts`, 401→login),
  TanStack Query for fetching, shadcn/ui components.

---

## Tier 1 — Operations: Credit / Invoicing / QuickBooks / AR  (lead)

1. **Ops dashboard home** — KPI cards: revenue, orders today/MTD, pending credit
   applications, total AR outstanding + aging split, overdue invoices, failed/ pending QBO
   pushes, low-stock count. Replaces the `/orders` redirect. 🔧 *(needs an analytics summary
   endpoint)*
2. **Credit application review queue** — list/filter by status, detail view of the full
   application, **Approve / Reject** (generates `dentaplusId`). ✅ `GET /admin/credit-applications`,
   `GET :id`, `PATCH :id/review`.
3. **Invoices & credit notes** — list (filter by customer/status/QBO sync state), create
   invoice + credit note, download PDF, show `syncStatus` (DRAFT/OPEN/PARTIAL/PAID) +
   QuickBooks link + payment ledger. Create/PDF ✅ (`POST /admin/invoices`, `/admin/credit-notes`,
   `GET /admin/invoices/:id/pdf`); **admin-wide invoice list + filters** 🔧 *(today invoices
   are per-user only)*.
4. **Statements** — per-customer list, **Generate monthly** button, PDF, opening/closing
   balance. ✅ `POST /admin/statements`, `/admin/statements/generate-monthly`, PDF.
5. **QuickBooks control panel** — connection status, Connect/Disconnect, company info,
   **Run reconcile**, per-order **Push to QBO** + re-push, surface pending-sync orders &
   webhook/CDC health. ✅ `GET /admin/quickbooks/status|connect|company-info`,
   `POST /admin/quickbooks/disconnect|reconcile|orders/:id/push`.
6. **Accounts Receivable / aging report** — all credit customers with balance + aging
   buckets (0/30/60/90/120+), drill into a customer's open invoices. Per-user balance exists;
   **aggregate AR report endpoint** 🔧.
7. **Orders ↔ QBO surfacing** — on the existing order detail, show whether it's a credit
   order, its QBO invoice #/status, and a Push button. ✅ (reuses push endpoint).

## QuickBooks → Backend Sync (Products, Customers, Inventory) — one-way, read-only

QBO is the **source of truth** for products, customers, and stock; the backend mirrors them
and never writes back. Reuses the existing webhook + CDC infra (today Invoice + Payment) by
extending it to **Item** and **Customer**.

**Wiring (reuse):** subscribe to **Item** + **Customer** on the Intuit Webhooks page; add
`Item`, `Customer` to the CDC entity list in `runCdcReconciliation()` and to
`applyEntityChange()` in `src/quickbooks/quickbooks-sync.service.ts`.

**Item → Product / InventoryStock:** match `Product` by `quickbooksItemId`, else SKU; **no
match → create an unpublished draft** (`published=false`). Sync name, description,
`UnitPrice`→`Price(REGULAR)`, SKU, and `QtyOnHand`→`InventoryStock.quantity`+`inStock`. QBO
item deleted/inactive → `published=false` (never hard-delete).

**Customer → User (+ CustomerAddress):** match `User` by `quickbooksCustomerId`, else email;
**no match → create a User with no password** (`passwordHash=null`, can't log in until
invited). Sync display/company name, first/last, phone, email, billing address. Credit-account
status stays admin-owned (not a QBO field).

**Admin implication (field-partitioned in practice):**
- **Products** screen: QBO-owned fields (name, price, SKU, stock, description) are **read-only**;
  staff may still edit **storefront-only** fields with no QBO equivalent (images, slug,
  category, brand, publish, SEO) — needed to finish the auto-created drafts.
- **Customers** screen: profile is **read-only** (QBO); credit review + `isActive` stay
  admin-managed.

**Schema:** `Product.quickbooksItemId`, `User.quickbooksCustomerId` already exist;
`passwordHash` already nullable. Optional `quickbooksManaged` flags on `Product`/`User` to
drive the read-only UI.

## Tier 2 — Catalog & Inventory

- **Products** — **QBO-driven (read-only core)**: name/price/SKU/stock/description synced from
  QBO; admin edits only storefront-only fields (images via S3 upload, slug, category, brand,
  publish/feature, SEO) to complete auto-created drafts. Storefront-field editing ✅
  (`/admin/products`, `/admin/upload`); read-only core + draft-completion UX 🔧.
- **Brands & Categories** management. ✅ (`/admin/brands`, `/admin/categories`).
- **Inventory** — low-stock / out-of-stock views, **read-only** (stock owned by QBO). 🔧.
- **Wholesale / tiered pricing rules** (`WholesalePriceRule`) CRUD. 🔧.

## Tier 3 — Orders & Customers

- **Orders** — already listed; add status workflow, fulfillment, consignment/tracking UI.
  ✅ (`PATCH /admin/orders/:id/status|fulfillment|consignment`).
- **Customers** — list ✅; add a **customer 360** detail (profile, orders, invoices,
  statements, credit status, activate-deactivate). Profile is **read-only** (QBO-synced);
  credit review + `isActive` stay admin-managed. List/update ✅; **customer detail endpoint** 🔧.

## Tier 4 — Marketing

- **Promo codes** CRUD + usage. ✅ (`/admin/promo-codes`).
- **Product offers** (quantity-triggered rewards) CRUD. ✅ (`/admin/offers`).

## Tier 5 — Content & Support

- **Blog** posts CRUD ✅, **FAQ** CRUD ✅, **Contact messages** inbox (read/delete) ✅,
  **Review moderation** (delete) ✅. (All under content/reviews controllers.)

## Tier 6 — Platform

- **Settings** — GST divisor, free-ship threshold, flat shipping, invoice due terms (today
  hardcoded constants). 🔧 *(settings model + endpoints)*.
- **Audit log / activity feed** (who approved/changed what). 🔧.
- **Notifications** — new credit application, failed QBO push, etc. 🔧.
- *Deferred:* staff accounts + role-based permissions (single super-admin for now).

---

## Backend gaps to build (consolidated)

| Gap | Used by |
|---|---|
| Analytics/dashboard summary endpoint | Tier 1.1 |
| Admin-wide invoice list + filters | Tier 1.3 |
| AR aging aggregate report | Tier 1.6 |
| Customer 360 detail endpoint | Tier 3 |
| Settings model + CRUD | Tier 6 |
| Inventory views (read-only); wholesale price rules CRUD | Tier 2 |
| Extend webhook + CDC to Item + Customer (QBO→backend sync) | Products/Customers sync |
| (later) audit log, notifications, staff/roles | Tier 6 |

## Suggested build sequence

Sidebar/nav + dashboard shell → **Tier 1 (2→3→4→5→6→1)** as the operations core →
Tier 2 catalog depth → Tier 3 customer 360 → Tier 4 marketing → Tier 5 content → Tier 6
platform. Build backend gaps just-in-time before each dependent UI section.

## Verification

For each section: run the admin app (`pnpm dev`), log in as super-admin, and confirm the
new page reads/writes against its endpoint (existing ✅ endpoints) or the newly added one
(🔧). End-to-end smoke per tier, e.g. Tier 1: approve a credit application → place a credit
order → see it pushed to QBO from the QBO panel → generate a statement → view it in the AR
report.
