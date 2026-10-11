import { useNavigate } from "react-router-dom";
import { ResourceListPage } from "../../../shared/ResourceCrudPages";
import { productResource } from "./productResource";

export function ProductListPage() {
  const navigate = useNavigate();
  return (
    <ResourceListPage
      {...productResource}
      hideEdit={(product) => product.isSold}
      hideDelete={(product) => product.isSold}
      bulkAction={{
        label: "Bulk Update",
        maximumRecords: 500,
        onClick: (products) => navigate(productResource.bulkUpdatePath, { state: { products } }),
      }}
    />
  );
}
