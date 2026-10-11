import type {
  GridQuery,
  GridResult,
  GridServerSource,
} from "../../../types/grid";

export interface HttpGridSourceOptions<TData> {
  endpoint: string;
  headers?: HeadersInit | (() => HeadersInit);
  mapQuery?: (query: GridQuery) => URLSearchParams;
  mapResponse?: (payload: unknown) => GridResult<TData>;
}

function defaultQueryMapper(query: GridQuery): URLSearchParams {
  const params = new URLSearchParams({
    page: String(query.pageIndex + 1),
    pageSize: String(query.pageSize),
    search: query.search,
  });

  const sort = query.sort[0];
  if (sort) {
    params.set("sortBy", query.sort.map((item) => item.field).join(","));
    params.set("sortDirection", query.sort.map((item) => item.direction).join(","));
  }

  query.filters.forEach((filter, index) => {
    params.set(`filters[${index}].field`, filter.field);
    params.set(`filters[${index}].operator`, filter.operator ?? "contains");
    params.set(`filters[${index}].value`, filter.value);
  });

  return params;
}

export function createHttpGridSource<TData>(
  options: HttpGridSourceOptions<TData>,
): GridServerSource<TData> {
  return {
    async load(query, signal) {
      const params = (options.mapQuery ?? defaultQueryMapper)(query);
      const response = await fetch(`${options.endpoint}?${params.toString()}`, {
        method: "GET",
        headers:
          typeof options.headers === "function"
            ? options.headers()
            : options.headers,
        signal,
      });

      if (!response.ok) {
        throw new Error(
          `Grid API request failed with HTTP ${response.status}.`,
        );
      }

      const payload: unknown = await response.json();
      if (!options.mapResponse) {
        throw new Error(
          "HTTP grid source requires mapResponse so the API DTO can be converted to GridResult<TData>.",
        );
      }

      return options.mapResponse(payload);
    },
  };
}
