import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { PublicOnlyRoute } from "@/features/auth/components/public-only-route";

export default function ForgotPasswordPage() {
  return (
    <PublicOnlyRoute>
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <ForgotPasswordForm />
      </main>
    </PublicOnlyRoute>
  );
}
