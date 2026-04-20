export type Customer = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

export type CustomersListResponse = {
  data: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
