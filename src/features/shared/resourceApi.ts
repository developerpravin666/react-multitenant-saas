import { apiClient } from "../../services/apiClient";
import type { PagedData } from "../../services/apiClient";
import type { GridQuery, GridResult, GridServerSource } from "../../types/grid";

export interface ResourceRecord {
  id: string;
}

type PagedResponse<T> = Partial<PagedData<T>> & {
  rows?: T[];
  data?: T[];
  total?: number;
};

function toPageQuery(query: GridQuery) {
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

export function createResourceApi<T extends ResourceRecord>(endpoint: string) {
  let cachedList: T[] | undefined;
  let pendingList: Promise<T[]> | undefined;

  async function list(force = false) {
    if (!force && cachedList) return cachedList;
    if (!force && pendingList) return pendingList;

    const request = apiClient
      .get<T[]>(endpoint)
      .then((records) => {
        cachedList = records;
        return records;
      })
      .finally(() => {
        pendingList = undefined;
      });
    pendingList = request;
    return request;
  }

  const serverSource: GridServerSource<T> = {
    async load(query, signal): Promise<GridResult<T>> {
      const response = await apiClient.get<PagedResponse<T> | T[]>(
        `${endpoint}?${toPageQuery(query)}`,
        { signal },
      );
      if (Array.isArray(response))
        return { rows: response, totalCount: response.length, page: query.pageIndex + 1, pageSize: query.pageSize, totalPages: Math.ceil(response.length / query.pageSize) };
      const rows = response.items ?? response.rows ?? response.data ?? [];
      const totalCount = response.totalCount ?? response.total ?? rows.length;
      return {
        rows,
        totalCount,
        page: response.page ?? query.pageIndex + 1,
        pageSize: response.pageSize ?? query.pageSize,
        totalPages: response.totalPages ?? Math.ceil(totalCount / (response.pageSize ?? query.pageSize)),
      };
    },
  };

  return {
    list,
    serverSource,
    getById: (id: string) =>
      apiClient.get<T>(`${endpoint}/${encodeURIComponent(id)}`),
    create: async (values: Record<string, unknown>) => {
      const record = await apiClient.post<T>(endpoint, values);
      cachedList = undefined;
      return record;
    },
    update: async (id: string, values: Record<string, unknown>) => {
      const record = await apiClient.put<T>(
        `${endpoint}/${encodeURIComponent(id)}`,
        values,
      );
      cachedList = undefined;
      return record;
    },
    remove: async (id: string) => {
      await apiClient.delete<void>(`${endpoint}/${encodeURIComponent(id)}`);
      cachedList = undefined;
    },
  };
}
