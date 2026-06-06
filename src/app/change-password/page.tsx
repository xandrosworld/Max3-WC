import { ChangePasswordForm } from "@/components/change-password-form";
import { requireUser } from "@/lib/session";

export default async function ChangePasswordPage() {
  await requireUser();
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <ChangePasswordForm />
    </main>
  );
}
