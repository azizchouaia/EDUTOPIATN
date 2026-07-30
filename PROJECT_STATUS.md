# Edutopia Academy — Project Status & Roadmap

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.2.0 |
| Routing | TanStack Router (file-based) | 1.168.0 |
| Build Tool | Vite | 7.3.1 |
| Language | TypeScript (strict mode) | 5.8.3 |
| Styling | Tailwind CSS + Shadcn/ui | 4.2.1 |
| Icons | Lucide React | 0.575.0 |
| Forms | React Hook Form + Zod | 7.71.2 / 3.24.2 |
| Data Fetching | TanStack React Query | 5.83.0 |
| Charts | Recharts | 2.15.4 |
| Notifications | Sonner | 2.0.7 |
| Deployment | Cloudflare Workers (Wrangler) | — |

**Design System:**
- Primary color: Bordeaux
- Accent color: Gold
- Display font: Playfair Display
- Background: Warm ivory white

---

## Repository State

- Root repository now lives at `Edutopia/` and is pushed to `https://github.com/azizchouaia/EDUTOPIATN.git`
- Frontend is no longer tracked as a separate nested git repository
- Root `.gitignore` now excludes `node_modules`, build output, and local env files

---

## Current Progress

| Phase | Status |
|-------|--------|
| Phase 1 — Backend Foundation | ✅ Complete |
| Phase 2 — Frontend ↔ Backend Integration | ✅ Complete |
| Phase 3 — Admin, Commerce & Validation | 🟡 In progress |
| Phase 4 — Subscription Access, Payments & Emails | 🟡 In progress |
| Phase 5 — Production Hardening | 🔲 Not started |

---

## Pages & Current Status

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Home | `/` | ✅ Complete | Polished landing page with CTAs and quick links |
| Login / Signup | `/login` | ✅ Complete | JWT auth wired; admin redirects to `/admin`, others to `/dashboard`, and forgot-password now runs by email code from the login page |
| Dashboard | `/dashboard` | ✅ Complete | Real user data + enrollments with SSR-safe hydration |
| Courses | `/courses` | ✅ Complete | Live catalog with subscription gate and blurred locked state when access is blocked |
| Events | `/events` | ✅ Complete | Free sessions hub with Google Meet lives, free videos, registration/cancel for live seats, and create event flow |
| Market | `/market` | ✅ Complete | Real products, local cart, promo code, payment method selection, delivery coordinates, order creation |
| Subscriptions | `/subscriptions` | ✅ Complete | Dedicated page separated from products; DB-backed plans, activation-code flow, bank-transfer receipt upload, and admin approval path |
| Team | `/team` | ✅ Complete | Live API-backed team page; no longer static |
| Support | `/reclamations` | ✅ Complete | Live ticket form and status tracking |
| Profile | `/profile` | ✅ Complete | Authenticated profile management |
| Teacher Workspace | `/teacher` | ✅ Complete | Dedicated teacher surface for course CRUD, chapters/resources, owned sessions, student roster, and analytics |
| Parent Workspace | `/parent` | ✅ Complete | Read-only parent dashboard for linked child progress and enrollments |
| Admin Workspace | `/admin`, `/admin/$module` | ✅ Complete | Routed admin workspace with module pages instead of one long screen |

**Admin modules currently implemented:**
- Overview
- Users
- Courses
- Events
- Products
- Orders
- Promo Codes
- Subscriptions
- Reclamations
- Team

---

## What Is Done ✅

### Frontend

- Responsive public app built with TanStack Router and React Query
- SSR-safe auth helpers and redirect logic
- Shared Axios client with JWT interceptor and 401 reset handling
- Live dashboard, courses, events, market, support, profile, team, and subscriptions pages
- Dedicated teacher workspace at `/teacher` for managing owned courses
- Teacher workspace now includes a visible teacher profile block and owned session management
- Teacher workspace now includes enrolled-student roster and basic course analytics
- Market upgraded from one-click purchase to a real cart + checkout flow
- Separate subscriptions page added; subscriptions are no longer mixed into the products UI
- Admin workspace refactored into routed pages with a dedicated admin shell
- Admin navigation and overview dashboard implemented
- Toast notifications and loading states wired across the app
- Login now includes a professional forgot-password flow with email reset code request and password update in the same auth surface
- Parent accounts now have a dedicated `/parent` workspace with linked-child progress cards and course-by-course tracking
- Courses now render a blurred locked UI when the backend returns `403 SUBSCRIPTION_REQUIRED`
- Courses now use subject and chapter detail routes under `/courses/$subjectSlug` and `/courses/$subjectSlug/$chapterSlug`
- Events page now supports free Google Meet lives plus free video sessions with public access
- Subscriptions page now supports activation-code entry plus bank-transfer receipt upload before approval
- Teacher workspace now supports chapter and resource management per owned course
- Teacher workspace now supports teacher-owned Google Meet/video session CRUD in the same surface
- Teacher workspace now supports per-course student roster, completion count, and average progress analytics

### Backend

- Express API running on port 5000 with MySQL/MariaDB
- Canonical schema in `backend/database.sql`
- Current schema includes 21 main tables:
    - `users`
    - `parent_student_links`
    - `courses`
    - `course_chapters`
    - `course_resources`
    - `academic_tracks`
    - `subjects`
    - `track_subjects`
    - `chapters`
    - `chapter_resources`
    - `enrollments`
    - `events`
    - `event_registrations`
    - `products`
    - `promo_codes`
    - `orders`
    - `order_items`
    - `subscriptions`
    - `subscription_plans`
    - `team_members`
    - `reclamations`
- JWT auth middleware and role-based access control in place
- Controllers and routes implemented for auth, users, parent, courses, events, market, subscriptions, team, and reclamations
- Admin order status update endpoint implemented
- Promo codes can target specific products
- Subscriptions now support duration selection and a DB-backed plan catalog
- Academic curriculum is now backed by `academic_tracks`, `subjects`, `track_subjects`, `chapters`, and `chapter_resources`
- Student access to courses is enforced by backend subscription middleware returning `403 SUBSCRIPTION_REQUIRED`
- Events backend now supports `google_meet` and `video` delivery modes with a direct access URL
- Events are readable without subscription gating; live Meet sessions keep seat reservations while videos are directly accessible
- Subscription backend now supports three open states: `pending_receipt`, `pending_approval`, and `pending_code`
- Bank-transfer subscriptions require receipt upload and admin approval before an activation code is generated
- Receipt uploads are stored and served from the backend for admin-side verification
- Teacher-owned course content is now backed by `course_chapters` and `course_resources`
- Teachers can manage the outline of their own courses without admin access
- Password reset now supports request-code and reset-password endpoints with hashed reset codes, expiry handling, and SMTP delivery with console fallback when SMTP is not configured
- Parent-child access is now backed by `parent_student_links`, with admin assignment in the users module and parent-only progress endpoints under `/api/parent`

### Commerce & Admin

- Product CRUD complete in admin
- Promo code CRUD complete in admin
- Subscription CRUD complete in admin
- Subscription bank-transfer approval flow complete in admin, including explicit receipt viewing and approval action
- Events admin now supports publishing free Google Meet lives and free video sessions
- Team CRUD complete in admin
- Reclamation management complete in admin
- Orders visible in admin with status updates
- Public team page now consumes live backend data
- Admin users module now supports linking parent accounts to student accounts so the parent workspace can read progress securely

---

## What Is Still Missing ❌

### Critical

1. **Real payment gateway**
    The app now supports subscription access control and a manual bank-transfer receipt review flow, but there is still no Stripe, PayPal, or real transaction processing.

2. **Email system**
    Password reset emails now exist through SMTP, but there is still no registration confirmation, subscription confirmation, activation-code delivery, or order notification email workflow.

### Important

3. **Legacy course detail page**
    There is still no dedicated `/courses/:id` route for the original course entity. The current curriculum flow already uses `/courses/$subjectSlug` and `/courses/$subjectSlug/$chapterSlug`.

4. **Teacher deeper learner activity**
    Teachers can now see enrolled students plus basic progress metrics, but they still cannot see detailed per-resource activity, last lesson viewed, or assessment performance.

5. **Parent invitation / approval flow**
    Parent-child links currently depend on admin assignment. There is still no invitation code, guardian approval, or self-service linking flow.

6. **Form validation audit**
    Zod is installed, but form validation is not consistently applied across the whole app.

7. **Full end-to-end admin validation pass**
    Core admin CRUD exists, but the final validation sweep across all modules is still pending.

8. **Bank-transfer approval notifications**
    Admin approval now generates the activation code, but there is still no email or notification delivery to the student.

### Nice to Have

9. Automated tests
10. Analytics / event tracking
11. Social OAuth login
12. Internationalization (Arabic/French/English)
13. PWA support
14. Error monitoring

---

## Roadmap

### ✅ Phase 1 — Backend Foundation

- [x] Express server and MySQL connection
- [x] JWT auth and role middleware
- [x] Core REST endpoints for app modules
- [x] Canonical SQL schema committed to repo

### ✅ Phase 2 — Frontend ↔ Backend Integration

- [x] Axios API client and auth storage helpers
- [x] React Query auth hooks
- [x] Public pages wired to live backend data
- [x] SSR-safe auth and redirect behavior

### 🟡 Phase 3 — Admin, Commerce & Validation

- [x] Routed admin workspace
- [x] Admin header chrome and module navigation
- [x] CRUD for users, courses, events, products, promo codes, subscriptions, team, reclamations
- [x] Admin orders module with status updates
- [x] Market cart + checkout flow
- [x] Dedicated subscriptions page
- [x] Live team page wiring
- [x] Subscription-gated access for courses
- [x] Free live/video event hub with Google Meet and direct video links
- [x] Bank-transfer receipt upload and admin approval before activation-code release
- [ ] Final validation pass across all admin flows
- [ ] Add consistent Zod schemas across forms
- [ ] Add better skeleton loaders for async sections
- [ ] Create course detail page
- [ ] Surface teacher-first course creation flow
- [ ] Reduce remaining `any` usage

### 🟡 Phase 4 — Subscription Access, Payments & Emails

- [x] Add subscription access-control workflow
- [x] Add manual bank-transfer verification flow
- [ ] Integrate a real payment provider
- [ ] Add online payment confirmation flow
- [ ] Expand transactional emails beyond password reset
- [ ] Add subscription cancellation / lifecycle UX from user dashboard

### 🔲 Phase 5 — Production Hardening

- [ ] Add automated tests for critical backend and frontend flows
- [ ] Add monitoring and error reporting
- [ ] Prepare backend deployment target
- [ ] Finalize production deployment pipeline

---

## File Structure Snapshot

```text
Edutopia/
├── .gitignore
├── README.md
├── PROJECT_STATUS.md
├── package.json
├── package-lock.json
├── frontend/
│   ├── package.json
│   └── src/
│       ├── routes/
│       │   ├── __root.tsx
│       │   ├── admin.tsx
│       │   ├── admin.index.tsx
│       │   ├── admin.$module.tsx
│       │   ├── index.tsx
│       │   ├── login.tsx
│       │   ├── dashboard.tsx
│       │   ├── courses.tsx
│       │   ├── courses.index.tsx
│       │   ├── courses.$subjectSlug.tsx
│       │   ├── courses.$subjectSlug.index.tsx
│       │   ├── courses.$subjectSlug.$chapterSlug.tsx
│       │   ├── events.tsx
│       │   ├── market.tsx
│       │   ├── subscriptions.tsx
│       │   ├── team.tsx
│       │   ├── reclamations.tsx
│       │   ├── profile.tsx
│       │   ├── teacher.tsx
│       │   └── parent.tsx
│       ├── components/
│       │   ├── SubscriptionGate.tsx
│       │   └── admin/
│       ├── hooks/
│       └── lib/
└── backend/
    ├── .env.example
    ├── package.json
    ├── database.sql
    ├── migrations/
    ├── uploads/
    │   └── subscription-receipts/
    └── src/
        ├── app.js
        ├── config/db.js
        ├── middleware/
        ├── controllers/
        ├── routes/
        │   ├── auth.js
        │   ├── courses.js
        │   ├── events.js
        │   ├── market.js
        │   ├── parent.js
        │   ├── reclamations.js
        │   ├── subscriptions.js
        │   ├── team.js
        │   └── users.js
        └── utils/
```

---

## Summary

The project is well past the original Phase 2 state. The public platform is live against the backend, the admin workspace is implemented as a routed control surface, the teacher and parent workspaces are both active, the market now supports a real cart and checkout form, subscriptions have moved onto their own database-backed page with selectable durations plus an activation workflow, the events area now works as a free sessions hub for both Google Meet lives and video content, and the login flow now includes email-based password reset.

The next meaningful milestone is not “build admin” anymore. It is to harden what already exists: validate all admin flows end to end, add stronger form validation, keep refining teacher and parent workflows, and then replace the temporary subscription activation flow with real payments and real email delivery.
