import { BaseMaster } from "../../../shared/master.types";

export interface FinanceVendor extends BaseMaster {
  mobile: string;
  email: string;
  contactName: string;
  contactMobile: string;
}
