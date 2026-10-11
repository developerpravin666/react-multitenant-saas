import type { GridServerSource } from "../../../types/grid";
import { employeeGridColumns } from "../config/employeeGridColumns";
import { employees, type EmployeeRow } from "../data/employees";
import { processClientRows } from "../lib/gridUtils";

export const mockEmployeeServer: GridServerSource<EmployeeRow> = {
  async load(query, signal) {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(resolve, 450);
      signal?.addEventListener(
        "abort",
        () => {
          window.clearTimeout(timeout);
          reject(new DOMException("Request aborted", "AbortError"));
        },
        { once: true },
      );
    });
    return processClientRows(employees, employeeGridColumns, query);
  },
};
