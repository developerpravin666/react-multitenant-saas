# Dynamic Grid

A reusable, framework-local TypeScript data grid supporting client-side and server-side data operations with the same UI contract.

## Included capabilities

- Client and server paging
- Client and server multi-column sorting (Shift+click)
- Debounced global search
- Column-level filters
- Column visibility
- Density controls
- Page-size selection
- Current-page row selection
- CSV export
- Refresh in server mode
- Loading skeleton, empty state, error state
- Sticky header and horizontal overflow
- Custom cell rendering and action columns
- ARIA table/selection/sort semantics
- Tenant-theme CSS tokens and dark mode
- Request cancellation and stale-response protection in server mode

## Server contract

Implement `GridServerSource<TData>` and return `{ rows, totalCount }` from `load(query)`.
The query contains page index, page size, global search, multi-sort state, and column filters.

Do all sorting/filtering against the same server-side dataset as pagination. Do not page on the server and then sort/filter only the returned page in the browser.

## Real API adapter

Use `createHttpGridSource<T>()` when the backend exposes a GET endpoint. The default mapper sends one-based `page`, `pageSize`, `search`, `sortBy`, `sortDirection`, and filter entries. It sends the primary sort because the API contract uses singular sort parameters. Use `mapQuery` when your backend contract differs and `mapResponse` to map your API envelope into `{ rows, totalCount }`.

Example:

```ts
const source = createHttpGridSource<EmployeeRow>({
  endpoint: "/api/employees",
  mapResponse: payload => {
    const dto = payload as { items: EmployeeRow[]; total: number };
    return { rows: dto.items, totalCount: dto.total };
  },
});
```
