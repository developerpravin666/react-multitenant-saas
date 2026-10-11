export interface BaseMasterEntity {
  id: string;
  isActive: boolean;
  isDelete: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}
