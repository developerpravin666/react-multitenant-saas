import { withPageTitle } from "../../../components/layout/PageTitle";
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
    <Route path="list" element={withPageTitle("Vendors", <VendorListPage />)} />
    <Route path="add" element={withPageTitle("Add Vendor", <VendorFormPage mode="create" />)} />
    <Route path=":id/edit" element={withPageTitle("Edit Vendor", <VendorFormPage mode="edit" />)} />
  </Route>
  <Route path="/products/brands">
    <Route index element={<Navigate to="list" replace />} />
    <Route path="list" element={withPageTitle("Brands", <BrandListPage />)} />
    <Route path="add" element={withPageTitle("Add Brand", <BrandFormPage mode="create" />)} />
    <Route path=":id/edit" element={withPageTitle("Edit Brand", <BrandFormPage mode="edit" />)} />
  </Route>
  <Route path="/products/types">
    <Route index element={<Navigate to="list" replace />} />
    <Route path="list" element={withPageTitle("Product Types", <ProductTypeListPage />)} />
    <Route path="add" element={withPageTitle("Add Product Type", <ProductTypeFormPage mode="create" />)} />
    <Route path=":id/edit" element={withPageTitle("Edit Product Type", <ProductTypeFormPage mode="edit" />)} />
  </Route>
  <Route path="/products/models">
    <Route index element={<Navigate to="list" replace />} />
    <Route path="list" element={withPageTitle("Product Models", <ProductModelListPage />)} />
    <Route path="add" element={withPageTitle("Add Product Model", <ProductModelFormPage mode="create" />)} />
    <Route path=":id/edit" element={withPageTitle("Edit Product Model", <ProductModelFormPage mode="edit" />)} />
  </Route>
  <Route path="/products/variants">
    <Route index element={<Navigate to="list" replace />} />
    <Route path="list" element={withPageTitle("Variants", <VariantListPage />)} />
    <Route path="add" element={withPageTitle("Add Variant", <VariantFormPage mode="create" />)} />
    <Route path=":id/edit" element={withPageTitle("Edit Variant", <VariantFormPage mode="edit" />)} />
  </Route>
  <Route path="/products/colors">
    <Route index element={<Navigate to="list" replace />} />
    <Route path="list" element={withPageTitle("Colors", <ColorListPage />)} />
    <Route path="add" element={withPageTitle("Add Color", <ColorFormPage mode="create" />)} />
    <Route path=":id/edit" element={withPageTitle("Edit Color", <ColorFormPage mode="edit" />)} />
  </Route>
  <Route path="/products/import-masters" element={withPageTitle("Import Masters", <MasterImportPage />)} />
</>;
