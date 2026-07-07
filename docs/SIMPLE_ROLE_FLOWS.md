# SalonSupply — Simple Guide (Current Flow by Role)

Easy language · What each person does · Step by step

> **Technical FSD:** see [FSD.md](./FSD.md)  
> **Daily how-to:** see [USER_GUIDE.md](./USER_GUIDE.md)

---

## What is SalonSupply?

SalonSupply helps **distributors** sell beauty products to **salons** (parlours).

- **Salon** orders products in the app.  
- **Distributor** sends products and approves orders.  
- **Salesman** visits salons and can record when payment is received.  
- **Super Admin** can see and manage everything.

**Money:** Salons pay in **cash, UPI, or bank** in real life. The app does **not** take online payment automatically. Distributor or salesman **clicks “payment received”** after they get the money.

---

## How to open the app

| What | Where |
|------|--------|
| Website | http://localhost:3000 |
| Login | http://localhost:3000/login |
| Start website | In folder `client` → `npm run dev` |
| Start API | In folder `server` → `npm run dev` |
| Database | MySQL, name `salonsupply` (XAMPP) |

---

## Test logins

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@salonsupply.com | password123 |
| Distributor | john@example.com | password123 |
| Salesman | salesman@example.com | password123 |
| Salon | salon@example.com | password123 |

---

## One story — how everyone works together

```
1. Distributor adds products and adds salons.
2. Salon logs in, adds items to cart, places order → status = PENDING.
3. Distributor opens Orders, approves → APPROVED → PROCESSING → DELIVERED.
4. Salon pays distributor (cash/UPI) outside the app.
5. Distributor or Salesman opens Payments, clicks “Confirm payment received”.
6. Order shows PAID. Salon sees “Payment collected” on track.
```

---

## Order status (delivery) — simple meaning

| Status | Meaning |
|--------|---------|
| **Pending** | New order. Waiting for distributor to accept. |
| **Approved** | Distributor accepted. Will prepare/send. |
| **Processing** | On the way / packing. |
| **Delivered** | Salon received the goods. |
| **Rejected** | Distributor said no to this order. |

**Who changes status?** Only **Distributor** and **Super Admin**.

---

## Payment status (money) — simple meaning

| Status | Meaning |
|--------|---------|
| **Unpaid** | No payment recorded in app yet. |
| **Partial** | Some money recorded; still owes more. |
| **Paid** | Full amount recorded in app. |

**When can you record payment?** Only after order is **not Pending** (must be Approved, Processing, or Delivered first).

---

## Track order (5 steps on screen)

1. Order placed  
2. Confirmed (approved)  
3. Out for delivery (processing)  
4. Delivered  
5. Payment collected (paid in app)

---

# Role 1 — SALON (parlour customer)

**Who:** Owner/staff of a beauty salon (e.g. Royal Beauty Salon).

**Menu:** Dashboard · Products · Orders

### What salon can do

| Can do | Cannot do |
|--------|-----------|
| See products | Add/edit products |
| Place orders | Approve orders |
| Track orders | Record payments |
| Cancel **pending** orders only | See other salons |

### Salon workflow (step by step)

```
LOGIN
  → salon@example.com / password123

DASHBOARD
  → See active orders count
  → Click "Order Supplies" to go to Products

PRODUCTS
  → Browse items
  → Add quantity to cart
  → Click "Order Now"
  → Confirm → order created (PENDING)

ORDERS
  → See your orders
  → Columns: Delivery status, Payment, Track
  → Click eye icon for details + full track line

CANCEL (only if still Pending)
  → Trash icon on order → stock goes back to distributor

PAY (real world)
  → Pay distributor by cash/UPI/bank (not in app)

WAIT
  → Distributor/salesman records payment in app
  → You see Payment = Paid on Orders page
```

---

# Role 2 — DISTRIBUTOR (wholesaler)

**Who:** Supplies products to many salons (e.g. John Doe).

**Menu:** Dashboard · Products · Orders · Salons · Salesmen · Payments

### What distributor can do

| Can do | Cannot do |
|--------|-----------|
| Add/edit/delete products | — |
| Add brand & category | — |
| Add salons & salesmen | — |
| Approve and deliver orders | — |
| Place order for a salon | — |
| Record payments | — |
| View salesman routes | Login as salon |

### Distributor workflow — SETUP (first time)

```
LOGIN
  → john@example.com / password123

PRODUCTS → Add Product
  → Name, price, stock, SKU, image link
  → Brand: type new name → click "Add" (or Save creates it)
  → Category: same way
  → Save product

SALONS → Add Salon
  → Salon name, owner, phone, address

SALESMEN → Add Salesman
  → Name, phone (field rep)
```

### Distributor workflow — EVERY DAY

```
ORDERS (morning)
  → Open Orders
  → New orders show PENDING
  → Open order → set APPROVED
  → Later: PROCESSING → DELIVERED

PAYMENTS (after salon pays you offline)
  → Open Payments
  → If yellow box "Waiting for approval" → approve order on Orders first
  → Under "Record payment" → Confirm payment received
  → Enter amount, Cash/UPI/Bank, optional UPI reference
  → Save → order becomes PAID

SALONS (when needed)
  → View History → that salon's orders
  → Create Order → order for salon from your stock

SALESMEN (when needed)
  → View Routes → which salons rep should visit
```

---

# Role 3 — SALESMAN (field rep)

**Who:** Works for distributor, visits salons (e.g. Mike Salesman).

**Menu:** Dashboard · Orders · Salons · Payments

### What salesman can do

| Can do | Cannot do |
|--------|-----------|
| See all orders for their distributor | Change order status (approve/deliver) |
| See salon list | Add/edit products |
| Record payments | Add salons or salesmen |
| View payment history | See Products menu |

### Salesman workflow (step by step)

```
LOGIN
  → salesman@example.com / password123

DASHBOARD
  → See targets / recent activity (summary)

SALONS
  → List of parlours to visit today

ORDERS
  → See ALL orders for your distributor
     (including orders salon placed alone)
  → Open order → read track + payment (cannot approve)

FIELD VISIT
  → Collect cash/UPI from salon

PAYMENTS
  → Confirm payment received
  → Same form as distributor (amount, method, reference)
  → Payment history shows what you recorded
```

**Note:** Salesman does **not** approve orders. If order stays Pending, tell distributor to approve on Orders page.

---

# Role 4 — SUPER ADMIN (platform boss)

**Who:** Runs the whole SalonSupply platform.

**Menu:** Same as distributor — Dashboard · Products · Orders · Salons · Salesmen · Payments

### What super admin can do

- Everything distributor can do, but sees **wider** data (all distributors / all orders depending on data in DB).
- Approve orders, record payments, manage products, salons, salesmen.

### Super admin workflow (step by step)

```
LOGIN
  → admin@salonsupply.com / password123

MONITOR
  → Dashboard → check orders across system

ORDERS
  → Help approve stuck PENDING orders
  → Move to Delivered when needed

PRODUCTS / SALONS / SALESMEN
  → Fix catalog, add salons, add reps same as distributor

PAYMENTS
  → Record or verify collections

SALESMEN → View Routes
  → See which salons a rep should cover
```

---

## Payments page — same for Distributor, Salesman, Super Admin

| Section | What it means |
|---------|----------------|
| **Total Collected** | All payments you recorded in app |
| **Pending Amount** | Orders delivered/approved but not fully paid |
| **Waiting for approval** | Order still Pending — go to Orders and approve first |
| **Record payment** | Ready to mark paid — click Confirm payment received |
| **Payment history** | List of past collections with date and method |

**Success rule:** Payment is “successful” in the app when **you** confirm you received the money. No auto bank check.

---

## Products page — brand & category (Distributor & Super Admin)

1. Products → **Add Product** or **Edit** (pencil).  
2. **Brand:** type name → **Add** or just **Save**.  
3. **Category:** type name → **Add** or just **Save**.  
4. Card shows: `BRAND NAME · CATEGORY` (e.g. `LOREAL · SHAMPOO`).  
5. If no category: shows `Uncategorized`.

---

## Quick “who does what” table

| Task | Salon | Salesman | Distributor | Super Admin |
|------|:-----:|:--------:|:-----------:|:-----------:|
| Place order | Yes | — | For salon | Yes |
| Approve / deliver order | — | — | Yes | Yes |
| Record payment | — | Yes | Yes | Yes |
| Manage products | — | — | Yes | Yes |
| Add salon | — | — | Yes | Yes |
| Add salesman | — | — | Yes | Yes |
| View routes | — | — | Yes | Yes |
| Cancel pending order | Yes | — | Yes | Yes |

---

## Test the full flow (5 minutes)

1. **Salon** — Products → Order Now → Orders shows Pending.  
2. **Distributor** — Orders → Approve → Delivered.  
3. **Salesman** — Payments → Confirm payment (Cash, any amount).  
4. **Salon** — Orders → Payment = Paid, Track step 5 done.

---

## Files in this project

| File | For |
|------|-----|
| `docs/SIMPLE_ROLE_FLOWS.md` | This document — simple role flows |
| `docs/USER_GUIDE.md` | Longer user manual |
| `docs/FSD.md` | Full technical specification |

---

*Version: May 2026 — matches current SalonSupply build.*
