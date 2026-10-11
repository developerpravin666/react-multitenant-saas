import type { FormFieldConfig } from "../../../../types/form";

interface ProductModelFormOptions {
  brands: {
    id: string;
    name: string;
  }[];
  productTypes: {
    id: string;
    name: string;
  }[];
}

export function createProductModelFormConfig({
  brands,
  productTypes,
}: ProductModelFormOptions): FormFieldConfig[] {
  return [
    {
      id: "brandId",
      name: "brandId",
      label: "Brand",
      type: "select",
      required: true,
      options: brands.map((type) => ({
        label: type.name,
        value: type.id,
      })),
    },
    {
      id: "productTypeId",
      name: "productTypeId",
      label: "Product Type",
      type: "select",
      required: true,
      options: productTypes.map((type) => ({
        label: type.name,
        value: type.id,
      })),
    },
    {
      id: "name",
      name: "name",
      label: "Model Name",
      type: "text",
      required: true,
      placeholder: "Galaxy S25 FE",
    },
    {
      id: "code",
      name: "code",
      label: "Model Code",
      type: "text",
      required: true,
      placeholder: "S25-FE",
    },
    {
      id: "description",
      name: "description",
      label: "Description",
      type: "textarea",
    },
    {
      id: "isActive",
      name: "isActive",
      label: "Active",
      type: "toggle",
      defaultValue: true,
    },
  ];
}
