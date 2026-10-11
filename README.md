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
