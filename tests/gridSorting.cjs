const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function load(relativePath, requireModule = require) {
  const source = fs.readFileSync(path.join(__dirname, "../src", relativePath), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "require", "module", code)(module.exports, requireModule, module);
  return module.exports;
}

const { getColumnValue, applyClientSorting, processClientRows } = load("features/dynamic-grid/lib/gridUtils.ts");
const rows = [
  { id: "1", name: "Zulu", amount: 2, active: false },
  { id: "2", name: "Alpha", amount: 100, active: true },
  { id: "3", name: "Mike", amount: 10, active: false },
];
const columns = [
  { id: "displayName", accessorKey: "name", accessor: "id" },
  { id: "amount", accessor: "amount" },
  { id: "active", accessorKey: "active" },
];
assert.equal(getColumnValue(rows[0], columns[0]), "Zulu");
assert.deepEqual(applyClientSorting(rows, columns, [{ field: "displayName", direction: "asc" }]).map(row => row.id), ["2", "3", "1"]);
assert.deepEqual(applyClientSorting(rows, columns, [{ field: "amount", direction: "desc" }]).map(row => row.id), ["2", "3", "1"]);
assert.deepEqual(applyClientSorting(rows, columns, [{ field: "active", direction: "asc" }, { field: "amount", direction: "desc" }]).map(row => row.id), ["3", "1", "2"]);
const query = { pageIndex: 1, pageSize: 1, search: "", filters: [], sort: [{ field: "displayName", direction: "asc" }] };
assert.deepEqual(processClientRows(rows, columns, query), { rows: [rows[2]], totalCount: 3 });
assert.deepEqual(rows.map(row => row.id), ["1", "2", "3"], "sorting does not mutate input rows");
const nullRows = [{ name: null, amount: 10 }, { name: null, amount: 2 }];
assert.deepEqual(applyClientSorting(nullRows, [{ id: "name", accessor: "name" }, columns[1]], [
  { field: "name", direction: "asc" }, { field: "amount", direction: "asc" },
]).map(row => row.amount), [2, 10], "equal null values allow secondary sorting");

let request;
const { createResourceApi } = load("features/shared/resourceApi.ts", () => ({
  apiClient: { get: async (url, options) => { request = { url, options }; return { items: [], totalCount: 0 }; } },
}));
(async () => {
  const signal = new AbortController().signal;
  await createResourceApi("/products").serverSource.load({ ...query, sort: [
    { field: "brandName", direction: "asc" }, { field: "purchasePrice", direction: "desc" },
  ] }, signal);
  const params = new URL(request.url, "https://example.test").searchParams;
  assert.equal(params.get("sortBy"), "brandName,purchasePrice");
  assert.equal(params.get("sortDirection"), "asc,desc");
  assert.equal(params.get("page"), "2");
  assert.equal(request.options.signal, signal);
  console.log("PASS: accessor compatibility, numeric sorting, multi-sort, null ties, pagination and server query serialization.");
})();
