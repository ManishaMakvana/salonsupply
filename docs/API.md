# SalonSupply API Reference

REST API for the SalonSupply B2B ordering platform (salons, distributors, salesmen, super admins).

| Item | Value |
|------|--------|
| **Base URL** | `http://localhost:5000/api` (default; override with `PORT` env) |
| **Content-Type** | `application/json` (except file uploads) |
| **Auth** | JWT Bearer token, 24h expiry |
| **Static files** | Product images at `{API_HOST}/uploads/...` |

---

## Table of contents

1. [Authentication](#authentication)
2. [Common patterns](#common-patterns)
3. [Roles & scoping](#roles--scoping)
4. [Auth](#auth-endpoints)
5. [Products](#products)
6. [Catalog](#catalog)
7. [Orders](#orders)
8. [Salons](#salons)
9. [Salesmen](#salesmen)
10. [Payments](#payments)
11. [Notifications](#notifications)
12. [Favorites](#favorites-salon)
13. [Reports](#reports)
14. [Audit logs](#audit-logs)
15. [Enums & state machines](#enums--state-machines)

---

## Authentication

Protected routes require:

```http
Authorization: Bearer <jwt_token>
```

Obtain a token via `POST /api/auth/login`. The JWT payload includes `id`, `role`, and `distributor_id`.

| Status | Meaning |
|--------|---------|
| `401` | Invalid or expired token |
| `403` | Missing token (`No token provided`) or role not allowed (`Forbidden: Access denied`) |

---

## Common patterns

### Error responses

```json
{ "error": "Human-readable message" }
```

Server errors may also return `{ "error": "Something went wrong!" }` from the global handler.

### Pagination

List endpoints support optional `page` and `limit` query params. When **either** is present, the response is paginated:

```json
{
  "data": [ /* rows */ ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 48,
    "totalPages": 4
  }
}
```

When neither `page` nor `limit` is sent, many list endpoints return a **plain array** (backward compatible).

| Endpoint | Default limit | Max limit |
|----------|---------------|-----------|
| `GET /products` | 12 | 48 |
| `GET /orders` | 15 | 50 |
| `GET /audit` | 20 | 50 |

### Success messages

Mutations often return `{ "message": "..." }` plus resource IDs (`productId`, `orderId`, etc.).

---

## Roles & scoping

| Role | Scope |
|------|--------|
| `super_admin` | Platform-wide |
| `distributor` | Own `distributor_id` (products, salons, orders, payments, etc.) |
| `salesman` | Distributor territory; optional assigned salons via `salesman_salons` |
| `salon` | Own salon profile and orders; products from linked distributor |

Data is filtered server-side by role. Do not rely on client-side filtering for security.

---

## Auth endpoints

### `POST /api/auth/register`

**Public.** Create a user account.

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✓ | |
| `email` | string | ✓ | |
| `password` | string | ✓ | Plain text; hashed server-side |
| `role` | string | ✓ | e.g. `salon`, `distributor`, `salesman`, `super_admin` |
| `distributor_id` | number | | Nullable |
| `phone` | string | | Nullable |

**Response `201`**

```json
{ "message": "User registered successfully", "userId": 1 }
```

---

### `POST /api/auth/login`

**Public.**

**Body**

```json
{ "email": "user@example.com", "password": "secret" }
```

**Response `200`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "Jane",
    "email": "user@example.com",
    "role": "salon",
    "distributor_id": 2,
    "phone": null
  }
}
```

**Errors:** `401` Invalid credentials

---

### `GET /api/auth/me`

**Auth required.**

**Response `200`**

```json
{
  "user": {
    "id": 1,
    "name": "Jane",
    "email": "user@example.com",
    "role": "salon",
    "distributor_id": 2,
    "phone": null
  }
}
```

---

## Products

Base path: `/api/products`

### `GET /api/products`

**Roles:** All authenticated (scoped).

**Query**

| Param | Description |
|-------|-------------|
| `page`, `limit` | Pagination |
| `search` | Filter by name or SKU (`LIKE`) |
| `favorite_only` | `1` — salon only: products in favorites |

**Response:** Product array or paginated `data`. Each product includes `brand_name`, `category_name`.

---

### `GET /api/products/alerts/low-stock`

**Roles:** `distributor`, `super_admin`

Products where `stock <= low_stock_threshold` (default threshold 10).

**Query:** `distributor_id` — super_admin only, filter by distributor.

---

### `GET /api/products/:id`

**Roles:** All authenticated

**Response `200`:** Single product object  
**Response `404`:** Product not found

---

### `POST /api/products`

**Roles:** `distributor`, `super_admin`

**Body**

| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✓ |
| `description` | string | |
| `price` | number | ✓ |
| `stock` | number | ✓ |
| `brand_id` | number | |
| `category_id` | number | |
| `sku` | string | |
| `image` | string | URL path |
| `low_stock_threshold` | number | Default `10` |

**Response `201`:** `{ "message": "Product created", "productId": 1 }`

---

### `PUT /api/products/:id`

**Roles:** `distributor`, `super_admin` (distributor limited to own products)

**Body:** Same fields as create (partial update via full body in controller).

**Response `200`:** `{ "message": "Product updated" }`

---

### `POST /api/products/:id/upload`

**Roles:** `distributor`, `super_admin`

**Content-Type:** `multipart/form-data`  
**Field:** `image` (image file, max 5 MB)

**Response `200`**

```json
{ "message": "Image uploaded", "image": "/uploads/products/1234-photo.jpg" }
```

---

### `DELETE /api/products/:id`

**Roles:** `distributor`, `super_admin`

**Response `200`:** `{ "message": "Product deleted" }`

---

## Catalog

Base path: `/api/catalog`

### `GET /api/catalog/brands`

**Roles:** All authenticated

**Response:** `[{ "id", "name", "logo", "created_at" }, ...]`

---

### `POST /api/catalog/brands`

**Roles:** `distributor`, `super_admin`

**Body:** `{ "name": "Brand X", "logo": null }`

**Response `201`:** New brand, or `200` if name already exists (`existing: true`, `brandId`).

---

### `GET /api/catalog/categories`

**Roles:** All authenticated

**Response:** `[{ "id", "name", "created_at" }, ...]`

---

### `POST /api/catalog/categories`

**Roles:** `distributor`, `super_admin`

**Body:** `{ "name": "Shampoo" }`

**Response `201` / `200`:** Same idempotent pattern as brands (`categoryId`, `existing`).

---

## Orders

Base path: `/api/orders`

### Order status values

`pending` → `approved` | `rejected` → `processing` → `delivered`

### Payment status (on order)

`pending` | `partial` | `paid`

---

### `POST /api/orders`

**Roles:** `salon`, `salesman`, `distributor`, `super_admin`

Place an order. Stock is decremented immediately; order starts as `pending`.

**Body**

```json
{
  "salon_id": 3,
  "salesman_id": null,
  "items": [
    { "product_id": 10, "quantity": 2 }
  ]
}
```

| Role | `salon_id` |
|------|------------|
| `salon` | Ignored — uses linked salon |
| `salesman` / `distributor` / `super_admin` | Required |

**Response `201`**

```json
{
  "message": "Order placed successfully",
  "orderId": 42,
  "orderNumber": "ORD-1710000000-123"
}
```

**Errors:** Insufficient stock, unlinked salon, salon outside territory, etc. (`500` with `error` message).

---

### `GET /api/orders`

**Roles:** All authenticated (scoped)

**Query**

| Param | Description |
|-------|-------------|
| `page`, `limit` | Pagination |
| `salon_id` | Filter |
| `status` | Order status |
| `payment_status` | `pending`, `partial`, `paid` |
| `search` | Order number or salon name |

**Response:** Orders with `salon_name`, `item_count`, `paid_amount`.

---

### `GET /api/orders/:id`

**Roles:** All authenticated (must pass `canAccessOrder`)

**Response `200`**

```json
{
  "id": 42,
  "order_number": "ORD-...",
  "total_amount": "1500.00",
  "status": "approved",
  "payment_status": "partial",
  "paid_amount": 500,
  "balance_due": 1000,
  "items": [{ "product_id", "quantity", "price", "product_name", ... }],
  "payments": [{ "id", "amount", "payment_method", "payment_date", "notes" }]
}
```

---

### `GET /api/orders/:id/invoice`

**Roles:** All authenticated (scoped)

**Response:** `application/pdf` attachment (`invoice-{order_number}.pdf`)

---

### `PUT /api/orders/:id/status`

**Roles:** `distributor`, `super_admin`

**Body:** `{ "status": "approved" }` — one of: `pending`, `approved`, `rejected`, `processing`, `delivered`

**Response `200`:** `{ "message": "Order status updated" }`

Triggers notifications to salon on status change.

---

### `DELETE /api/orders/:id`

**Roles:** `salon`, `distributor`, `super_admin`

Cancel a **pending** order only. Restores stock and deletes the order.

**Response `200`:** `{ "message": "Order cancelled and removed" }`  
**Response `400`:** Not pending

---

## Salons

Base path: `/api/salons`

### `GET /api/salons/me`

**Roles:** `salon` only

Own salon profile with credit metrics.

**Response `200`**

```json
{
  "id": 1,
  "salon_name": "...",
  "credit_limit": 50000,
  "outstanding": 12000,
  "available_credit": 38000,
  "credit_used_percent": 24
}
```

---

### `GET /api/salons`

**Roles:** All authenticated

- `distributor`: own salons only  
- Others: per implementation (list includes `outstanding` per salon)

---

### `POST /api/salons`

**Roles:** `distributor`, `super_admin`

**Body**

| Field | Default |
|-------|---------|
| `salon_name`, `owner_name`, `phone`, `address` | Required |
| `credit_limit` | `50000` |

**Response `201`:** `{ "message": "Salon created", "salonId": 1 }`

---

### `PUT /api/salons/:id`

**Roles:** `distributor`, `super_admin`

**Body:** Any of `salon_name`, `owner_name`, `phone`, `address`, `credit_limit` (COALESCE update — omitted fields unchanged).

---

## Salesmen

Base path: `/api/salesmen`

### `GET /api/salesmen`

**Roles:** All authenticated (`distributor` scoped)

Includes `assigned_salon_count`.

---

### `POST /api/salesmen`

**Roles:** `distributor`, `super_admin`

**Body:** `{ "name": "...", "phone": "..." }`

**Response `201`:** `{ "message": "Salesman created", "salesmanId": 1 }`

---

### `GET /api/salesmen/:id/routes`

**Roles:** `distributor`, `super_admin`, `salesman` (salesman: own id only)

Territory salons for route planning.

**Response `200`**

```json
{
  "salesman": { "id", "name", "phone", "distributor_id" },
  "assigned_only": true,
  "salons": [
    { "id", "salon_name", "owner_name", "phone", "address", "order_count", "last_order_at" }
  ]
}
```

If no explicit assignments, returns all salons for the distributor (`assigned_only: false`).

---

### `GET /api/salesmen/:id/assignments`

**Roles:** `distributor`, `super_admin`

**Response:** `{ "salon_ids": [1, 2, 3] }`

---

### `PUT /api/salesmen/:id/assignments`

**Roles:** `distributor`, `super_admin`

Replace territory assignments.

**Body:** `{ "salon_ids": [1, 2, 3] }`

**Response:** `{ "message": "Salons assigned", "count": 3 }`

---

## Payments

Offline payment recording (no payment gateway).

Base path: `/api/payments`

### `GET /api/payments/summary`

**Roles:** All authenticated (scoped)

**Response**

```json
{
  "total_collected": 150000,
  "pending_amount": 42000,
  "order_count": 85
}
```

---

### `GET /api/payments`

**Roles:** All authenticated (scoped)

Last 100 payment records with `order_number`, `salon_name`, `order_total`.

---

### `GET /api/payments/unpaid-orders`

**Roles:** `distributor`, `super_admin`, `salesman`

**Response**

```json
{
  "ready_to_collect": [ /* approved/processing/delivered, unpaid */ ],
  "awaiting_approval": [ /* pending order status, unpaid */ ]
}
```

Each row includes `paid_amount`.

---

### `POST /api/payments`

**Roles:** `distributor`, `super_admin`, `salesman`

Record a payment against an approved (non-pending, non-rejected) order.

**Body**

| Field | Required | Notes |
|-------|----------|-------|
| `order_id` | ✓ | |
| `amount` | ✓ | Must be > 0 and ≤ balance due |
| `payment_method` | ✓ | `cash`, `upi`, or `bank_transfer` |
| `reference` | | e.g. UPI ref — appended to notes |
| `notes` | | Free text |

**Response `201`**

```json
{
  "message": "Payment recorded successfully",
  "payment_status": "partial",
  "amount_recorded": 500,
  "balance_remaining": 1000
}
```

**Errors:** Order still pending approval, already fully paid, amount exceeds due.

---

## Notifications

Base path: `/api/notifications`

### `GET /api/notifications`

**Roles:** All authenticated (own user only)

**Response**

```json
{
  "notifications": [
    {
      "id": 1,
      "user_id": 5,
      "title": "Order approved",
      "message": "...",
      "type": "order_approved",
      "is_read": false,
      "meta": { "order_id": 42 },
      "created_at": "..."
    }
  ],
  "unread_count": 3
}
```

Max 50 notifications returned.

---

### `PUT /api/notifications/:id/read`

Mark one notification read.

---

### `PUT /api/notifications/read-all`

Mark all notifications read for current user.

---

## Favorites (salon)

Base path: `/api/favorites`  
**Roles:** `salon` only

### `GET /api/favorites`

Saved products with default order quantities.

---

### `GET /api/favorites/reorder`

Suggest cart from last **delivered** order.

**Response**

```json
{
  "source": "last_order",
  "order_id": 10,
  "items": [{ "product_id", "quantity", "name", "price", "stock", "image" }]
}
```

Or `{ "source": "none", "items": [] }`.

---

### `POST /api/favorites`

**Body:** `{ "product_id": 1, "quantity": 2 }` (default quantity `1`)

Upserts favorite quantity.

---

### `DELETE /api/favorites/:productId`

Remove product from favorites.

---

## Reports

### `GET /api/reports`

**Roles:** `distributor`, `super_admin`, `salesman`

**Query:** `distributor_id` — super_admin optional filter

**Response `200`**

```json
{
  "summary": {
    "total_collected": 0,
    "pending_amount": 0
  },
  "sales_by_salon": [
    { "id", "salon_name", "order_count", "total_sales", "paid_sales" }
  ],
  "sales_by_salesman": [
    { "id", "name", "order_count", "total_sales" }
  ],
  "top_products": [
    { "id", "name", "sku", "units_sold", "revenue" }
  ]
}
```

---

## Audit logs

### `GET /api/audit`

**Roles:** `distributor`, `super_admin`

**Query:** `page`, `limit` (pagination) or plain array (max 100 when unpaginated)

Distributor sees logs for their `distributor_id` in `details` JSON or users under their distributor.

**Response fields:** `action`, `entity_type`, `entity_id`, `details`, `user_name`, `user_email`, `created_at`

Example actions: `order_created`, `order_status_updated`, `order_cancelled`, `payment_recorded`.

---

## Enums & state machines

### User roles

`super_admin` | `distributor` | `salesman` | `salon`

### Order status

| Status | Meaning |
|--------|---------|
| `pending` | Awaiting distributor approval |
| `approved` | Accepted; payment may be recorded |
| `rejected` | Declined |
| `processing` | Out for delivery |
| `delivered` | Completed delivery |

### Payment status (order)

| Status | Meaning |
|--------|---------|
| `pending` | No payments recorded |
| `partial` | Some payment recorded |
| `paid` | Fully paid |

### Payment methods

`cash` | `upi` | `bank_transfer`

### Notification types (examples)

`order_placed`, `order_approved`, `order_processing`, `order_delivered`, `order_rejected`, `payment_due`, `payment_paid`, `payment_partial`, `low_stock`

---

## Endpoint index

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| POST | `/auth/register` | — | Public |
| POST | `/auth/login` | — | Public |
| GET | `/auth/me` | ✓ | Any |
| GET | `/products` | ✓ | Any |
| GET | `/products/alerts/low-stock` | ✓ | distributor, super_admin |
| GET | `/products/:id` | ✓ | Any |
| POST | `/products` | ✓ | distributor, super_admin |
| PUT | `/products/:id` | ✓ | distributor, super_admin |
| POST | `/products/:id/upload` | ✓ | distributor, super_admin |
| DELETE | `/products/:id` | ✓ | distributor, super_admin |
| GET | `/catalog/brands` | ✓ | Any |
| POST | `/catalog/brands` | ✓ | distributor, super_admin |
| GET | `/catalog/categories` | ✓ | Any |
| POST | `/catalog/categories` | ✓ | distributor, super_admin |
| POST | `/orders` | ✓ | salon, salesman, distributor, super_admin |
| GET | `/orders` | ✓ | Any |
| GET | `/orders/:id` | ✓ | Any (scoped) |
| GET | `/orders/:id/invoice` | ✓ | Any (scoped) |
| PUT | `/orders/:id/status` | ✓ | distributor, super_admin |
| DELETE | `/orders/:id` | ✓ | salon, distributor, super_admin |
| GET | `/salons/me` | ✓ | salon |
| GET | `/salons` | ✓ | Any |
| POST | `/salons` | ✓ | distributor, super_admin |
| PUT | `/salons/:id` | ✓ | distributor, super_admin |
| GET | `/salesmen` | ✓ | Any |
| POST | `/salesmen` | ✓ | distributor, super_admin |
| GET | `/salesmen/:id/routes` | ✓ | distributor, super_admin, salesman |
| GET | `/salesmen/:id/assignments` | ✓ | distributor, super_admin |
| PUT | `/salesmen/:id/assignments` | ✓ | distributor, super_admin |
| GET | `/payments/summary` | ✓ | Any |
| GET | `/payments` | ✓ | Any |
| GET | `/payments/unpaid-orders` | ✓ | distributor, super_admin, salesman |
| POST | `/payments` | ✓ | distributor, super_admin, salesman |
| GET | `/notifications` | ✓ | Any |
| PUT | `/notifications/:id/read` | ✓ | Any |
| PUT | `/notifications/read-all` | ✓ | Any |
| GET | `/favorites` | ✓ | salon |
| GET | `/favorites/reorder` | ✓ | salon |
| POST | `/favorites` | ✓ | salon |
| DELETE | `/favorites/:productId` | ✓ | salon |
| GET | `/reports` | ✓ | distributor, super_admin, salesman |
| GET | `/audit` | ✓ | distributor, super_admin |

---

## Related documentation

- [FSD.md](./FSD.md) — functional spec and business rules  
- [USER_GUIDE.md](./USER_GUIDE.md) — end-user workflows  

*Generated from `server/src/routes` and controllers.*
