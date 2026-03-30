import { LoginForm } from "@/features/auth/components/login-form";
import { PublicOnlyRoute } from "@/features/auth/components/public-only-route";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <PublicOnlyRoute>
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <LoginForm nextPath={resolvedSearchParams?.next} />
      </main>
    </PublicOnlyRoute>
  );
}
