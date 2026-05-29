export type OnboardingStepKey =
  | "settings"
  | "customers"
  | "products"
  | "plans"
  | "subscriptions"
  | "invoices";

export type OnboardingStep = {
  key: OnboardingStepKey;
  label: string;
  completed: boolean;
  href: string;
};

export type OnboardingStatus = {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
};
