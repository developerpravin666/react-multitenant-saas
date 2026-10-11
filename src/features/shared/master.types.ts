export interface BaseMaster {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  createdBy?: string;
  createdAt?: Date;
  modifiedBy?: string;
  modifiedAt?: Date;
}
