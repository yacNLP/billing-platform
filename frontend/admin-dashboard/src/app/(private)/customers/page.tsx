import { CreateCustomerForm } from "@/features/customers/components/create-customer-form";
import { CustomersList } from "@/features/customers/components/customers-list";

export default function CustomersPage() {
  return (
    <>
      <CreateCustomerForm />
      <CustomersList />
    </>
  );
}
