import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh plus a coarse gate on the private areas.
 *
 * The gate here is a redirect for signed-out visitors, not the authorization
 * check. Middleware runs on an edge runtime with no service-role access, so it
 * cannot see roles — every page and route handler under /admin re-checks
 * permissions server-side. Middleware exists to avoid flashing a login-less
 * screen, never as the security boundary.
 */

const PROTECTED = ["/edit", "/dashboard", "/admin"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  // With no Supabase configured there are no sessions to refresh and nothing
  // to protect — the app runs on built-in seed pages.
  if (!url || !key) return res;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of list) res.cookies.set(name, value, options);
      },
    },
  });

  // Touching getUser() is what refreshes an expiring token and rewrites the
  // cookies onto `res`. Do not remove it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const login = req.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    // Relative path only — never echo a caller-supplied absolute URL back into
    // a redirect, which is how open-redirect bugs get in.
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  return res;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimization.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
