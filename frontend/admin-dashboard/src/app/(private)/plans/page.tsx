import { CreatePlanForm } from "@/features/plans/components/create-plan-form";
import { PlansList } from "@/features/plans/components/plans-list";

export default function PlansPage() {
  return (
    <>
      <CreatePlanForm />
      <PlansList />
    </>
  );
}
