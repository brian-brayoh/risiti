import { cookies } from "next/headers";
import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { BusinessSwitcher } from "@/components/business-switcher";
import { Logo } from "@/components/logo";
import { NavLink } from "@/components/nav-link";
import { db } from "@/lib/db";
import { ACTIVE_BIZ_COOKIE, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const memberships = await db.membership.findMany({
    where: { userId: user.id },
    include: { business: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const wanted = (await cookies()).get(ACTIVE_BIZ_COOKIE)?.value;
  const active = memberships.find((m) => m.businessId === wanted) ?? memberships[0];

  return (
    <div className="min-h-screen lg:flex">
      <aside className="no-print border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col gap-6 p-5">
          <Logo href="/dashboard" />
          {active && (
            <BusinessSwitcher
              activeId={active.businessId}
              businesses={memberships.map((m) => ({ id: m.businessId, name: m.business.name, role: m.role }))}
            />
          )}
          {active && (
            <nav className="flex gap-1 overflow-x-auto lg:flex-col">
              <NavLink href="/dashboard">Overview</NavLink>
              <NavLink href="/payments">Payments</NavLink>
              <NavLink href="/invoices">Invoices</NavLink>
              <NavLink href="/customers">Customers</NavLink>
              <NavLink href="/settings">Settings</NavLink>
            </nav>
          )}
          <div className="mt-auto space-y-3 text-sm">
            <Link href="/businesses/new" className="block text-brand-700 hover:underline">+ Add a business</Link>
            <div className="border-t border-slate-100 pt-3">
              <div className="font-medium">{user.name}</div>
              <div className="truncate text-xs text-slate-500">{user.email}</div>
              <form action={logoutAction}>
                <button className="mt-2 text-xs text-slate-500 hover:text-slate-900">Log out</button>
              </form>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 px-4 py-8 sm:px-8 lg:ml-64">{children}</main>
    </div>
  );
}
