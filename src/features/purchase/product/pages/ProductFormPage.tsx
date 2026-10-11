import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../../../components/ui/Button";
import { DynamicForm } from "../../../dynamic-form/DynamicForm";
import { ResourceFormPage } from "../../../shared/ResourceCrudPages";
import { productResource } from "./productResource";
import type { Product } from "../types/product.types";
import { APP_ROUTES } from "../../../../config/routes";

interface SerialPair {
  serialNumber: string;
  serialNumber1: string;
}

function BulkProductCreateForm() {
  const navigate = useNavigate();
  const [fields, setFields] = useState<Awaited<ReturnType<typeof productResource.loadFields>> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serialPairs, setSerialPairs] = useState<SerialPair[]>([{ serialNumber: "", serialNumber1: "" }]);

  useEffect(() => {
    let active = true;
    void productResource.loadFields().then((loadedFields) => {
      if (active) setFields(loadedFields.filter((field) => !["serialNumber", "serialNumber1"].includes(field.name)));
    }).catch((reason: unknown) => {
      if (active) setLoadError(reason instanceof Error ? reason.message : "Unable to load product form data.");
    });
    return () => { active = false; };
  }, []);

  if (loadError) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>;
  if (!fields) return <p className="text-sm text-slate-500">Loading form…</p>;

  const updateSerial = (index: number, key: keyof SerialPair, value: string) => {
    setSerialPairs((current) => current.map((pair, pairIndex) => pairIndex === index ? { ...pair, [key]: value } : pair));
  };
  const resizeSerialPairs = (count: number) => {
    setSerialPairs((current) => Array.from({ length: count }, (_, index) => current[index] ?? { serialNumber: "", serialNumber1: "" }));
  };
  return (
    <DynamicForm
      title="Add Products"
      description="Enter shared purchase details once, then add both serial numbers for every unit."
      fields={fields}
      columnsPerRow={3}
      submitLabel={`Save ${serialPairs.length} ${serialPairs.length === 1 ? "unit" : "units"}`}
      onCancel={() => navigate(productResource.listPath)}
      onSubmit={async (values) => {
        if (serialPairs.length < 1 || serialPairs.length > 500)
          throw new Error("Add between 1 and 500 product units.");
        if (serialPairs.some((pair) => !pair.serialNumber.trim() || !pair.serialNumber1.trim()))
          throw new Error("Enter both serial numbers for every unit.");
        const created = await productResource.api.create({ ...values, serialPairs });
        navigate(`${APP_ROUTES.purchase.accountingPayment}?vendorId=${encodeURIComponent(created.vendorId)}&billNumber=${encodeURIComponent(created.billNumber ?? "")}`);
      }}
    >
      <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700" aria-labelledby="unit-serials-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="unit-serials-heading" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Unit serial numbers</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Both values are required and must be unique across all units.</p>
          </div>
          <span className="text-sm text-slate-500">{serialPairs.length} {serialPairs.length === 1 ? "unit" : "units"}</span>
        </div>
        {serialPairs.map((pair, index) => (
          <div key={index} className="grid grid-cols-1 items-end gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto] dark:bg-slate-800/50">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="mb-1 block">Unit {index + 1} · Serial Number <span className="text-red-600">*</span></span>
              <input required maxLength={100} value={pair.serialNumber} onChange={(event) => updateSerial(index, "serialNumber", event.target.value)} autoComplete="off" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="mb-1 block">Unit {index + 1} · Serial Number 1 <span className="text-red-600">*</span></span>
              <input required maxLength={100} value={pair.serialNumber1} onChange={(event) => updateSerial(index, "serialNumber1", event.target.value)} autoComplete="off" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </label>
            {serialPairs.length > 1 ? <Button type="button" variant="secondary" aria-label={`Remove unit ${index + 1}`} onClick={() => {
              const nextCount = serialPairs.length - 1;
              resizeSerialPairs(nextCount);
            }}>Remove</Button> : <span />}
          </div>
        ))}
        <Button type="button" variant="secondary" disabled={serialPairs.length >= 500} onClick={() => {
          const nextCount = serialPairs.length + 1;
          resizeSerialPairs(nextCount);
        }}>
          {serialPairs.length >= 500 ? "Maximum 500 units" : "+ Add another unit"}
        </Button>
      </section>
    </DynamicForm>
  );
}

function BulkProductUpdateForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedProducts = (location.state as { products?: Product[] } | null)?.products ?? [];
  const [fields, setFields] = useState<Awaited<ReturnType<typeof productResource.loadFields>> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serialPairs, setSerialPairs] = useState(() => selectedProducts.map((product) => ({
    serialNumber: product.serialNumber ?? "",
    serialNumber1: product.serialNumber1 ?? "",
  })));

  useEffect(() => {
    if (selectedProducts.length === 0) return;
    let active = true;
    void productResource.loadFields().then((loadedFields) => {
      if (active) setFields(loadedFields.filter((field) => ["purchasePrice", "discount", "cgst", "sgst", "tax", "totalAmount"].includes(field.name)));
    }).catch((reason: unknown) => {
      if (active) setLoadError(reason instanceof Error ? reason.message : "Unable to load product form data.");
    });
    return () => { active = false; };
  }, [selectedProducts.length]);

  if (selectedProducts.length === 0)
    return <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      <p>Select one or more products from the product list to bulk update their pricing.</p>
      <Button variant="secondary" onClick={() => navigate(productResource.listPath)}>Back to products</Button>
    </section>;
  if (loadError) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>;
  if (!fields) return <p className="text-sm text-slate-500">Loading form…</p>;

  const first = selectedProducts[0]!;
  const initialValues = {
    purchasePrice: first.purchasePrice,
    discount: first.discount ?? 0,
    cgst: first.cgst ?? 0,
    sgst: first.sgst ?? 0,
    tax: first.tax ?? Number(first.cgst ?? 0) + Number(first.sgst ?? 0),
  };

  return (
    <DynamicForm
      title="Bulk Update Products"
      description={`Update purchase pricing and tax for ${selectedProducts.length} selected products. Each product's serial numbers and sold status will be preserved.`}
      fields={fields}
      initialValues={initialValues}
      columnsPerRow={3}
      submitLabel={`Update ${selectedProducts.length} ${selectedProducts.length === 1 ? "product" : "products"}`}
      onCancel={() => navigate(productResource.listPath)}
      onSubmit={async (values) => {
        if (serialPairs.some((pair) => !pair.serialNumber.trim() || !pair.serialNumber1.trim()))
          throw new Error("Enter both serial numbers for every selected product.");
        const products = selectedProducts.map((product, index) => {
          const pair = serialPairs[index] ?? { serialNumber: "", serialNumber1: "" };
          return {
            id: product.id,
            vendorId: product.vendorId,
            brandId: product.brandId,
            productTypeId: product.productTypeId,
            productModelId: product.productModelId,
            variantId: product.variantId,
            colorId: product.colorId,
            billNumber: product.billNumber,
            serialNumber: pair.serialNumber.trim(),
            serialNumber1: pair.serialNumber1.trim(),
            purchasePrice: Number(values.purchasePrice),
            discount: Number(values.discount ?? 0),
            cgst: Number(values.cgst ?? 0),
            sgst: Number(values.sgst ?? 0),
            tax: Number(values.tax ?? Number(values.cgst ?? 0) + Number(values.sgst ?? 0)),
          };
        });
        await productResource.api.bulkUpdate(products);
        navigate(productResource.listPath);
      }}
    >
      <section className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Selected products ({selectedProducts.length})</h2>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {selectedProducts.map((product, index) => <div key={product.id} className="grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[minmax(8rem,0.7fr)_1fr_1fr] dark:bg-slate-800/50">
            <span className="self-center text-sm font-medium">{product.productModelName ?? `Product ${index + 1}`}</span>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Serial Number
              <input required maxLength={100} autoComplete="off" value={serialPairs[index]?.serialNumber ?? ""} onChange={(event) => setSerialPairs((current) => current.map((pair, pairIndex) => pairIndex === index ? { ...pair, serialNumber: event.target.value } : pair))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Serial Number 1
              <input required maxLength={100} autoComplete="off" value={serialPairs[index]?.serialNumber1 ?? ""} onChange={(event) => setSerialPairs((current) => current.map((pair, pairIndex) => pairIndex === index ? { ...pair, serialNumber1: event.target.value } : pair))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </label>
          </div>)}
        </div>
      </section>
    </DynamicForm>
  );
}


export function ProductFormPage({ mode }: { mode: "create" | "edit" | "bulk-update" }) {
  if (mode === "create") return <BulkProductCreateForm />;
  if (mode === "bulk-update") return <BulkProductUpdateForm />;
  return <ResourceFormPage {...productResource} mode={mode} />;
}
