export type Product = {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
};

export type ProductsListResponse = {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ProductsQueryParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  isActive?: "true" | "false";
  sortBy?: "name" | "createdAt" | "updatedAt";
  order?: "asc" | "desc";
};
