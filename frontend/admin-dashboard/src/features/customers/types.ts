export type Customer = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

export type CustomersQueryParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "name" | "email" | "createdAt";
  order?: "asc" | "desc";
};

export type CustomersListResponse = {
  data: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
