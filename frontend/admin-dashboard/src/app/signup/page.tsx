import { PublicOnlyRoute } from "@/features/auth/components/public-only-route";
import { SignupForm } from "@/features/auth/components/signup-form";

export default function SignupPage() {
  return (
    <PublicOnlyRoute>
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <SignupForm />
      </main>
    </PublicOnlyRoute>
  );
}
