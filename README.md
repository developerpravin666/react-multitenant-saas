# React Multi-Tenant SaaS Starter

Production-oriented React + TypeScript architecture demonstrating:

- Runtime multi-tenant branding with CSS custom properties
- Light/dark theme context
- Collapsible application shell
- Accessible header/sidebar/footer
- Dynamic JSON-configured forms
- React Hook Form + Zod validation
- Extensible field component registry
- Strict TypeScript without `any` or `ts-ignore`
- Tailwind CSS runtime tenant tokens

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Authentication

Protected application routes redirect unauthenticated users to `/login`. The login form sends
`{ tenantSlug, username, password }` to `POST /auth/login` and accepts `token`, `accessToken`,
or `access_token` in the response (including inside a `data` object). The returned bearer token
is persisted for subsequent API requests. When an API request returns 401, the client posts the
stored refresh token to `/auth/refresh`, saves the returned access token, and retries the request.
Login and refresh responses may include `refreshToken` or `refresh_token`; refresh responses may
also rotate the refresh token. A failed refresh clears the local session. Signing out calls
`POST /auth/logout` and clears the local session even if that request fails.

Configure different endpoint paths when needed:

```env
VITE_AUTH_LOGIN_ENDPOINT=/auth/login
VITE_AUTH_LOGOUT_ENDPOINT=/auth/logout
VITE_AUTH_REFRESH_ENDPOINT=/auth/refresh
```

The refresh request body includes `refreshToken`, `accessToken`, and
`expiredAccessToken`. Both access token fields contain the access token that
received the unauthorized response.

## Architecture

```text
src/
├─ components/
│  ├─ layout/
│  │  ├─ AppShell.tsx
│  │  ├─ Header.tsx
│  │  ├─ Sidebar.tsx
│  │  └─ Footer.tsx
│  └─ ui/
│     ├─ Button.tsx
│     └─ FormFieldShell.tsx
├─ config/
│  └─ tenant.ts
├─ context/
│  ├─ TenantContext.tsx
│  └─ ThemeContext.tsx
├─ features/
│  └─ dynamic-form/
│     ├─ config/
│     │  └─ profileFormConfig.ts
│     ├─ fields/
│     │  ├─ fieldTypes.ts
│     │  ├─ TextField.tsx
│     │  ├─ EmailField.tsx
│     │  ├─ SelectField.tsx
│     │  └─ CheckboxField.tsx
│     ├─ registry/
│     │  └─ fieldRegistry.tsx
│     ├─ validation/
│     │  └─ schemaFactory.ts
│     └─ DynamicForm.tsx
├─ lib/
│  └─ color.ts
├─ styles/
│  └─ index.css
├─ types/
│  ├─ form.ts
│  └─ tenant.ts
├─ App.tsx
└─ main.tsx
```

## Production extension points

- Replace `src/config/tenant.ts` with tenant bootstrap data fetched before app render.
- Add API client/repository infrastructure under `src/services` or `src/lib/http`.
- Add routing under `src/app/router`.
- Add auth under `src/features/auth`.
- Add server-state management (for example TanStack Query) only for remote state.
- Keep UI state in local component/context state unless cross-feature sharing requires more.
- Keep domain-specific components inside their feature folders.

## Dynamic Grid (V3)

The project now includes a reusable generic DynamicGrid with interchangeable client/server processing modes, typed server query/result contracts, paging, global and column filtering, multi-sort, row selection, column visibility, density, CSV export, server refresh, loading/error/empty states, and accessible table semantics. See `src/features/dynamic-grid/README.md`.

## Shared Notification System

V3 also includes a shared feedback layer under `src/components/feedback` and `src/context/NotificationContext.tsx`.

It provides success/error/warning/info toasts, persistent alerts, and Promise-based confirmation dialogs. Mount `NotificationProvider` once near the application root and call `useNotifications()` from any feature.

---

## Strict Frontend Engineering & Coding Standards (Mandatory)

Whenever adding, updating, or refactoring code in this frontend application, all developers and AI coding agents must strictly adhere to the following rules:

### 1. Optimized, Clean & Easy-to-Understand Code
- **Readability First**: Write clean, declarative, and self-documenting code. Favor obvious, readable logic over clever or obscure one-liners.
- **Meaningful Naming**: Use descriptive, domain-accurate names for components, variables, hooks, and types (e.g., `fromLedgerId`, `isBalanced`, `totalDebit`). Avoid cryptic abbreviations.
- **Render Optimization**: Prevent unnecessary re-renders using `useCallback` for callbacks passed to child components and `useMemo` for heavy computations (such as ledger balance aggregations or filter calculations).
- **Component Sizing**: Keep component files focused and maintainable. When a component exceeds ~300 lines or takes on multiple responsibilities, decompose it into subcomponents or extract custom hooks.

### 2. Code Reusability & DRY (Don't Repeat Yourself)
- **Shared UI Primitives**: Always reuse standardized components from `src/components/ui/` (`Button`, `FormFieldShell`, modal dialogs, badges, cards) rather than recreating bespoke styling or HTML elements.
- **Centralized API Client**: Use `apiClient` (`src/services/apiClient.ts`) for all HTTP interactions to guarantee automatic JWT token injection, refresh token rotation, and tenant header propagation. Never call `fetch()` or `axios` directly in feature components.
- **Centralized Routes**: Always reference navigation paths through `APP_ROUTES` (`src/config/routes.ts`). Never hardcode route strings across components.
- **Reusable Utilities**: Common logic (currency formatting, date formatting, GST calculations, table sorting/pagination) must reside in reusable utility functions or hooks rather than being copied across pages.

### 3. Always Add & Update Error-Free Code
- **Strict TypeScript (Zero Errors)**: Every change must compile cleanly with `npx tsc --noEmit` with **0 errors**. No `any`, no unverified type assertions, and strictly no `@ts-ignore` or `@ts-expect-error`.
- **Production Build Guarantee**: Every change must successfully pass `npm run build` without bundling or Rollup syntax errors.
- **Safe Nullability & Defensive Coding**: Always guard against `null` or `undefined` values using optional chaining (`?.`), nullish coalescing (`??`), and default fallbacks. Never invoke methods like `.trim()`, `.toLowerCase()`, or `.map()` on potentially nullish values.
- **Robust Error Handling**: Wrap all asynchronous operations in `try / catch` blocks, display user-friendly toast messages using `useNotifications()`, and gracefully handle error states in the UI.

### 4. Industry-Standard Modern Architecture
- **Functional Components & Hooks**: Use standard functional React components with modern hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, custom hooks). Never introduce legacy class components.
- **Single-Direction Data Flow**: Enforce immutable state updates (`setItems(prev => [...prev, newItem])`). Never mutate existing state arrays or objects directly.
- **Accessible UI & Semantic HTML**: Provide accessible form controls with `aria-label`, `aria-invalid`, `role="alert"`, and visible focus rings for keyboard navigation.
- **Tailwind CSS Consistency**: Use Tailwind utility classes following the existing project design tokens (colors, borders, dark mode variants `dark:bg-slate-900`, `dark:border-slate-800`).

### 5. Consistent Patterns Throughout the Application

#### 5.1 Consistent Form Validation Standards
All forms, dialogs, and user inputs across every module must follow a uniform validation architecture:
- **Consistent Approach**: Use either standard React Hook Form + Zod schemas (for complex/dynamic forms) or uniform controlled state validation with a dedicated `fieldErrors: Record<string, string>` map. Do not invent ad-hoc validation mechanisms.
- **Required Field Indicators**: Every mandatory field must visually indicate requirement with a standard red asterisk: `<span className="text-rose-500">*</span>`.
- **Inline Field-Level Error Display**:
  - Validation messages must be rendered immediately below the invalid control using `<p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">`.
  - The invalid input element must visually reflect the error state with a red border and subtle tint: `${fieldErrors[key] ? "border-rose-500 bg-rose-50/20" : ""}` and accessibility tag `aria-invalid={Boolean(fieldErrors[key])}`.
- **Auto-Clearing Errors**: When the user edits or focuses an invalid field, immediately clear that field's error (`clearFieldError(key)`) so the UI reacts responsively without waiting for re-submission.
- **Backend Error Mapping**: When the backend returns validation or conflict errors (HTTP 400/409), parse the response and map errors directly back to the respective field inputs, accompanied by a toast notification.
- **Submission Guard**: Submit buttons must be disabled and display a loading indicator (`isLoading={busy}`) while validation or asynchronous submission is underway to prevent duplicate requests.

#### 5.2 Consistent Confirmation Dialogs for Critical & Destructive Actions
Accidental data deletion, invoice/voucher cancellation, or period closing can lead to permanent financial and compliance discrepancies. Therefore:
- **Mandatory Confirmation**: Every destructive, irreversible, or high-impact operation **MUST ALWAYS** require an explicit confirmation prompt before executing. This includes:
  - Deleting records (products, categories, accounts, templates, customers, vendors).
  - Cancelling invoices, vouchers, E-Way bills, or E-Invoices.
  - Finalizing bank reconciliations.
  - Closing accounting periods.
  - Applying bulk adjustments or clearing opening balances.
- **Never Use Browser Natives**: Strictly **NEVER** use browser `window.confirm()` or `window.alert()`. They break application styling, lack accessibility, and degrade user trust.
- **Unified Confirmation Modal Pattern**:
  - Use the shared Promise-based `confirm()` from `useNotifications()` (`src/context/NotificationContext.tsx`) or a standardized dialog overlay with:
    - **Backdrop**: `fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm`.
    - **Container**: `rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800`.
    - **Distinctive Header**: Icon indicating severity (e.g. `AlertTriangle`, `Ban`, `Trash2`) + clear action title (e.g., "Cancel RCM Voucher", "Finalize Bank Statement").
    - **Explicit Impact Description**: Clearly state what will happen, what data is affected, and whether the change is irreversible.
    - **Audit Reason Field**: For statutory cancellations (E-Way bills, E-Invoices, RCM Self-Invoices, Period re-opening), require a mandatory text reason before the confirm button is enabled.
    - **Standard Action Layout**: Safe action on the left (`variant="secondary"` Cancel), Destructive/Proceed action on the right (`variant="primary"` or danger red button).
    - **Keyboard Controls**: Pressing <kbd>Esc</kbd> or clicking the top-right <kbd>X</kbd> button must dismiss without taking action.

#### 5.3 Consistent Feedback, Notifications & Toasts
- **Centralized Notifications**: All user feedback must trigger through `useNotifications()` from `src/context/NotificationContext.tsx`. Never build custom one-off alert toasts.
- **Structured Toast Messages**:
  - `notifications.success(title, message)`: State clearly what was accomplished and any immediate next step.
  - `notifications.error(title, message)`: Explain the exact problem in plain language with a suggested resolution.
  - `notifications.warning(title, message)`: For non-blocking warnings (e.g., un-reconciled items remaining).
  - `notifications.info(title, message)`: For non-critical background updates.

#### 5.4 Consistent Visual Hierarchy & UI Elements
- **Button Variants**:
  - Primary Action: `variant="primary"` (styled with tenant branding token `var(--tenant-primary)`).
  - Secondary Action / Outline: `variant="secondary"` (styled with `border border-slate-300 dark:border-slate-700`).
  - Destructive Action: Red danger button (`bg-rose-600 hover:bg-rose-700 text-white`).
  - Keep a single primary action per card or form section to avoid competing calls to action.
- **Empty States**:
  - When tables or lists have 0 records, render a clean, centered message explaining why no records were found (e.g., "No matching transactions found") and provide a direct shortcut to clear filters or add a new record.
- **Loading Skeletons & Spinners**:
  - Use consistent spinner indicators (`<RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-500" />` or `LoaderCircle`) during asynchronous data retrieval.
- **Standardized Modals & Drawers**:
  - Maximum height `max-h-[92vh]` with `overflow-y-auto`.
  - Header containing title, subtitle, and an accessible close button (`X`).
  - Pinned footer with Cancel and Submit actions.

### 6. Domain-Specific Standards (Accounting, Inventory & Multi-Tenancy)
- **Indian Accounting & GST Formatting**:
  - Currency values must be formatted using Indian locale standards (`en-IN` e.g., `₹1,23,456.78`).
  - Balances must clearly indicate `Dr` (Debit) or `Cr` (Credit).
  - Vouchers must strictly validate and display live balance equality ($\sum \text{Debits} == \sum \text{Credits}$) before permitting submission.
- **Tally Prime Keyboard Accessibility**:
  - Maintain support for standard accounting shortcuts (e.g. `F4` for Contra, `F7` for Journal) while preserving system shortcuts (`Ctrl+F4`, `Alt+F4`).
- **Multi-Tenant Transparency**:
  - All multi-tenant state and session headers are managed globally by `AuthContext` and `apiClient`. Feature pages must never attempt to manipulate or hardcode tenant IDs directly.

