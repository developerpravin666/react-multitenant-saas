import { BaseMasterEntity } from "../../../../types/BaseMasterEntity";

export interface Vendor extends BaseMasterEntity {
  id: string;
  name: string;
  code: string;
  description: string;
  address: string;
  mobile: string;
  email: string;
}
