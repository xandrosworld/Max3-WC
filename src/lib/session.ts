import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

const getCurrentUserForRequest = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return {
    ...session.user,
    image: session.user.image ?? null,
    department: session.user.department ?? "",
    mustChangePassword: session.user.mustChangePassword ?? false,
    autoFollowUserId: session.user.autoFollowUserId ?? null,
    banned: session.user.banned ?? false,
    role: session.user.role ?? "user",
  };
});

export async function getCurrentUser() {
  return getCurrentUserForRequest();
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user || user.banned) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/matches");
  return user;
}
