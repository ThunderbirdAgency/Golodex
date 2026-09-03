import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccount } from "@/lib/auth";
import { safeNextPath } from "@/lib/redirect";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  // Already signed in — don't make them do it twice.
  const account = await getAccount();
  if (account) {
    redirect(next !== "/dashboard" ? next : account.role === "owner" ? "/dashboard" : "/admin");
  }

  return (
    <main className="flex min-h-dvh flex-col bg-[#fbfaf8] text-[#14161a]">
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <a href="/" className="text-[1.0625rem] font-bold tracking-tight">Golodex</a>
      </div>

      <div className="flex flex-1 items-start justify-center px-6 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm rounded-2xl border border-[#e3e0da] bg-white p-7 shadow-[0_10px_40px_-24px_rgba(16,24,40,0.2)]">
          {params.error ? (
            <p
              className="mb-5 rounded-lg bg-[#fdecec] px-3 py-2.5 text-[0.8125rem] leading-snug text-[#a1281f]"
              role="alert"
            >
              {errorMessage(params.error)}
            </p>
          ) : null}

          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}

/** Auth errors arrive as short codes; turn them into something actionable. */
function errorMessage(code: string): string {
  switch (code) {
    case "expired":
      return "That link has expired. Request a new one below.";
    case "used":
      return "That link was already used. Request a new one below.";
    case "no_account":
      return "That sign-in worked, but there's no Golodex account attached to it yet. Get in touch and we'll set one up.";
    case "suspended":
      return "This account is paused. Get in touch and we'll sort it out.";
    default:
      return "That sign-in link didn't work. Request a new one below.";
  }
}
