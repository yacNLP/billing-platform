import { CreateSubscriptionForm } from "@/features/subscriptions/components/create-subscription-form";
import { SubscriptionsList } from "@/features/subscriptions/components/subscriptions-list";

export default function SubscriptionsPage() {
  return (
    <>
      <CreateSubscriptionForm />
      <SubscriptionsList />
    </>
  );
}
