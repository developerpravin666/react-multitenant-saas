// import { BaseMasterEntity } from "../../../../types/BaseMasterEntity";
import { BaseMaster } from "../../../shared/master.types";

// Mobile
// TV
// Laptop
// Refrigerator
// Washing Machine

export interface ProductType extends BaseMaster {
  defaultTaxId?: string | null;
  hsnSac?: string | null;
}
