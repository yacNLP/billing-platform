import { CreateInvoiceForm } from "@/features/invoices/components/create-invoice-form";
import { InvoicesList } from "@/features/invoices/components/invoices-list";

export default function InvoicesPage() {
  return (
    <>
      <CreateInvoiceForm />
      <InvoicesList />
    </>
  );
}
