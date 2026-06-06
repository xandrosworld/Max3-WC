"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="rounded-lg border border-white/25 px-3 py-1.5 text-sm text-white hover:bg-white/10"
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      Đăng xuất
    </button>
  );
}
