# Database Schema Design

<cite>
**Referenced Files in This Document**
- [schema.prisma](file://prisma/schema.prisma)
- [types.ts](file://lib/types.ts)
- [route.ts (orders)](file://app/api/orders/route.ts)
- [route.ts (orders by id)](file://app/api/orders/[id]/route.ts)
- [route.ts (coupons validate)](file://app/api/coupons/validate/route.ts)
- [coupon.ts](file://lib/coupon.ts)
- [prisma.ts](file://lib/prisma.ts)
- [page.tsx (admin)](file://app/admin/page.tsx)
- [page.tsx (checkout)](file://app/checkout/page.tsx)
</cite>

## Update Summary
**Changes Made**
- Updated Order model documentation to include new paymentMethod and paymentStatus fields
- Added comprehensive documentation for payment tracking functionality
- Updated API route descriptions to reflect payment validation and persistence
- Enhanced diagrams to show payment-related relationships and data flows
- Added troubleshooting guidance for payment-related issues

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Payment Tracking System](#payment-tracking-system)
7. [Dependency Analysis](#dependency-analysis)
8. [Performance Considerations](#performance-considerations)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Conclusion](#conclusion)

## Introduction
This document explains the database schema design and entity relationships for the application, focusing on the Prisma data model and how it is used by the API layer. It covers all models present in the schema: Category, MenuItem, RestaurantTable, Promo, Order, Coupon, and Settings. For each model, we describe fields, data types, constraints, indexes, and validation rules enforced at both the schema and application layers. We also provide diagrams to visualize entity relationships and key data flows such as order creation and coupon validation. **Updated**: The Order model now includes persistent payment tracking with paymentMethod and paymentStatus fields to support comprehensive payment workflow management.

## Project Structure
The database contract is defined in a single Prisma schema file. The application uses Next.js API routes to perform CRUD operations against the PostgreSQL database via Prisma Client. Shared TypeScript interfaces mirror the Prisma models for type safety across the app.

```mermaid
graph TB
subgraph "Data Layer"
PRISMA["Prisma Schema<br/>Defines models, types, constraints"]
DB["PostgreSQL Database"]
end
subgraph "API Layer"
ORDERS_API["Orders API Route"]
ORDERS_UPDATE_API["Orders Update API Route"]
COUPONS_VALIDATE_API["Coupons Validate API Route"]
end
subgraph "Shared Types"
TYPES["TypeScript Interfaces"]
end
PRISMA --> DB
ORDERS_API --> PRISMA
ORDERS_UPDATE_API --> PRISMA
COUPONS_VALIDATE_API --> PRISMA
TYPES --> ORDERS_API
TYPES --> ORDERS_UPDATE_API
TYPES --> COUPONS_VALIDATE_API
```

**Diagram sources**
- [schema.prisma:1-110](file://prisma/schema.prisma#L1-L110)
- [route.ts (orders):1-294](file://app/api/orders/route.ts#L1-L294)
- [route.ts (orders by id):1-103](file://app/api/orders/[id]/route.ts#L1-L103)
- [route.ts (coupons validate):1-58](file://app/api/coupons/validate/route.ts#L1-L58)
- [types.ts:1-121](file://lib/types.ts#L1-L121)

**Section sources**
- [schema.prisma:1-110](file://prisma/schema.prisma#L1-L110)
- [types.ts:1-121](file://lib/types.ts#L1-L121)

## Core Components
This section documents each model's fields, data types, constraints, and indexes.

- Category
  - Fields: id (String, primary key), name (String), slug (String, unique), sortOrder (Int, default 0).
  - Constraints: Primary key on id; unique constraint on slug.
  - Indexes: None explicitly defined beyond PK and unique.
  - Notes: Used to categorize menu items; currently referenced by MenuItem.category as a string rather than a foreign key.

- MenuItem
  - Fields: id (String, PK), name (String), description (String), price (Int), category (String), photoUrl (String), badge (String, default "none"), spiceLevels (Json, default []), addOns (Json, default []), isActive (Boolean, default true), createdAt (DateTime, default now), updatedAt (DateTime, auto-updated).
  - Constraints: Primary key on id; no explicit NOT NULL or check constraints beyond defaults.
  - Indexes: Composite index on [isActive, category].
  - Notes: JSON fields store structured arrays for spice levels and add-ons.

- RestaurantTable
  - Fields: id (String, PK), tableNumber (Int, unique), qrToken (String), isActive (Boolean, default true).
  - Constraints: Primary key on id; unique constraint on tableNumber.
  - Indexes: None beyond PK and unique.

- Promo
  - Fields: id (String, PK), title (String), description (String), originalPrice (Int), discountedPrice (Int), isActive (Boolean, default true).
  - Constraints: Primary key on id.
  - Indexes: None.

- Order
  - Fields: id (String, PK), orderCode (String, unique), tableNumber (Int), items (Json, default []), notes (String, default ""), subtotal (Int), taxAmount (Int), serviceChargeAmount (Int), couponCode (String, nullable), discountAmount (Int, default 0), total (Int), status (String, default "received"), **paymentMethod (String, default "cash")**, **paymentStatus (String, default "unpaid")**, createdAt (DateTime, default now), updatedAt (DateTime, auto-updated).
  - Constraints: Primary key on id; unique constraint on orderCode.
  - Indexes: Composite index on [status, createdAt]; **composite index on [paymentStatus, createdAt]** for payment tracking queries.
  - Notes: Monetary values are recalculated server-side during order creation. **Payment tracking fields enable comprehensive payment workflow management with validation for supported methods (cash, qris) and statuses (paid, unpaid).**

- Coupon
  - Fields: id (String, PK), code (String, unique), title (String), description (String), discountType (String, enum-like comment), discountValue (Int), minOrderAmount (Int, default 0), maxDiscountAmount (Int, nullable), startDate (DateTime), endDate (DateTime), isActive (Boolean, default true), lastUsedDate (DateTime, nullable), usedToday (Boolean, default false), createdAt (DateTime, default now), updatedAt (DateTime, auto-updated).
  - Constraints: Primary key on id; unique constraint on code.
  - Indexes: Composite index on [code, isActive].
  - Notes: Business logic validates date ranges, daily usage, minimum order amount, and discount caps.

- Settings
  - Fields: id (String, PK), taxRatePercent (Int, default 10), serviceChargeRatePercent (Int, default 5), restaurantInfo (Json, default {}).
  - Constraints: Primary key on id.
  - Indexes: None.

**Section sources**
- [schema.prisma:11-18](file://prisma/schema.prisma#L11-L18)
- [schema.prisma:20-36](file://prisma/schema.prisma#L20-L36)
- [schema.prisma:38-45](file://prisma/schema.prisma#L38-L45)
- [schema.prisma:47-56](file://prisma/schema.prisma#L47-L56)
- [schema.prisma:58-79](file://prisma/schema.prisma#L58-L79)
- [schema.prisma:81-100](file://prisma/schema.prisma#L81-L100)
- [schema.prisma:102-110](file://prisma/schema.prisma#L102-L110)

## Architecture Overview
The system uses Prisma as the ORM over PostgreSQL. Models are defined declaratively in the Prisma schema. Application logic in API routes performs validations and calculations before persisting data. Relationships between entities are mostly logical (e.g., MenuItem.category references Category by string; Order.couponCode references Coupon.code) rather than enforced via foreign keys in the schema.

```mermaid
erDiagram
CATEGORY {
string id PK
string name
string slug UK
int sortOrder
}
MENU_ITEM {
string id PK
string name
string description
int price
string category
string photoUrl
string badge
json spiceLevels
json addOns
boolean isActive
datetime createdAt
datetime updatedAt
}
RESTAURANT_TABLE {
string id PK
int tableNumber UK
string qrToken
boolean isActive
}
PROMO {
string id PK
string title
string description
int originalPrice
int discountedPrice
boolean isActive
}
ORDER {
string id PK
string orderCode UK
int tableNumber
json items
string notes
int subtotal
int taxAmount
int serviceChargeAmount
string couponCode
int discountAmount
int total
string status
string paymentMethod
string paymentStatus
datetime createdAt
datetime updatedAt
}
COUPON {
string id PK
string code UK
string title
string description
string discountType
int discountValue
int minOrderAmount
int maxDiscountAmount
datetime startDate
datetime endDate
boolean isActive
datetime lastUsedDate
boolean usedToday
datetime createdAt
datetime updatedAt
}
SETTINGS {
string id PK
int taxRatePercent
int serviceChargeRatePercent
json restaurantInfo
}
MENU_ITEM ||--o{ ORDER : "items reference menu items"
ORDER ||--|| COUPON : "couponCode references code"
MENU_ITEM ||--o{ CATEGORY : "category references name/slug"
```

**Diagram sources**
- [schema.prisma:11-18](file://prisma/schema.prisma#L11-L18)
- [schema.prisma:20-36](file://prisma/schema.prisma#L20-L36)
- [schema.prisma:38-45](file://prisma/schema.prisma#L38-L45)
- [schema.prisma:47-56](file://prisma/schema.prisma#L47-L56)
- [schema.prisma:58-79](file://prisma/schema.prisma#L58-L79)
- [schema.prisma:81-100](file://prisma/schema.prisma#L81-L100)
- [schema.prisma:102-110](file://prisma/schema.prisma#L102-L110)

## Detailed Component Analysis

### Model: Category
- Purpose: Groups menu items into categories.
- Key attributes:
  - id: Unique identifier (cuid).
  - name: Display name.
  - slug: URL-friendly unique identifier.
  - sortOrder: Ordering hint.
- Constraints:
  - Primary key on id.
  - Unique on slug.
- Indexes:
  - None beyond PK and unique.
- Validation:
  - No explicit schema-level validation beyond uniqueness.

**Section sources**
- [schema.prisma:11-18](file://prisma/schema.prisma#L11-L18)

### Model: MenuItem
- Purpose: Represents individual menu products with optional metadata.
- Key attributes:
  - id: Unique identifier (cuid).
  - name, description: Textual details.
  - price: Integer monetary value (cents or smallest currency unit).
  - category: String referencing a category (logical relationship).
  - photoUrl: Image link.
  - badge: Optional label (default "none").
  - spiceLevels: JSON array of spice options.
  - addOns: JSON array of additional options with prices.
  - isActive: Boolean flag for availability.
  - createdAt, updatedAt: Timestamps.
- Constraints:
  - Primary key on id.
- Indexes:
  - Composite index on [isActive, category] to optimize queries filtering by active items and category.
- Validation:
  - Defaults applied for badge, spiceLevels, addOns, isActive, timestamps.
  - No NOT NULL or range checks on numeric fields.

**Section sources**
- [schema.prisma:20-36](file://prisma/schema.prisma#L20-L36)

### Model: RestaurantTable
- Purpose: Represents physical tables with QR tokens for ordering.
- Key attributes:
  - id: Unique identifier (cuid).
  - tableNumber: Unique integer identifier.
  - qrToken: Token associated with QR code.
  - isActive: Availability flag.
- Constraints:
  - Primary key on id.
  - Unique on tableNumber.
- Indexes:
  - None beyond PK and unique.

**Section sources**
- [schema.prisma:38-45](file://prisma/schema.prisma#L38-L45)

### Model: Promo
- Purpose: Stores promotional offers with original and discounted prices.
- Key attributes:
  - id: Unique identifier (cuid).
  - title, description: Promotional text.
  - originalPrice, discountedPrice: Integer monetary values.
  - isActive: Availability flag.
- Constraints:
  - Primary key on id.
- Indexes:
  - None.

**Section sources**
- [schema.prisma:47-56](file://prisma/schema.prisma#L47-L56)

### Model: Order
- Purpose: Captures customer orders with line items, totals, and **persistent payment tracking**.
- Key attributes:
  - id: Unique identifier (cuid).
  - orderCode: Unique human-readable code.
  - tableNumber: Integer linking to RestaurantTable.tableNumber (logical relationship).
  - items: JSON array of order line items.
  - notes: Optional text.
  - subtotal, taxAmount, serviceChargeAmount, discountAmount, total: Integer monetary values.
  - couponCode: Nullable code referencing Coupon.code (logical relationship).
  - status: Default "received".
  - **paymentMethod**: Payment method selection ("cash" or "qris", default "cash").
  - **paymentStatus**: Payment completion status ("unpaid" or "paid", default "unpaid").
  - createdAt, updatedAt: Timestamps.
- Constraints:
  - Primary key on id.
  - Unique on orderCode.
- Indexes:
  - Composite index on [status, createdAt] to optimize listing and sorting.
  - **Composite index on [paymentStatus, createdAt] to optimize payment tracking queries**.
- Validation:
  - Server-side recalculation of monetary values during creation ensures integrity.
  - **Payment method validation restricts to supported values: "cash" or "qris"**.
  - **Payment status validation restricts to supported values: "paid" or "unpaid"**.

**Section sources**
- [schema.prisma:58-79](file://prisma/schema.prisma#L58-L79)
- [route.ts (orders):259-280](file://app/api/orders/route.ts#L259-L280)
- [route.ts (orders by id):35-47](file://app/api/orders/[id]/route.ts#L35-L47)

### Model: Coupon
- Purpose: Defines discount coupons with business rules.
- Key attributes:
  - id: Unique identifier (cuid).
  - code: Unique code used for redemption.
  - title, description: Metadata.
  - discountType: Enum-like string ("PERCENTAGE" or "FIXED").
  - discountValue: Numeric discount value.
  - minOrderAmount: Minimum subtotal required.
  - maxDiscountAmount: Optional cap on percentage discounts.
  - startDate, endDate: Validity window.
  - isActive: Availability flag.
  - lastUsedDate, usedToday: Daily usage tracking.
  - createdAt, updatedAt: Timestamps.
- Constraints:
  - Primary key on id.
  - Unique on code.
- Indexes:
  - Composite index on [code, isActive] to speed up lookups and filtering.
- Validation:
  - Business logic enforces activation, date range, daily usage, minimum order amount, and discount caps.

**Section sources**
- [schema.prisma:81-100](file://prisma/schema.prisma#L81-L100)
- [coupon.ts:19-132](file://lib/coupon.ts#L19-L132)

### Model: Settings
- Purpose: Holds global configuration such as tax and service charge rates.
- Key attributes:
  - id: Unique identifier (cuid).
  - taxRatePercent: Default 10.
  - serviceChargeRatePercent: Default 5.
  - restaurantInfo: JSON object containing restaurant details.
- Constraints:
  - Primary key on id.
- Indexes:
  - None.

**Section sources**
- [schema.prisma:102-110](file://prisma/schema.prisma#L102-L110)

## Payment Tracking System
The Order model now includes comprehensive payment tracking capabilities through two new fields that enable complete payment workflow management.

### Payment Method Field (`paymentMethod`)
- **Data Type**: String with default value "cash"
- **Supported Values**: "cash" (Bayar di Kasir/Tunai), "qris" (QRIS digital payment)
- **Validation**: Server-side validation ensures only supported payment methods are accepted
- **Purpose**: Tracks how customers intend to pay for their orders

### Payment Status Field (`paymentStatus`)  
- **Data Type**: String with default value "unpaid"
- **Supported Values**: "unpaid", "paid"
- **Validation**: Server-side validation ensures only valid payment states are stored
- **Purpose**: Tracks whether payment has been completed for an order

### Payment Workflow Integration
The payment tracking system integrates seamlessly with the existing order management workflow:

1. **Order Creation**: When creating orders, payment method and status are validated and persisted
2. **Admin Management**: Admin interface allows updating payment status and method for existing orders
3. **Customer Experience**: Checkout flow captures payment method preference from customers
4. **Reporting & Analytics**: Indexed fields enable efficient querying for payment analytics

```mermaid
flowchart TD
CUSTOMER["Customer Checkout"] --> PAYMENT_SELECT["Select Payment Method<br/>(cash/qris)"]
PAYMENT_SELECT --> ORDER_CREATE["Create Order with<br/>paymentMethod & paymentStatus"]
ORDER_CREATE --> ADMIN_PANEL["Admin Panel"]
ADMIN_PANEL --> PAYMENT_UPDATE["Update Payment Status<br/>(unpaid → paid)"]
PAYMENT_UPDATE --> REPORTING["Payment Analytics & Reports"]
subgraph "Database Storage"
ORDER_DB["Order Record<br/>paymentMethod: 'cash'|'qris'<br/>paymentStatus: 'unpaid'|'paid'"]
end
ORDER_CREATE --> ORDER_DB
PAYMENT_UPDATE --> ORDER_DB
```

**Diagram sources**
- [route.ts (orders):259-280](file://app/api/orders/route.ts#L259-L280)
- [route.ts (orders by id):35-47](file://app/api/orders/[id]/route.ts#L35-L47)
- [page.tsx (admin):275-469](file://app/admin/page.tsx#L275-L469)
- [page.tsx (checkout):39-234](file://app/checkout/page.tsx#L39-L234)

### Performance Optimization
- **Index Strategy**: New composite index on [paymentStatus, createdAt] optimizes common queries for payment tracking and reporting
- **Query Patterns**: Enables efficient filtering of orders by payment status and time-based payment analytics
- **Scalability**: Supports high-volume payment tracking without performance degradation

**Section sources**
- [schema.prisma:71-77](file://prisma/schema.prisma#L71-L77)
- [route.ts (orders):259-280](file://app/api/orders/route.ts#L259-L280)
- [route.ts (orders by id):35-47](file://app/api/orders/[id]/route.ts#L35-L47)
- [types.ts:81-82](file://lib/types.ts#L81-L82)

## Dependency Analysis
Relationships between entities are primarily logical rather than enforced via foreign keys:

- MenuItem.category references Category by string (name or slug). There is no foreign key constraint; referential integrity is maintained by application logic.
- Order.couponCode references Coupon.code. There is no foreign key constraint; uniqueness of code is enforced at the schema level.
- Order.tableNumber references RestaurantTable.tableNumber. There is no foreign key constraint; uniqueness of tableNumber is enforced at the schema level.
- Order.items contains JSON arrays of line items that logically reference MenuItem entries.
- **Order.paymentMethod and Order.paymentStatus are self-contained fields with no external dependencies, using enumerated values for consistency.**

```mermaid
graph LR
CATEGORY["Category"] ---|logical ref| MENU_ITEM["MenuItem"]
MENU_ITEM["MenuItem"] ---|logical ref| ORDER["Order"]
COUPON["Coupon"] ---|logical ref| ORDER["Order"]
RESTAURANT_TABLE["RestaurantTable"] ---|logical ref| ORDER["Order"]
PAYMENT_METHOD["paymentMethod<br/>(cash/qris)"] ---|self-contained| ORDER["Order"]
PAYMENT_STATUS["paymentStatus<br/>(unpaid/paid)"] ---|self-contained| ORDER["Order"]
```

**Diagram sources**
- [schema.prisma:11-18](file://prisma/schema.prisma#L11-L18)
- [schema.prisma:20-36](file://prisma/schema.prisma#L20-L36)
- [schema.prisma:38-45](file://prisma/schema.prisma#L38-L45)
- [schema.prisma:58-79](file://prisma/schema.prisma#L58-L79)
- [schema.prisma:81-100](file://prisma/schema.prisma#L81-L100)

**Section sources**
- [schema.prisma:11-18](file://prisma/schema.prisma#L11-L18)
- [schema.prisma:20-36](file://prisma/schema.prisma#L20-L36)
- [schema.prisma:38-45](file://prisma/schema.prisma#L38-L45)
- [schema.prisma:58-79](file://prisma/schema.prisma#L58-L79)
- [schema.prisma:81-100](file://prisma/schema.prisma#L81-L100)

## Performance Considerations
- Indexes:
  - MenuItem has a composite index on [isActive, category], optimizing queries that filter by active items and category.
  - Order has a composite index on [status, createdAt], optimizing listing and sorting by status and time.
  - **Order has a new composite index on [paymentStatus, createdAt], optimizing payment tracking queries and reporting**.
  - Coupon has an index on [code, isActive], optimizing lookups by code and filtering by active status.
- JSON fields:
  - spiceLevels, addOns, items, and restaurantInfo are stored as JSON. Querying within JSON may be less efficient; consider adding functional indexes if frequent JSON path queries are needed.
- Monetary values:
  - All monetary values are integers to avoid floating-point precision issues. Ensure consistent units (e.g., cents) across the application.
- **Payment tracking optimization**:
  - The new paymentStatus index enables efficient filtering of orders by payment state, crucial for administrative workflows and reporting dashboards.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and their resolutions related to the schema and data integrity:

- Duplicate codes:
  - Coupon.code and Order.orderCode are unique. Attempts to insert duplicates will fail. Ensure generation logic avoids collisions and retries when necessary.
- Invalid coupon usage:
  - Business rules enforce activation, date range, daily usage, and minimum order amount. If validation fails, return appropriate error messages to the client.
- Price manipulation:
  - The Orders API recalculates subtotal, tax, service charge, and total server-side. Do not trust client-supplied totals.
- Missing references:
  - Since relationships are logical, ensure that referenced entities exist before creating dependent records (e.g., valid category names, existing coupon codes, existing table numbers).
- **Payment validation errors**:
  - **Invalid paymentMethod values**: Only "cash" and "qris" are supported. Invalid values are automatically converted to "cash".
  - **Invalid paymentStatus values**: Only "unpaid" and "paid" are supported. Invalid values are automatically converted to "unpaid".
  - **Payment status transitions**: Ensure proper workflow from "unpaid" to "paid" in admin interface.
- **Payment tracking performance**:
  - **Use indexed queries**: Leverage the [paymentStatus, createdAt] index for efficient payment-related queries.
  - **Batch updates**: When updating multiple orders' payment status, use batch operations to minimize database calls.

**Section sources**
- [route.ts (orders):259-280](file://app/api/orders/route.ts#L259-L280)
- [route.ts (orders by id):35-47](file://app/api/orders/[id]/route.ts#L35-L47)
- [route.ts (coupons validate):1-58](file://app/api/coupons/validate/route.ts#L1-L58)
- [coupon.ts:19-132](file://lib/coupon.ts#L19-L132)

## Conclusion
The Prisma schema defines a clear set of models supporting a restaurant ordering system with **enhanced payment tracking capabilities**. While relationships are logical rather than enforced via foreign keys, the application layer enforces critical integrity rules, especially around pricing, coupon usage, and **payment workflow management**. Indexes are strategically placed to support common query patterns, including the new payment tracking optimizations. The addition of paymentMethod and paymentStatus fields provides comprehensive payment lifecycle management, enabling better financial tracking and reporting capabilities. To strengthen data integrity further, consider introducing explicit foreign key constraints where appropriate and validating inputs more rigorously at the schema level using check constraints or enums.

[No sources needed since this section summarizes without analyzing specific files]