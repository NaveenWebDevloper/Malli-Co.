# Malli & Co. — Workspace Rules & Guidelines

> **Malli & Co.** is a premium men's and kids' clothing e-commerce platform built with modern web technologies, strict data integrity, and high-performance immersive visual experiences.

---

## 1. Project Overview & Tech Stack

- **Framework**: Next.js (App Router, React Server Components where applicable)
- **Language**: TypeScript (strict mode enabled, zero implicit `any`)
- **Styling**: Tailwind CSS
- **Database & ODM**: MongoDB Atlas with Mongoose
- **Authentication**: Auth.js (NextAuth v5)
- **Validation**: Zod (strict server-side validation)
- **3D & Creative**: React Three Fiber (`@react-three/fiber`), `@react-three/drei`
- **Animation & Scrolling**: GSAP (GreenSock), Lenis (smooth scroll)
- **Payments**: Razorpay (INR transactions in paise)

---

## 2. Core Development Rules

### Rule 1: Never Trust Client Prices — Compute Server-Side

- **Client inputs are untrusted**: The client must never supply unit prices, discount calculations, tax amounts, or final payable totals.
- **Server computation**: Fetch canonical product prices directly from MongoDB by product/SKU ID.
- Recompute item subtotals, coupon/promo discounts, shipping rates, and tax fees strictly on the server before initiating checkout or creating payment orders.
- Razorpay order creation (`razorpay.orders.create`) must use exclusively server-verified totals.
- Verify Razorpay payment signatures on the server before marking any order as paid or triggering fulfillment.

### Rule 2: Currency Stored Exclusively as Integer Paise

- **Format**: All monetary amounts in database schemas, calculations, and APIs must be represented as **integer paise** (e.g., `₹1,499.00` is stored as `149900`).
- **Zero Floating-Point Math**: Never store or calculate money using floating-point numbers.
- **Display Conversion**: Convert paise to rupees only at the UI presentation boundary using a dedicated formatting utility (e.g., `formatCurrency(paise)`).

### Rule 3: Atomic Stock Updates & Inventory Movement Logging

- **No Read-Then-Write**: Never perform a read (`findById` / `findOne`) followed by a separate write (`save()` / `updateOne`) for stock deduction. This prevents race conditions and overselling.
- **Atomic Conditional Updates**: Stock deduction must use atomic updates with a `$gte` stock guard:
  ```ts
  const updatedProduct = await Product.findOneAndUpdate(
    {
      _id: productId,
      "variants.sku": sku,
      "variants.stock": { $gte: quantity },
    },
    { $inc: { "variants.$.stock": -quantity } },
    { session, new: true },
  );
  if (!updatedProduct) {
    throw new Error(`Insufficient stock for SKU: ${sku}`);
  }
  ```
- **Mongoose Transactions**: Stock updates must execute within a Mongoose transaction session (`session.withTransaction(...)`).
- **Mandatory Audit Logging**: Every stock change (deduction, refund, restock, manual adjustment) must create a corresponding document in the `inventorymovements` collection within the same transaction:
  - Document fields: `productId`, `sku`, `quantityDelta` (negative for reductions, positive for additions), `previousStock`, `newStock`, `reason` (`ORDER_PLACED`, `ORDER_CANCELLED`, `RETURN`, `RESTOCK`, `MANUAL_ADJUSTMENT`), `referenceId` (e.g., `orderId`), and `timestamp`.

### Rule 4: Explicit Schema Indexes in Mongoose

- **Explicit Indexing**: All unique constraints and query indexes must be explicitly defined in Mongoose schema definitions.
- **Examples**:
  - Unique fields: `email`, `slug`, `sku` (`{ unique: true, index: true }`).
  - Query indexes: Compound indexes for common queries (e.g., `{ category: 1, status: 1, pricePaise: 1 }`, `{ userId: 1, createdAt: -1 }`).
  - Text search indexes for catalog search where needed.
- Do not rely on implicit or ad-hoc runtime indexing.

### Rule 5: Shared Cached Database Connection in `lib/db.ts`

- **Single Connection Helper**: All database access must use a single shared cached connection helper located at `lib/db.ts`.
- **Serverless & Dev Optimization**: Cache the connection on `globalThis` to prevent connection leaks across hot-reloads in Next.js development and cold/warm executions in serverless runtimes.
- Do not call `mongoose.connect()` directly anywhere else in the application.

### Rule 6: Server-Side Input Validation with Zod

- **Validate Before DB**: Every API route handler, Server Action, and webhook must validate its payload (body, query params, headers, route params) using a Zod schema before invoking database operations or business logic.
- Use `safeParse()` or structured parse handlers to return uniform validation errors (HTTP 400).
- Never trust raw user input in database queries to avoid NoSQL injection.

### Rule 7: Admin Route Protection (Role: ADMIN)

- **Strict Role-Based Access Control (RBAC)**: All `/admin` pages and all `/api/admin/*` API endpoints require authenticated users with the `ADMIN` role.
- Enforce access control in Next.js middleware as the first line of defense.
- Re-verify session validity and the `ADMIN` role within server actions and route handlers before executing privileged logic.
- Unauthenticated requests must redirect to login or return HTTP 401; non-admin users must receive HTTP 403 Forbidden.

### Rule 8: 3D Code Isolation & Lazy Loading

- **Dedicated Directory**: All Three.js, React Three Fiber, and Drei code must live exclusively inside `/components/three/`.
- **Dynamic Imports**: 3D components must never be imported statically into server or general client components. Always load them dynamically with SSR disabled:
  ```tsx
  const ModelViewer = dynamic(() => import("@/components/three/ModelViewer"), {
    ssr: false,
    loading: () => <ProductImageFallback />,
  });
  ```
- **Mandatory Non-3D Fallback**: Every 3D feature must supply a graceful non-3D fallback (e.g., optimized product photography carousel, skeleton placeholder, or static 2D interactive preview) for performance, mobile devices, and environments where WebGL is unsupported or disabled.

### Rule 9: Animation & Scrolling Standards (GSAP & Lenis)

- GSAP animations and Lenis smooth scrolling must be initialized inside React `useEffect` or `useLayoutEffect` hooks with proper cleanup (destroy Lenis instances, kill GSAP triggers and tweens).
- Always respect user accessibility preferences (`prefers-reduced-motion`).

---

## 3. Workflow & Collaboration Rules

### Rule 10: Strict Dependency Governance

- **No Unapproved Dependencies**: Do not install any new npm dependency without explicitly stating the reason, benefits, bundle size implications, and receiving explicit user approval.
- Leverage the existing stack to its fullest potential before considering additional packages.

### Rule 11: Task Completion Verification

After completing every task, run the following verification steps:

1. **Typecheck**: `npm run typecheck` (or `npx tsc --noEmit`)
2. **Lint**: `npm run lint`
3. **Build**: `npm run build`

Always summarize the task outcome with an explicit list of files changed, created, or removed.

### Rule 12: Scope Adherence

- Work strictly on the assigned task.
- Do not perform unsolicited refactoring on unrelated files or restructure existing code outside the prompt's defined scope.
