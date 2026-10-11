import { productModelColumns } from "../config/productModel.columns";
import { createProductModelFormConfig } from "../config/product-model.form";
import type { ProductModel } from "../types/productModel.types";
import { createResourceApi, type ResourceRecord } from "../../../shared/resourceApi";

type LookupRecord = ResourceRecord & { name: string };
const typesApi = createResourceApi<LookupRecord>("/product-types/all");
const brandsApi = createResourceApi<LookupRecord>("/brands/all");

export const productModelResource = {
  title: "Product Models", description: "Manage product models.", singular: "Product Model",
  auditTableName: "product_models",
  listPath: "/products/models/list",
  addPath: "/products/models/add",
  editPath: (id: string) => `/products/models/${id}/edit`,
  columns: productModelColumns,
  loadFields: async () => {
    const [brands, productTypes] = await Promise.all([brandsApi.list(), typesApi.list()]);
    return createProductModelFormConfig({ brands, productTypes });
  },
  //fields: createProductModelFormConfig,
  api: createResourceApi<ProductModel>("/product-models"),
};
