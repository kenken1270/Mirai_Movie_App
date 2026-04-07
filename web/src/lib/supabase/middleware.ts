import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options as CookieOptions);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith("/auth");
  const isProtectedPath =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/weekly") ||
    request.nextUrl.pathname.startsWith("/ideas") ||
    request.nextUrl.pathname.startsWith("/brand") ||
    request.nextUrl.pathname.startsWith("/needs-research") ||
    request.nextUrl.pathname.startsWith("/hypotheses") ||
    request.nextUrl.pathname.startsWith("/pipeline") ||
    request.nextUrl.pathname.startsWith("/scripts") ||
    request.nextUrl.pathname.startsWith("/script-library") ||
    request.nextUrl.pathname.startsWith("/publishes") ||
    request.nextUrl.pathname.startsWith("/analytics") ||
    request.nextUrl.pathname.startsWith("/retrospectives") ||
    request.nextUrl.pathname.startsWith("/next-actions");

  if (!user && isProtectedPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
