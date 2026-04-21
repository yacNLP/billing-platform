import { CreatePaymentForm } from "@/features/payments/components/create-payment-form";
import { PaymentsList } from "@/features/payments/components/payments-list";

export default function PaymentsPage() {
  return (
    <>
      <CreatePaymentForm />
      <PaymentsList />
    </>
  );
}
