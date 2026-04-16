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
