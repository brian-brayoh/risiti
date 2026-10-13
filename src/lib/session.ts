import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "./db";

export const ACTIVE_BIZ_COOKIE = "risiti_biz";

export async function requireUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  const user = await db.user.findUnique({ where: { id } });
  if (!user) redirect("/login");
  return user;
}

/** Current user + the business they're working in. Accountants switch between client businesses. */
export async function requireBusiness() {
  const user = await requireUser();
  const memberships = await db.membership.findMany({
    where: { userId: user.id },
    include: { business: true },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 0) redirect("/businesses/new");

  const wanted = (await cookies()).get(ACTIVE_BIZ_COOKIE)?.value;
  const active = memberships.find((m) => m.businessId === wanted) ?? memberships[0];
  return { user, memberships, membership: active, business: active.business };
}

export function canManage(role: string) {
  return role === "OWNER" || role === "ACCOUNTANT";
}
