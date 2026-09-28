# Promotions & Coupons

<cite>
**Referenced Files in This Document**
- [schema.prisma](file://prisma/schema.prisma)
- [coupon.ts](file://lib/coupon.ts)
- [store.ts](file://lib/store.ts)
- [route.ts (coupons list)](file://app/api/coupons/route.ts)
- [route.ts (coupon validation)](file://app/api/coupons/validate/route.ts)
- [route.ts (admin coupons list and create)](file://app/api/admin/coupons/route.ts)
- [route.ts (admin coupon update/delete)](file://app/api/admin/coupons/[id]/route.ts)
- [route.ts (promos list/create)](file://app/api/promos/route.ts)
- [route.ts (promo update/delete)](file://app/api/promos/[id]/route.ts)
- [page.tsx (checkout)](file://app/checkout/page.tsx)
- [page.tsx (promo)](file://app/promo/page.tsx)
- [route.ts (orders)](file://app/api/orders/route.ts)
</cite>

## Update Summary
**Changes Made**
- Enhanced coupon system with modern UI design featuring ticket-style coupon cards
- Integrated session storage for seamless coupon flow between promo and checkout pages
- Improved user experience with toast notifications and auto-navigation
- Added quick coupon selection interface on checkout page
- Enhanced promotional pricing display with better visual hierarchy

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Session Storage Integration](#session-storage-integration)
7. [Enhanced User Interface](#enhanced-user-interface)
8. [Dependency Analysis](#dependency-analysis)
9. [Performance Considerations](#performance-considerations)
10. [Security and Fraud Prevention](#security-and-fraud-prevention)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Conclusion](#conclusion)

## Introduction
This document explains the enhanced promotions and coupon management system, including discount calculation, coupon validation rules, promotional pricing display, cart discount application, order total computation, usage tracking, expiration handling, security measures, and performance optimization strategies.

The system now features:
- Modern ticket-style coupon UI with copy-to-clipboard functionality
- Session storage integration for seamless navigation between promo and checkout pages
- Quick coupon selection interface directly on the checkout page
- Toast notifications for better user feedback
- Enhanced promotional menu items with original and discounted prices
- Server-side authoritative calculations for tax, service charge, and final totals
- Admin APIs to manage coupons and promos
- Usage tracking via per-day availability and atomic order creation

## Project Structure
Promotions and coupons are implemented across API routes, a shared discount engine, session storage utilities, and data models:

- Data model definitions live in the Prisma schema
- The discount engine is centralized in a reusable library module
- Session storage utilities handle cross-page state management
- Public and admin API routes expose CRUD and validation endpoints
- Enhanced UI components integrate coupon validation and promo item selection
- Order creation recomputes totals server-side and records coupon usage atomically

```mermaid
graph TB
subgraph "Client"
Checkout["Enhanced Checkout Page"]
PromoPage["Modern Promo Page"]
end
subgraph "API Routes"
CouponsList["GET /api/coupons"]
CouponsValidate["POST /api/coupons/validate"]
AdminCoupons["Admin Coupons CRUD"]
PromosCRUD["Promos CRUD"]
OrdersCreate["POST /api/orders"]
end
subgraph "Domain Logic"
Engine["Discount Engine<br/>checkCouponRules(), calculateDiscount()"]
SessionStorage["Session Storage<br/>wkb_selected_coupon"]
end
subgraph "Data Layer"
DB[(PostgreSQL via Prisma)]
end
Checkout --> CouponsValidate
PromoPage --> SessionStorage
Checkout --> PromosCRUD
Checkout --> OrdersCreate
CouponsList --> DB
CouponsValidate --> Engine
AdminCoupons --> DB
PromosCRUD --> DB
OrdersCreate --> Engine
Engine --> DB
```

**Diagram sources**
- [page.tsx (checkout):1-590](file://app/checkout/page.tsx#L1-L590)
- [page.tsx (promo):1-567](file://app/promo/page.tsx#L1-L567)
- [route.ts (coupons list):1-33](file://app/api/coupons/route.ts#L1-L33)
- [route.ts (coupon validation):1-58](file://app/api/coupons/validate/route.ts#L1-L58)
- [route.ts (admin coupons list and create):1-129](file://app/api/admin/coupons/route.ts#L1-L129)
- [route.ts (admin coupon update/delete):1-102](file://app/api/admin/coupons/[id]/route.ts#L1-L102)
- [route.ts (promos list/create):1-38](file://app/api/promos/route.ts#L1-L38)
- [route.ts (promo update/delete):1-52](file://app/api/promos/[id]/route.ts#L1-L52)
- [route.ts (orders):150-245](file://app/api/orders/route.ts#L150-L245)
- [coupon.ts:1-133](file://lib/coupon.ts#L1-L133)

**Section sources**
- [schema.prisma:47-97](file://prisma/schema.prisma#L47-L97)
- [coupon.ts:1-133](file://lib/coupon.ts#L1-L133)
- [store.ts:1-217](file://lib/store.ts#L1-L217)
- [route.ts (coupons list):1-33](file://app/api/coupons/route.ts#L1-L33)
- [route.ts (coupon validation):1-58](file://app/api/coupons/validate/route.ts#L1-L58)
- [route.ts (admin coupons list and create):1-129](file://app/api/admin/coupons/route.ts#L1-L129)
- [route.ts (admin coupon update/delete):1-102](file://app/api/admin/coupons/[id]/route.ts#L1-L102)
- [route.ts (promos list/create):1-38](file://app/api/promos/route.ts#L1-L38)
- [route.ts (promo update/delete):1-52](file://app/api/promos/[id]/route.ts#L1-L52)
- [page.tsx (checkout):1-590](file://app/checkout/page.tsx#L1-L590)
- [page.tsx (promo):1-567](file://app/promo/page.tsx#L1-L567)
- [route.ts (orders):150-245](file://app/api/orders/route.ts#L150-L245)

## Core Components
- Discount engine: Centralized logic for coupon validation and discount calculation
- Session storage utilities: Cross-page state management for coupon codes
- Coupon data model: Stores code, discount type/value, min order amount, max discount cap, validity period, active state, and usage metadata
- Promo data model: Stores promotional menu items with original and discounted prices
- Enhanced UI components: Modern ticket-style coupon cards with copy functionality and toast notifications
- API layer: Endpoints for listing, validating, creating, updating, and deleting coupons and promos; order creation applies coupons and computes totals
- Checkout UI: Applies coupons, shows promo items, previews totals before submission with quick selection interface

Key responsibilities:
- Validation: Enforce active status, date range, daily usage limit, and minimum order amount
- Calculation: Compute discount based on percentage or fixed value, capped by maximum discount and subtotal
- Persistence: Store orders with coupon code and discount amount; track last used date for daily limits
- Session Management: Maintain coupon state across page navigation using sessionStorage
- User Experience: Provide intuitive UI with copy-to-clipboard, toast notifications, and auto-navigation

**Section sources**
- [coupon.ts:3-17](file://lib/coupon.ts#L3-L17)
- [store.ts:1-217](file://lib/store.ts#L1-L217)
- [schema.prisma:47-97](file://prisma/schema.prisma#L47-L97)
- [route.ts (coupon validation):1-58](file://app/api/coupons/validate/route.ts#L1-L58)
- [route.ts (orders):150-245](file://app/api/orders/route.ts#L150-L245)

## Architecture Overview
The system follows a layered architecture with enhanced session management:
- Client layer: Enhanced checkout and promo pages interact with public coupon validation and promo endpoints
- Session layer: Manages cross-page state for coupon codes using browser sessionStorage
- API layer: Next.js route handlers validate inputs, call domain logic, and persist data
- Domain layer: Reusable functions encapsulate business rules for coupon validation and discount calculation
- Data layer: Prisma client queries PostgreSQL tables for coupons, promos, and orders

```mermaid
sequenceDiagram
participant Client as "Enhanced UI"
participant PromoPage as "Promo Page"
participant Session as "Session Storage"
participant Validate as "POST /api/coupons/validate"
participant Engine as "checkCouponRules()"
participant DB as "Prisma/Coupons"
participant Orders as "POST /api/orders"
PromoPage->>Session : Store selected coupon code
PromoPage->>Client : Navigate to checkout
Client->>Session : Retrieve saved coupon code
Client->>Validate : Submit {code, subtotal}
Validate->>DB : Find coupon by code
DB-->>Validate : Coupon record
Validate->>Engine : Validate rules + compute discount
Engine-->>Validate : {valid, coupon, discountAmount}
Validate-->>Client : {valid, coupon, discountAmount}
Client->>Orders : Submit order with couponCode
Orders->>DB : Find coupon by code
Orders->>Engine : Validate rules + compute discount
Engine-->>Orders : {valid, discountAmount}
Orders->>DB : Create order (atomic transaction)
Orders-->>Client : Order result
```

**Diagram sources**
- [page.tsx (promo):59-99](file://app/promo/page.tsx#L59-L99)
- [page.tsx (checkout):76-83](file://app/checkout/page.tsx#L76-L83)
- [route.ts (coupon validation):1-58](file://app/api/coupons/validate/route.ts#L1-L58)
- [coupon.ts:80-132](file://lib/coupon.ts#L80-L132)
- [route.ts (orders):150-245](file://app/api/orders/route.ts#L150-L245)

## Detailed Component Analysis

### Enhanced Session Storage Integration
The system now uses browser sessionStorage to maintain coupon state across page navigation:

**Session Storage Flow:**
- When users copy or use a coupon on the promo page, the code is stored in `wkb_selected_coupon`
- On checkout page load, the system automatically retrieves and populates the coupon input field
- The session data is cleared after successful retrieval to prevent reuse

**Implementation Details:**
- Promo page stores coupon codes when copied or used
- Checkout page reads and auto-populates the coupon input field
- Automatic cleanup prevents stale session data from interfering with new sessions

```mermaid
flowchart TD
UserAction["User copies/uses coupon"] --> StoreSession["Store in sessionStorage"]
StoreSession --> Navigate["Navigate to checkout"]
Navigate --> ReadSession["Read from sessionStorage"]
ReadSession --> AutoPopulate["Auto-populate coupon input"]
AutoPopulate --> ClearSession["Clear session data"]
```

**Diagram sources**
- [page.tsx (promo):59-89](file://app/promo/page.tsx#L59-L89)
- [page.tsx (checkout):76-83](file://app/checkout/page.tsx#L76-L83)

**Section sources**
- [page.tsx (promo):59-89](file://app/promo/page.tsx#L59-L89)
- [page.tsx (checkout):76-83](file://app/checkout/page.tsx#L76-L83)

### Enhanced User Interface Design
The coupon system now features a modern, ticket-style UI design:

**Promo Page Features:**
- Ticket-style coupon cards with perforated edges and vintage styling
- Copy-to-clipboard functionality with visual feedback
- Toast notifications guiding users to next steps
- Quick navigation to checkout or menu based on cart state
- Visual indicators for discount types (percentage vs fixed amount)

**Checkout Page Enhancements:**
- Quick coupon selection interface showing available coupons
- Real-time validation with immediate feedback
- Applied coupon display with removal option
- Enhanced visual hierarchy with color-coded status indicators
- Improved form validation and error messaging

**Section sources**
- [page.tsx (promo):121-567](file://app/promo/page.tsx#L121-L567)
- [page.tsx (checkout):328-453](file://app/checkout/page.tsx#L328-L453)

### Discount Calculation Engine
Responsibilities remain consistent with enhanced integration:
- Determine if a coupon is available today using lastUsedDate
- Calculate discount amount based on discountType (PERCENTAGE or FIXED), discountValue, optional maxDiscountAmount, and subtotal
- Provide a unified validation function that checks active status, date range, daily usage, and minimum order amount

Complexity:
- Time complexity: O(1) per validation and discount calculation
- Space complexity: O(1)

Optimization opportunities:
- Cache frequently validated coupons in memory for short-lived sessions
- Precompute discount ranges for common subtotal buckets if needed

Error handling:
- Returns structured results indicating validity and error messages
- Ensures discount never exceeds subtotal and is non-negative

```mermaid
flowchart TD
Start(["Start checkCouponRules"]) --> CheckActive["Check isActive and existence"]
CheckActive --> |Invalid| ReturnInactive["Return invalid: inactive or not found"]
CheckActive --> |Valid| CheckDates["Check startDate <= now <= endDate"]
CheckDates --> |Expired or Not Started| ReturnDateError["Return invalid: date range error"]
CheckDates --> CheckDaily["Check isCouponAvailableToday(lastUsedDate)"]
CheckDaily --> |Used Today| ReturnDailyError["Return invalid: used today"]
CheckDaily --> CheckMinOrder["Check subtotal >= minOrderAmount"]
CheckMinOrder --> |Below Minimum| ReturnMinError["Return invalid: minimum order not met"]
CheckMinOrder --> CalcDiscount["Calculate discount amount"]
CalcDiscount --> ReturnSuccess["Return valid with discountAmount"]
```

**Diagram sources**
- [coupon.ts:23-61](file://lib/coupon.ts#L23-L61)
- [coupon.ts:80-132](file://lib/coupon.ts#L80-L132)

**Section sources**
- [coupon.ts:1-133](file://lib/coupon.ts#L1-L133)

### Coupon Validation Rules
Rules enforced remain consistent with enhanced UI integration:
- Coupon must exist and be active
- Current time must be within the start and end dates
- Coupon can be used only once per calendar day (based on lastUsedDate)
- Subtotal must meet the minimum order amount
- Discount calculation respects percentage/fixed types and optional maximum discount cap

Validation flow:
- Input normalization: Trim and uppercase coupon code
- Database lookup: Retrieve coupon by unique code
- Rule evaluation: Apply all business rules
- Result: Return structured response with coupon details and computed discount when valid

```mermaid
flowchart TD
Input["Input: code, subtotal"] --> Normalize["Normalize code (trim, uppercase)"]
Normalize --> Lookup["Lookup coupon by code"]
Lookup --> Exists{"Coupon exists and active?"}
Exists --> |No| ErrorInactive["Error: not found or inactive"]
Exists --> |Yes| DateRange["Check date range"]
DateRange --> DailyLimit["Check daily usage"]
DailyLimit --> MinOrder["Check minimum order amount"]
MinOrder --> Compute["Compute discount"]
Compute --> Success["Return valid with discountAmount"]
```

**Diagram sources**
- [route.ts (coupon validation):1-58](file://app/api/coupons/validate/route.ts#L1-L58)
- [coupon.ts:80-132](file://lib/coupon.ts#L80-L132)

**Section sources**
- [route.ts (coupon validation):1-58](file://app/api/coupons/validate/route.ts#L1-L58)
- [coupon.ts:80-132](file://lib/coupon.ts#L80-L132)

### Promotional Pricing Logic
Promo items are stored with original and discounted prices and displayed as enhanced menu items. The checkout page converts a selected promo into a cart item using its discounted price.

Display behavior:
- List active promos via GET /api/promos
- Optionally include inactive promos for admin purposes
- Add promo as a cart item with name, description, and discounted price

Creation and updates:
- Admin endpoints support creating, updating, and deleting promos
- Fields include title, description, originalPrice, discountedPrice, and isActive

```mermaid
classDiagram
class Promo {
+string id
+string title
+string description
+int originalPrice
+int discountedPrice
+boolean isActive
}
class PromoAPI {
+GET()
+POST()
+PUT(id)
+DELETE(id)
}
PromoAPI --> Promo : "manages"
```

**Diagram sources**
- [schema.prisma:47-56](file://prisma/schema.prisma#L47-L56)
- [route.ts (promos list/create):1-38](file://app/api/promos/route.ts#L1-L38)
- [route.ts (promo update/delete):1-52](file://app/api/promos/[id]/route.ts#L1-L52)

**Section sources**
- [schema.prisma:47-56](file://prisma/schema.prisma#L47-L56)
- [route.ts (promos list/create):1-38](file://app/api/promos/route.ts#L1-L38)
- [route.ts (promo update/delete):1-52](file://app/api/promos/[id]/route.ts#L1-L52)
- [page.tsx (checkout):104-120](file://app/checkout/page.tsx#L104-L120)

### Enhanced Coupon Creation Workflow
Admin workflow remains consistent with enhanced integration:
- Validate required fields: code, title, discountType, discountValue, minOrderAmount, startDate, endDate
- Enforce business constraints: positive discount values, percentage <= 100%, valid date ranges, no duplicate codes
- Persist coupon with default active state unless specified otherwise

Enrichment:
- Admin list endpoint enriches coupons with isAvailableToday flag using the same daily availability logic

```mermaid
flowchart TD
AdminRequest["Admin POST /api/admin/coupons"] --> ValidateFields["Validate fields and constraints"]
ValidateFields --> CheckDuplicate["Check duplicate code"]
CheckDuplicate --> Persist["Persist coupon"]
Persist --> Response["Return created coupon"]
```

**Diagram sources**
- [route.ts (admin coupons list and create):29-129](file://app/api/admin/coupons/route.ts#L29-L129)

**Section sources**
- [route.ts (admin coupons list and create):1-129](file://app/api/admin/coupons/route.ts#L1-L129)

### Usage Tracking and Expiration Handling
Usage tracking remains consistent with enhanced UI integration:
- Daily usage is tracked via lastUsedDate field
- isCouponAvailableToday compares lastUsedDate with current date to determine availability
- On successful order creation, the system updates usage metadata atomically within a transaction

Expiration handling:
- Validation rejects coupons outside their startDate and endDate
- Listing endpoints filter by active status and date range

```mermaid
stateDiagram-v2
[*] --> Available
Available --> UsedToday : "order placed"
UsedToday --> AvailableNextDay : "new calendar day"
AvailableNextDay --> Available
```

**Diagram sources**
- [coupon.ts:23-33](file://lib/coupon.ts#L23-L33)
- [route.ts (orders):195-217](file://app/api/orders/route.ts#L195-L217)

**Section sources**
- [coupon.ts:23-33](file://lib/coupon.ts#L23-L33)
- [route.ts (orders):195-217](file://app/api/orders/route.ts#L195-L217)

### Enhanced Menu Item Promotion Display
Promo items are presented as enhanced menu entries with discounted prices. The checkout page adds selected promos to the cart as regular items using the discounted price.

Behavior:
- Fetch active promos from API
- Convert promo to a cart item with name, description, and discounted price
- Show promo selection in enhanced checkout UI

**Section sources**
- [route.ts (promos list/create):1-38](file://app/api/promos/route.ts#L1-L38)
- [page.tsx (checkout):104-120](file://app/checkout/page.tsx#L104-L120)

### Enhanced Cart Discount Application
On the enhanced checkout page:
- User enters a coupon code or selects from quick selection interface
- Frontend calls POST /api/coupons/validate with code and subtotal
- If valid, frontend displays applied coupon and discount amount with enhanced styling
- Frontend recalculates preview discount when subtotal changes, ensuring consistency with server-side rules

Important note:
- Final totals are recomputed server-side during order creation; frontend preview is for display only

```mermaid
sequenceDiagram
participant UI as "Enhanced Checkout UI"
participant API as "POST /api/coupons/validate"
participant Engine as "checkCouponRules()"
UI->>API : {code, subtotal}
API->>Engine : Validate + compute discount
Engine-->>API : {valid, coupon, discountAmount}
API-->>UI : {valid, coupon, discountAmount}
UI->>UI : Update applied coupon and discount preview with enhanced styling
```

**Diagram sources**
- [page.tsx (checkout):152-185](file://app/checkout/page.tsx#L152-L185)
- [route.ts (coupon validation):1-58](file://app/api/coupons/validate/route.ts#L1-L58)
- [coupon.ts:80-132](file://lib/coupon.ts#L80-L132)

**Section sources**
- [page.tsx (checkout):152-185](file://app/checkout/page.tsx#L152-L185)
- [route.ts (coupon validation):1-58](file://app/api/coupons/validate/route.ts#L1-L58)

### Order Total Calculations
Server-side order creation remains consistent with enhanced integration:
- Validates items and add-ons
- Computes subtotal from validated items
- Optionally validates coupon and computes discount
- Calculates tax and service charge based on configured rates
- Computes final total: subtotal - discount + tax + service charge
- Creates order atomically within a transaction, recording coupon usage

```mermaid
flowchart TD
Items["Validate items and add-ons"] --> Subtotal["Compute subtotal"]
Subtotal --> CouponCheck{"Coupon provided?"}
CouponCheck --> |Yes| ValidateCoupon["Validate coupon + compute discount"]
CouponCheck --> |No| SkipCoupon["Skip coupon"]
ValidateCoupon --> Taxes["Compute tax and service charge"]
SkipCoupon --> Taxes
Taxes --> Total["Compute total = subtotal - discount + tax + service charge"]
Total --> CreateOrder["Create order atomically"]
```

**Diagram sources**
- [route.ts (orders):150-245](file://app/api/orders/route.ts#L150-L245)

**Section sources**
- [route.ts (orders):150-245](file://app/api/orders/route.ts#L150-L245)

## Dependency Analysis
Coupling and cohesion remain consistent with enhanced integration:
- The discount engine is decoupled from API routes, promoting reuse and testability
- Session storage utilities provide cross-page state management without tight coupling
- API routes depend on Prisma for data access and on the discount engine for business logic
- Enhanced UI components depend on public coupon validation and promo endpoints

External dependencies:
- PostgreSQL database accessed via Prisma
- Browser sessionStorage for cross-page state management
- Next.js runtime for API routes

Potential circular dependencies:
- None observed; domain logic is isolated in the library module

```mermaid
graph LR
Engine["Discount Engine (coupon.ts)"] --> API_Coupons["Coupons API"]
Engine --> API_Orders["Orders API"]
SessionStorage["Session Storage Utilities"] --> UI_Promo["Promo UI"]
SessionStorage --> UI_Checkout["Checkout UI"]
API_Coupons --> DB["Prisma/Coupons"]
API_Orders --> DB
UI_Checkout --> API_Coupons
UI_Checkout --> API_Promos["Promos API"]
UI_Promo --> API_Coupons
UI_Promo --> API_Promos
API_Promos --> DB
```

**Diagram sources**
- [coupon.ts:1-133](file://lib/coupon.ts#L1-L133)
- [store.ts:1-217](file://lib/store.ts#L1-L217)
- [route.ts (coupons list):1-33](file://app/api/coupons/route.ts#L1-L33)
- [route.ts (coupon validation):1-58](file://app/api/coupons/validate/route.ts#L1-L58)
- [route.ts (orders):150-245](file://app/api/orders/route.ts#L150-L245)
- [route.ts (promos list/create):1-38](file://app/api/promos/route.ts#L1-L38)

**Section sources**
- [coupon.ts:1-133](file://lib/coupon.ts#L1-L133)
- [store.ts:1-217](file://lib/store.ts#L1-L217)
- [route.ts (coupons list):1-33](file://app/api/coupons/route.ts#L1-L33)
- [route.ts (coupon validation):1-58](file://app/api/coupons/validate/route.ts#L1-L58)
- [route.ts (orders):150-245](file://app/api/orders/route.ts#L150-L245)
- [route.ts (promos list/create):1-38](file://app/api/promos/route.ts#L1-L38)

## Performance Considerations
- Indexing: Ensure indexes on coupon.code and coupon.isActive to speed up lookups and filtering
- Query optimization: Use server-side filters for active and date-range-valid coupons to reduce payload size
- Caching: Consider short-term in-memory caching for frequently accessed coupons and promos to reduce database load
- Transaction efficiency: Keep order creation transactions minimal and focused on essential writes
- Frontend preview: Avoid redundant recalculations by debouncing subtotal changes in the checkout UI
- Session storage: Leverage browser sessionStorage for lightweight cross-page state management without server overhead

## Security and Fraud Prevention
Measures implemented remain consistent with enhanced integration:
- Server-side authoritative validation: All coupon validations and discount computations occur on the server
- Strict input validation: Admin endpoints enforce field constraints, positive values, percentage limits, and valid date ranges
- Unique code enforcement: Duplicate coupon codes are rejected at creation and update
- Soft delete for coupons: Deactivation sets isActive to false rather than deleting records, preserving audit trails
- Atomic operations: Order creation and coupon usage updates occur within a transaction to prevent race conditions
- Session storage security: Uses browser sessionStorage which is more secure than localStorage for temporary state

Recommended enhancements:
- Rate limiting on coupon validation endpoints to mitigate abuse
- Request signing or CSRF protection for sensitive admin operations
- Audit logging for coupon usage and modifications
- IP-based throttling and anomaly detection for repeated failed validations
- Session storage validation to prevent tampering with coupon codes

**Section sources**
- [route.ts (admin coupons list and create):29-129](file://app/api/admin/coupons/route.ts#L29-L129)
- [route.ts (admin coupon update/delete):1-102](file://app/api/admin/coupons/[id]/route.ts#L1-L102)
- [route.ts (orders):195-217](file://app/api/orders/route.ts#L195-L217)

## Troubleshooting Guide
Common issues and resolutions remain consistent with enhanced integration:
- Coupon not found or inactive: Verify isActive and existence in the database; ensure correct code casing
- Coupon expired or not started: Check startDate and endDate against current time
- Daily usage limit reached: Confirm lastUsedDate is not on the current calendar day
- Minimum order amount not met: Increase subtotal or adjust coupon minOrderAmount
- Invalid discount configuration: Ensure discountValue is positive and percentage <= 100%; verify maxDiscountAmount logic
- Order creation errors: Inspect server logs for transaction failures and ensure coupon validation passes before submission
- Session storage issues: Check browser console for sessionStorage errors and verify cross-page navigation flow

Operational tips:
- Use admin endpoints to list coupons with isAvailableToday flags for quick diagnostics
- Validate coupon responses from POST /api/coupons/validate before applying them in the UI
- Monitor order creation logs to confirm atomic updates and correct total calculations
- Test session storage flow between promo and checkout pages to ensure smooth user experience

**Section sources**
- [route.ts (coupon validation):1-58](file://app/api/coupons/validate/route.ts#L1-L58)
- [route.ts (admin coupons list and create):1-129](file://app/api/admin/coupons/route.ts#L1-L129)
- [route.ts (orders):150-245](file://app/api/orders/route.ts#L150-L245)

## Conclusion
The enhanced promotions and coupons system provides a robust foundation for managing promotional pricing and coupon-based discounts with improved user experience. It enforces strict validation rules, calculates discounts accurately, and ensures order totals are computed authoritatively on the server. The modern ticket-style UI design, session storage integration, and enhanced user interface features create a seamless shopping experience. Admin APIs facilitate safe management of coupons and promos, while usage tracking and atomic transactions maintain data integrity. With additional security and performance enhancements, the system can scale effectively to handle high-volume promotions and coupon usage while providing an intuitive and engaging user interface.