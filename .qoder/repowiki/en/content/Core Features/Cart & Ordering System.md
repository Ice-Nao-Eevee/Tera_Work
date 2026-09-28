# Cart & Ordering System

<cite>
**Referenced Files in This Document**
- [page.tsx](file://app/cart/page.tsx)
- [page.tsx](file://app/checkout/page.tsx)
- [FloatingCart.tsx](file://components/FloatingCart.tsx)
- [store.ts](file://lib/store.ts)
- [types.ts](file://lib/types.ts)
- [route.ts](file://app/api/orders/route.ts)
- [route.ts](file://app/api/coupons/validate/route.ts)
- [coupon.ts](file://lib/coupon.ts)
- [page.tsx](file://app/order/[orderId]/page.tsx)
</cite>

## Update Summary
**Changes Made**
- Updated checkout page section to document enhanced parallel data fetching using Promise.all()
- Added comprehensive coupon handling documentation including robust validation rules and daily usage tracking
- Enhanced user feedback mechanisms documentation covering improved visual indicators and error handling
- Updated API route documentation to reflect server-side price recalculation and transaction safety

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document explains the shopping cart and ordering workflow implemented in the application. It covers how cart state is managed using local storage, how item quantities are controlled, how prices are calculated, and how real-time updates are synchronized across components through an event-driven store. It also documents the checkout process, including order validation, robust coupon handling with business rule validation, parallel data fetching optimization, server-side price recalculation, and the order confirmation flow with live status polling. Finally, it describes the floating cart component behavior, cross-component communication patterns, error handling, validation rules, and enhanced user experience considerations.

## Project Structure
The cart and ordering system spans client pages, a shared store, API routes, and types:

- Client pages:
  - Cart page for reviewing items, adjusting quantities, and viewing totals.
  - Checkout page for table number input, coupon application with parallel data fetching, upsell promos, and order submission.
  - Order status page for live order tracking and digital receipt.
- Shared store:
  - Local storage-backed cart state, notes, manual table number, and an event emitter for reactive updates.
- API routes:
  - Order creation endpoint that validates inputs, verifies menu/promo items, applies coupons with transaction safety, recalculates totals, and persists orders atomically.
  - Coupon validation endpoint used during checkout to preview discounts with comprehensive business rule validation.
- Types:
  - Shared TypeScript interfaces for menu items, add-ons, orders, coupons, settings, and related entities.

```mermaid
graph TB
subgraph "Client Pages"
CartPage["Cart Page<br/>Review items, notes, totals"]
CheckoutPage["Checkout Page<br/>Table, coupons, parallel fetch, submit"]
OrderStatusPage["Order Status Page<br/>Live polling, receipt"]
end
subgraph "Shared Store"
Store["Local Storage Store<br/>cart, notes, table, events"]
end
subgraph "API Routes"
OrdersAPI["POST /api/orders<br/>Validate, recalculate, persist"]
CouponsAPI["POST /api/coupons/validate<br/>Business rules, daily tracking"]
end
CartPage --> Store
CheckoutPage --> Store
FloatingCart["FloatingCart Component"] --> Store
CheckoutPage --> OrdersAPI
CheckoutPage --> CouponsAPI
OrderStatusPage --> OrdersAPI
```

**Diagram sources**
- [page.tsx:19-48](file://app/cart/page.tsx#L19-L48)
- [page.tsx:22-73](file://app/checkout/page.tsx#L22-L73)
- [FloatingCart.tsx:22-39](file://components/FloatingCart.tsx#L22-L39)
- [store.ts:67-97](file://lib/store.ts#L67-L97)
- [route.ts:23-236](file://app/api/orders/route.ts#L23-L236)
- [route.ts:6-58](file://app/api/coupons/validate/route.ts#L6-L58)
- [page.tsx:10-53](file://app/order/[orderId]/page.tsx#L10-L53)

**Section sources**
- [page.tsx:19-48](file://app/cart/page.tsx#L19-L48)
- [page.tsx:22-73](file://app/checkout/page.tsx#L22-L73)
- [FloatingCart.tsx:22-39](file://components/FloatingCart.tsx#L22-L39)
- [store.ts:67-97](file://lib/store.ts#L67-L97)
- [route.ts:23-236](file://app/api/orders/route.ts#L23-L236)
- [route.ts:6-58](file://app/api/coupons/validate/route.ts#L6-L58)
- [page.tsx:10-53](file://app/order/[orderId]/page.tsx#L10-L53)

## Core Components
- Cart page:
  - Loads tax/service rates from settings, reads cart items and notes from the store, subscribes to store events for real-time updates, computes subtotal/tax/service/total, and navigates to checkout.
- Checkout page:
  - Reads cart items, manual table number, and notes; fetches promos, settings, known tables, and active coupons in parallel using Promise.all(); supports comprehensive coupon validation with business rules; calculates preview totals; submits order via API; clears cart on success and redirects to order confirmation.
- Floating cart:
  - Slides in/out as a sidebar; displays current cart items, quantity controls, remove actions, subtotal, and navigation to checkout; shows manual table badge when available.
- Store:
  - Persists cart items, order notes, manual table number, and table session to local storage; provides functions to add/update/remove items; emits events to notify subscribers of changes.
- API routes:
  - Order creation validates inputs, verifies menu/promo items against database, validates add-ons, applies coupons with transaction safety, recalculates all monetary values, and creates orders atomically within a transaction.
  - Coupon validation returns discount details based on current subtotal with comprehensive business rule enforcement.
- Types:
  - Defines shared data models for menu items, add-ons, orders, coupons, settings, and promotions.

**Section sources**
- [page.tsx:19-61](file://app/cart/page.tsx#L19-L61)
- [page.tsx:22-245](file://app/checkout/page.tsx#L22-L245)
- [FloatingCart.tsx:22-63](file://components/FloatingCart.tsx#L22-L63)
- [store.ts:67-216](file://lib/store.ts#L67-L216)
- [route.ts:23-236](file://app/api/orders/route.ts#L23-L236)
- [route.ts:6-58](file://app/api/coupons/validate/route.ts#L6-L58)
- [types.ts:1-119](file://lib/types.ts#L1-L119)

## Architecture Overview
The system uses a client-side store backed by local storage for cart persistence and an event emitter for reactive UI updates. The checkout flow integrates with backend APIs for coupon validation and order creation with parallel data fetching optimization. All monetary calculations are authoritative on the server to prevent manipulation.

```mermaid
sequenceDiagram
participant User as "User"
participant CartPage as "Cart Page"
participant Store as "Store (localStorage + Events)"
participant CheckoutPage as "Checkout Page"
participant CouponsAPI as "/api/coupons/validate"
participant OrdersAPI as "/api/orders"
participant OrderStatusPage as "Order Status Page"
User->>CartPage : Open cart
CartPage->>Store : getCartItems()
Store-->>CartPage : Cart items
CartPage->>CartPage : Compute subtotal/tax/service/total
CartPage->>CheckoutPage : Navigate to checkout
User->>CheckoutPage : Enter table number, apply coupon
CheckoutPage->>CheckoutPage : Parallel fetch (promos, settings, tables, coupons)
CheckoutPage->>CouponsAPI : Validate coupon code with business rules
CouponsAPI-->>CheckoutPage : Discount amount
CheckoutPage->>OrdersAPI : Submit order payload
OrdersAPI-->>CheckoutPage : Created order with orderCode
CheckoutPage->>Store : clearCart()
CheckoutPage->>OrderStatusPage : Redirect to order confirmation
OrderStatusPage->>OrdersAPI : Poll order status every 5s
OrdersAPI-->>OrderStatusPage : Updated order status
```

**Diagram sources**
- [page.tsx:19-61](file://app/cart/page.tsx#L19-L61)
- [page.tsx:22-245](file://app/checkout/page.tsx#L22-L245)
- [route.ts:23-236](file://app/api/orders/route.ts#L23-L236)
- [route.ts:6-58](file://app/api/coupons/validate/route.ts#L6-L58)
- [page.tsx:10-53](file://app/order/[orderId]/page.tsx#L10-L53)

## Detailed Component Analysis

### Cart State Management Using Local Storage
- Persistence keys:
  - Cart items, order notes, manual table number, and table session are stored under distinct keys.
- Reading and writing:
  - Functions read from local storage safely, parse JSON, sanitize entries, and return typed arrays or defaults.
  - Writes stringify objects and notify subscribers via the event emitter.
- Sanitization:
  - Cart items are filtered to ensure required fields exist and quantities are positive, preventing runtime errors.

```mermaid
flowchart TD
Start(["Function Entry"]) --> ReadStorage["Read localStorage key"]
ReadStorage --> ParseJSON["Parse JSON safely"]
ParseJSON --> ValidateArray{"Is array?"}
ValidateArray --> |No| ReturnEmpty["Return empty/default"]
ValidateArray --> |Yes| FilterItems["Filter valid cart items"]
FilterItems --> ReturnItems["Return sanitized items"]
```

**Diagram sources**
- [store.ts:67-91](file://lib/store.ts#L67-L91)

**Section sources**
- [store.ts:19-24](file://lib/store.ts#L19-L24)
- [store.ts:67-97](file://lib/store.ts#L67-L97)

### Item Quantity Controls
- Add to cart:
  - Computes unit price including add-ons, generates a unique instance ID based on item ID, spice level, and add-on signature, then either increments existing quantity or adds a new entry.
- Update quantity:
  - Adjusts quantity by delta; removes item if quantity drops to zero or below; recalculates line total.
- Remove item:
  - Filters out the specified item ID and persists updated cart.

```mermaid
flowchart TD
Start(["Update Quantity"]) --> FindItem["Find item by id"]
FindItem --> Found{"Found?"}
Found --> |No| End(["Exit"])
Found --> |Yes| AdjustQty["Add delta to qty"]
AdjustQty --> CheckZero{"Qty <= 0?"}
CheckZero --> |Yes| RemoveItem["Remove from cart"]
CheckZero --> |No| RecalcLineTotal["Recalculate lineTotal = qty * unitPrice"]
RemoveItem --> Save["Persist cart + notify"]
RecalcLineTotal --> Save
Save --> End
```

**Diagram sources**
- [store.ts:140-154](file://lib/store.ts#L140-L154)

**Section sources**
- [store.ts:99-138](file://lib/store.ts#L99-L138)
- [store.ts:140-160](file://lib/store.ts#L140-L160)

### Price Calculations
- Client-side previews:
  - Subtotal is sum of line totals.
  - Tax and service charge are computed from configured percentages fetched from settings.
  - Grand total includes subtotal plus combined tax and service charges, minus any applied coupon discount.
- Server-side authority:
  - Order creation endpoint ignores client-supplied totals and recalculates everything from database prices, add-on prices, and settings.
  - Coupon discount is validated and applied server-side; final total is computed after discount, tax, and service charge.

```mermaid
flowchart TD
Start(["Client Preview Totals"]) --> Subtotal["Sum line totals"]
Subtotal --> Rates["Fetch tax/service rates from settings"]
Rates --> TaxService["Compute taxAmount + serviceChargeAmount"]
TaxService --> Discount["Apply coupon discount if present"]
Discount --> GrandTotal["grandTotal = subtotal - discount + tax + service"]
GrandTotal --> End(["Display preview"])
```

**Diagram sources**
- [page.tsx:56-61](file://app/cart/page.tsx#L56-L61)
- [page.tsx:108-184](file://app/checkout/page.tsx#L108-L184)
- [route.ts:80-185](file://app/api/orders/route.ts#L80-L185)

**Section sources**
- [page.tsx:56-61](file://app/cart/page.tsx#L56-L61)
- [page.tsx:108-184](file://app/checkout/page.tsx#L108-L184)
- [route.ts:80-185](file://app/api/orders/route.ts#L80-L185)

### Real-Time Cart Updates Across Components
- Event-driven synchronization:
  - The store exposes an event emitter that notifies subscribers whenever cart state changes.
  - Cart page, checkout page, and floating cart subscribe to these events and refresh their local state accordingly.
- Benefits:
  - Consistent UI across multiple tabs/components without polling.
  - Immediate feedback when items are added, removed, or quantities change.

```mermaid
sequenceDiagram
participant ComponentA as "Cart Page"
participant ComponentB as "FloatingCart"
participant Store as "StoreEvents"
participant Storage as "localStorage"
ComponentA->>Store : updateCartQty(id, delta)
Store->>Storage : saveCartItems(updatedItems)
Store->>ComponentA : notify()
Store->>ComponentB : notify()
ComponentA->>Store : getCartItems()
ComponentB->>Store : getCartItems()
```

**Diagram sources**
- [store.ts:25-41](file://lib/store.ts#L25-L41)
- [store.ts:93-97](file://lib/store.ts#L93-L97)
- [page.tsx:44-48](file://app/cart/page.tsx#L44-L48)
- [page.tsx:71-73](file://app/checkout/page.tsx#L71-L73)
- [FloatingCart.tsx:34-39](file://components/FloatingCart.tsx#L34-L39)

**Section sources**
- [store.ts:25-41](file://lib/store.ts#L25-L41)
- [page.tsx:44-48](file://app/cart/page.tsx#L44-L48)
- [page.tsx:71-73](file://app/checkout/page.tsx#L71-L73)
- [FloatingCart.tsx:34-39](file://components/FloatingCart.tsx#L34-L39)

### Enhanced Checkout Process: Validation, Parallel Data Fetching, Payment Integration Points, Confirmation Flow
- Validation:
  - Client ensures table number is provided and non-zero before submission.
  - Server validates items array, table number, menu/promo availability, add-ons, and coupon rules.
- Parallel Data Fetching Optimization:
  - Uses `Promise.all()` to simultaneously fetch promos, settings, known tables, and active coupons, reducing initial load time significantly.
  - Each fetch operation has error handling with fallback defaults to ensure graceful degradation.
- Robust Coupon Handling:
  - Comprehensive business rule validation including date range checks, daily usage limits, minimum order amounts, and discount caps.
  - Real-time coupon validation with immediate user feedback and automatic coupon release when conditions change.
  - Transaction-safe coupon application prevents race conditions and double usage.
- Payment processing integration points:
  - The current implementation does not integrate a payment gateway; orders are created with status "received" and payment is handled at the cashier later.
  - The order confirmation page indicates manual payment at the counter.
- Order confirmation:
  - On successful order creation, the client clears cart and navigates to the order status page.
  - The order status page polls the order endpoint every five seconds to display live progress and eventually shows a digital receipt when completed.

```mermaid
sequenceDiagram
participant User as "User"
participant CheckoutPage as "Checkout Page"
participant OrdersAPI as "/api/orders"
participant Store as "Store"
participant OrderStatusPage as "Order Status Page"
User->>CheckoutPage : Click "Create Order"
CheckoutPage->>CheckoutPage : Validate table number
CheckoutPage->>CheckoutPage : Parallel fetch (promos, settings, tables, coupons)
CheckoutPage->>OrdersAPI : POST order payload
OrdersAPI-->>CheckoutPage : { order : { orderCode } }
CheckoutPage->>Store : clearCart()
CheckoutPage->>OrderStatusPage : Navigate to /order/{orderCode}
OrderStatusPage->>OrdersAPI : GET /api/orders/{orderCode} (polling)
OrdersAPI-->>OrderStatusPage : Updated order status
```

**Diagram sources**
- [page.tsx:186-245](file://app/checkout/page.tsx#L186-L245)
- [route.ts:23-236](file://app/api/orders/route.ts#L23-L236)
- [page.tsx:10-53](file://app/order/[orderId]/page.tsx#L10-L53)

**Section sources**
- [page.tsx:186-245](file://app/checkout/page.tsx#L186-L245)
- [route.ts:23-236](file://app/api/orders/route.ts#L23-L236)
- [page.tsx:10-53](file://app/order/[orderId]/page.tsx#L10-L53)

### Enhanced Coupon Handling System
- Business Rule Validation:
  - Date range validation ensures coupons are only valid within specified periods.
  - Daily usage tracking prevents coupon reuse on the same calendar day.
  - Minimum order amount requirements enforced with clear error messaging.
  - Maximum discount caps prevent excessive discounts on percentage-based coupons.
- Client-Side Experience:
  - Real-time validation feedback with loading states and error/success messages.
  - Automatic coupon release when subtotal falls below minimum requirements.
  - Visual indicators showing applied coupon benefits and remaining discount value.
- Server-Side Security:
  - Transaction-safe coupon application prevents race conditions.
  - Re-validation within database transactions ensures consistency.
  - Comprehensive error handling with structured responses.

```mermaid
flowchart TD
Start(["Coupon Input"]) --> ValidateInput["Validate input format"]
ValidateInput --> FetchCoupon["Fetch coupon from database"]
FetchCoupon --> CheckRules["Apply business rules"]
CheckRules --> DateValid{"Date range valid?"}
DateValid --> |No| Error1["Error: Invalid period"]
DateValid --> |Yes| DailyUsed{"Used today?"}
DailyUsed --> |Yes| Error2["Error: Used today"]
DailyUsed --> |No| MinAmount{"Meets minimum?"}
MinAmount --> |No| Error3["Error: Insufficient subtotal"]
MinAmount --> |Yes| CalcDiscount["Calculate discount amount"]
CalcDiscount --> ApplyCoupon["Apply coupon to cart"]
ApplyCoupon --> Success["Success with discount"]
```

**Diagram sources**
- [coupon.ts:80-132](file://lib/coupon.ts#L80-L132)
- [route.ts:160-180](file://app/api/orders/route.ts#L160-L180)

**Section sources**
- [coupon.ts:1-133](file://lib/coupon.ts#L1-L133)
- [route.ts:160-180](file://app/api/orders/route.ts#L160-L180)
- [page.tsx:152-193](file://app/checkout/page.tsx#L152-L193)

### Floating Cart Component Behavior
- Presentation:
  - Slides in from the right with a fixed header showing cart title, item count, manual table badge, and close button.
  - Displays list of cart items with images, spice/add-on tags, per-item price, and quantity stepper.
  - Footer shows subtotal and grand total, with CTA buttons to proceed to checkout or continue shopping.
- Interactions:
  - Quantity changes call store update functions which persist and notify subscribers.
  - Remove action animates removal briefly before updating store.
  - Keyboard accessibility: Escape closes the panel.

```mermaid
classDiagram
class FloatingCart {
+boolean isOpen
+void onClose()
+refreshCart()
+handleQtyChange(id, delta)
+handleRemove(id)
}
class Store {
+getCartItems()
+updateCartQty(id, delta)
+removeCartItem(id)
+getManualTableNumber()
+storeEvents
}
FloatingCart --> Store : "reads/writes cart state"
```

**Diagram sources**
- [FloatingCart.tsx:22-63](file://components/FloatingCart.tsx#L22-L63)
- [store.ts:67-97](file://lib/store.ts#L67-L97)

**Section sources**
- [FloatingCart.tsx:22-63](file://components/FloatingCart.tsx#L22-L63)
- [FloatingCart.tsx:65-326](file://components/FloatingCart.tsx#L65-L326)

### Cross-Component Communication Patterns
- Event emitter:
  - Centralized pub/sub mechanism for cart-related updates.
- Local storage:
  - Single source of truth for cart persistence across components and browser sessions.
- Props and routing:
  - Floating cart receives open/close props and uses Next.js router for navigation.
- Data fetching:
  - Checkout and cart pages fetch settings, promos, and tables to compute accurate previews and validations.

**Section sources**
- [store.ts:25-41](file://lib/store.ts#L25-L41)
- [page.tsx:27-37](file://app/cart/page.tsx#L27-L37)
- [page.tsx:50-73](file://app/checkout/page.tsx#L50-L73)
- [FloatingCart.tsx:34-46](file://components/FloatingCart.tsx#L34-L46)

## Dependency Analysis
The following diagram maps dependencies between core files involved in the cart and ordering workflow.

```mermaid
graph LR
CartPage["app/cart/page.tsx"] --> Store["lib/store.ts"]
CheckoutPage["app/checkout/page.tsx"] --> Store
CheckoutPage --> OrdersAPI["app/api/orders/route.ts"]
CheckoutPage --> CouponsAPI["app/api/coupons/validate/route.ts"]
CouponsAPI --> CouponLib["lib/coupon.ts"]
FloatingCart["components/FloatingCart.tsx"] --> Store
OrderStatusPage["app/order/[orderId]/page.tsx"] --> OrdersAPI
Store --> Types["lib/types.ts"]
```

**Diagram sources**
- [page.tsx:9-17](file://app/cart/page.tsx#L9-L17)
- [page.tsx:9-20](file://app/checkout/page.tsx#L9-L20)
- [FloatingCart.tsx:7-14](file://components/FloatingCart.tsx#L7-L14)
- [store.ts:1-11](file://lib/store.ts#L1-L11)
- [route.ts:1-4](file://app/api/orders/route.ts#L1-L4)
- [route.ts:1-4](file://app/api/coupons/validate/route.ts#L1-L4)
- [page.tsx:7-8](file://app/order/[orderId]/page.tsx#L7-L8)
- [coupon.ts:1-2](file://lib/coupon.ts#L1-L2)

**Section sources**
- [page.tsx:9-17](file://app/cart/page.tsx#L9-L17)
- [page.tsx:9-20](file://app/checkout/page.tsx#L9-L20)
- [FloatingCart.tsx:7-14](file://components/FloatingCart.tsx#L7-L14)
- [store.ts:1-11](file://lib/store.ts#L1-L11)
- [route.ts:1-4](file://app/api/orders/route.ts#L1-L4)
- [route.ts:1-4](file://app/api/coupons/validate/route.ts#L1-L4)
- [page.tsx:7-8](file://app/order/[orderId]/page.tsx#L7-L8)
- [coupon.ts:1-2](file://lib/coupon.ts#L1-L2)

## Performance Considerations
- Local storage operations:
  - Keep cart payloads minimal; avoid storing large images directly in cart items.
- Event notifications:
  - Batch updates where possible to reduce unnecessary re-renders.
- API calls:
  - Fetch settings, promos, and tables in parallel using Promise.all() to minimize latency.
  - Implement proper error handling with fallbacks for each parallel fetch operation.
- Image loading:
  - Use optimized image sizes and fallback placeholders to improve perceived performance.
- Polling:
  - Order status polling interval should be balanced between responsiveness and network load.
- Database queries:
  - Use batch loading and Promise.all() for concurrent database operations to eliminate N+1 query problems.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Empty cart scenarios:
  - Both cart and checkout pages handle empty states gracefully and guide users back to the menu.
- Invalid table number:
  - Client shows advisory or error messages; server rejects invalid table numbers with HTTP 400.
- Coupon issues:
  - Client displays validation errors and success messages; server enforces coupon rules and prevents misuse.
  - Common coupon errors include expired dates, daily usage limits, insufficient subtotals, and inactive coupons.
- Network errors:
  - API endpoints return structured error responses; clients surface user-friendly messages.
  - Parallel fetch operations have individual error handling to prevent complete failure.
- Data integrity:
  - Store sanitizes cart items to prevent null pointer exceptions and inconsistent state.
- Performance issues:
  - Monitor parallel fetch completion times and implement proper loading states.
  - Ensure database queries use batch operations to avoid N+1 problems.

**Section sources**
- [page.tsx:63-83](file://app/cart/page.tsx#L63-L83)
- [page.tsx:247-258](file://app/checkout/page.tsx#L247-L258)
- [route.ts:33-48](file://app/api/orders/route.ts#L33-L48)
- [route.ts:160-180](file://app/api/orders/route.ts#L160-L180)
- [route.ts:237-243](file://app/api/orders/route.ts#L237-L243)
- [store.ts:75-90](file://lib/store.ts#L75-L90)

## Conclusion
The cart and ordering system combines a robust client-side store with secure server-side validation and calculation. Local storage ensures persistence, while event-driven updates keep the UI consistent across components. The checkout flow emphasizes safety by ignoring client-provided totals and recomputing them server-side, with enhanced coupon validation integrated both for preview and final order creation. The parallel data fetching optimization significantly improves initial load performance, while the floating cart enhances usability by providing quick access to cart management and checkout. Comprehensive error handling, validation rules, and enhanced user feedback mechanisms protect data integrity and provide clear user feedback throughout the workflow.

[No sources needed since this section summarizes without analyzing specific files]