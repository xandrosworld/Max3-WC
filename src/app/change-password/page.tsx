import { ChangePasswordForm } from "@/components/change-password-form";
import { requireUser } from "@/lib/session";

export default async function ChangePasswordPage() {
  const user = await requireUser();
  const accountLabel = user.displayUsername ?? user.username ?? user.email;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <ChangePasswordForm accountLabel={accountLabel} />
    </main>
  );
}
