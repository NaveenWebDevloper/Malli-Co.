# Malli & Co.

> Premium men's and kids' clothing e-commerce platform built with Next.js (App Router), TypeScript, Tailwind CSS, MongoDB Atlas with Mongoose, and modern creative web technologies.

---

## 1. Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **Database & ODM**: MongoDB Atlas with Mongoose
- **Authentication**: Auth.js (NextAuth v5)
- **Validation**: Zod
- **3D & Creative**: React Three Fiber (`@react-three/fiber`), `@react-three/drei`
- **Animation & Smooth Scroll**: GSAP, Lenis
- **Payment Processing**: Razorpay (INR transactions in paise)

---

## 2. Directory Structure

```text
├── app/
│   ├── (store)/          # Public storefront route group (layout, page)
│   ├── admin/            # Protected admin management dashboard
│   ├── api/              # API Route handlers (e.g., /api/health)
│   ├── globals.css       # Tailwind CSS root imports
│   └── layout.tsx        # Root HTML shell
├── components/
│   ├── ui/               # Reusable UI component primitives
│   └── three/            # Isolated 3D components (R3F, Drei - SSR: false)
├── lib/
│   └── db.ts             # Cached Mongoose connection helper
├── models/               # Mongoose schema and model definitions
├── .env.example          # Environment variable template
├── AGENTS.md             # Core workspace rules and development constraints
├── package.json          # Project dependencies and npm scripts
├── tsconfig.json         # Strict TypeScript compiler options
└── tailwind.config.ts    # Tailwind CSS configuration
```

---

## 3. Getting Started & Setup

### Prerequisites

- **Node.js**: v20+ or v22+
- **npm**: v10+
- **MongoDB Atlas** database cluster (or local MongoDB instance)

### Installation

1. **Clone the repository**:

   ```bash
   git clone <repo-url>
   cd "Malli & Co."
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

   Open `.env.local` and configure your MongoDB connection string:

   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/malli_and_co?retryWrites=true&w=majority
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the storefront, or [http://localhost:3000/admin](http://localhost:3000/admin) to view the admin area.

---

## 4. Available Scripts

| Command             | Action                                                          |
| :------------------ | :-------------------------------------------------------------- |
| `npm run dev`       | Starts the Next.js development server at `localhost:3000`.      |
| `npm run build`     | Compiles the production build.                                  |
| `npm run start`     | Launches the compiled production application.                   |
| `npm run typecheck` | Validates TypeScript types across the project (`tsc --noEmit`). |
| `npm run lint`      | Runs Next.js ESLint checks.                                     |
| `npm run format`    | Formats all code files using Prettier and Tailwind plugin.      |

---

## 5. Architectural & Development Standards

Refer to [AGENTS.md](./AGENTS.md) for mandatory rules governing this workspace:

1. **Pricing & Currency**: Never trust client prices. All amounts are stored and calculated strictly as **integer paise** (e.g., ₹1,499.00 = `149900`).
2. **Stock & Inventory**: No read-then-write operations on stock. Use atomic conditional updates (`findOneAndUpdate` with `$gte` check and `$inc`) inside a Mongoose transaction (`session.withTransaction`), and audit all changes in `inventorymovements`.
3. **Database Connectivity**: All database access must use `connectDB()` from `lib/db.ts` to prevent connection leaks across serverless invocations and hot-reloads.
4. **Validation**: Validate all inputs with Zod schemas on the server before database operations.
5. **Admin Access**: All `/admin` pages and `/api/admin/*` endpoints strictly require the `ADMIN` role.
6. **3D Component Isolation**: 3D code lives strictly in `components/three/`, loaded dynamically with `{ ssr: false }`, and must supply a non-3D fallback.
