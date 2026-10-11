import { Navigate, Route } from "react-router-dom";
import { BrandFormPage } from "../brand/pages/BrandFormPage";
import { BrandListPage } from "../brand/pages/BrandListPage";
import { ColorFormPage } from "../color/pages/ColorFormPage";
import { ColorListPage } from "../color/pages/ColorListPage";
import { ProductModelFormPage } from "../product-model/pages/ProductModelFormPage";
import { ProductModelListPage } from "../product-model/pages/ProductModelListPage";
import { ProductTypeFormPage } from "../product-type/pages/ProductTypeFormPage";
import { ProductTypeListPage } from "../product-type/pages/ProductTypeListPage";
import { VariantFormPage } from "../variant/pages/VariantFormPage";
import { VariantListPage } from "../variant/pages/VariantListPage";
import { VendorFormPage } from "../vendor/pages/VendorFormPage";
import { VendorListPage } from "../vendor/pages/VendorListPage";
import { MasterImportPage } from "../import/MasterImportPage";

export const productRoutes = <>
  <Route path="/products/vendors">
    <Route index element={<Navigate to="list" replace />} />
    <Route path="list" element={<VendorListPage />} />
    <Route path="add" element={<VendorFormPage mode="create" />} />
    <Route path=":id/edit" element={<VendorFormPage mode="edit" />} />
  </Route>
  <Route path="/products/brands">
    <Route index element={<Navigate to="list" replace />} />
    <Route path="list" element={<BrandListPage />} />
    <Route path="add" element={<BrandFormPage mode="create" />} />
    <Route path=":id/edit" element={<BrandFormPage mode="edit" />} />
  </Route>
  <Route path="/products/types">
    <Route index element={<Navigate to="list" replace />} />
    <Route path="list" element={<ProductTypeListPage />} />
    <Route path="add" element={<ProductTypeFormPage mode="create" />} />
    <Route path=":id/edit" element={<ProductTypeFormPage mode="edit" />} />
  </Route>
  <Route path="/products/models">
    <Route index element={<Navigate to="list" replace />} />
    <Route path="list" element={<ProductModelListPage />} />
    <Route path="add" element={<ProductModelFormPage mode="create" />} />
    <Route path=":id/edit" element={<ProductModelFormPage mode="edit" />} />
  </Route>
  <Route path="/products/variants">
    <Route index element={<Navigate to="list" replace />} />
    <Route path="list" element={<VariantListPage />} />
    <Route path="add" element={<VariantFormPage mode="create" />} />
    <Route path=":id/edit" element={<VariantFormPage mode="edit" />} />
  </Route>
  <Route path="/products/colors">
    <Route index element={<Navigate to="list" replace />} />
    <Route path="list" element={<ColorListPage />} />
    <Route path="add" element={<ColorFormPage mode="create" />} />
    <Route path=":id/edit" element={<ColorFormPage mode="edit" />} />
  </Route>
  <Route path="/products/import-masters" element={<MasterImportPage />} />
</>;
