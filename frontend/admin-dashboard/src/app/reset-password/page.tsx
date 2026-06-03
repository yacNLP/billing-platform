import { PublicOnlyRoute } from "@/features/auth/components/public-only-route";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <PublicOnlyRoute>
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <ResetPasswordForm />
      </main>
    </PublicOnlyRoute>
  );
}
