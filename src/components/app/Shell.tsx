import type { Account } from "@/lib/auth";

/**
 * Chrome shared by the signed-in areas.
 *
 * Deliberately quiet: a customer sees one page here, and the job of this UI is
 * to get them into the builder, not to be an application in its own right.
 */
export function Shell({
  account,
  title,
  subtitle,
  actions,
  children,
}: {
  account: Account;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const staff = account.role === "staff" || account.role === "admin";

  return (
    <div className="min-h-dvh bg-[#fbfaf8] text-[#14161a]">
      <header className="border-b border-[#ece9e3] bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3.5">
          <a href="/" className="text-[1.0625rem] font-bold tracking-tight">Golodex</a>

          <nav className="flex items-center gap-1">
            <NavLink href="/dashboard">My page</NavLink>
            {staff ? <NavLink href="/admin">Accounts</NavLink> : null}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-[0.8125rem] text-[#8a9099] sm:inline">
              {account.email}
            </span>
            {staff ? (
              <span className="rounded-full bg-[#14161a] px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-white">
                {account.role}
              </span>
            ) : null}
            {/* POST, so no page can sign a user out with a stray GET. */}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-[0.8125rem] font-medium text-[#5a6069] hover:text-[#14161a]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[1.75rem] font-bold tracking-[-0.02em]">{title}</h1>
            {subtitle ? (
              <p className="mt-1.5 text-[0.9375rem] text-[#5a6069]">{subtitle}</p>
            ) : null}
          </div>
          {actions}
        </div>

        <div className="mt-7">{children}</div>
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-full px-3 py-1.5 text-[0.875rem] font-medium text-[#5a6069] transition-colors hover:bg-[#f4f2ee] hover:text-[#14161a]"
    >
      {children}
    </a>
  );
}
