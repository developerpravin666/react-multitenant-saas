import { BaseMaster } from "../../../shared/master.types";

export interface ProductModel extends BaseMaster {
  brandId: string;
  brandName: string;
  productTypeId: string;
  productTypeName: string;
}
