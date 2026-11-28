import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie on every page request.
 * Without this, server-rendered pages (/admin, /my-groups, /g/[id]…) see an expired access token
 * and show "Login required" even though the user is logged in.
 */
export async function middleware(request: NextRequest) {
  // Anonymous visitors have no Supabase cookie -> nothing to refresh, skip the network call.
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasSession) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  await supabase.auth.getUser(); // validates + refreshes the token, writing new cookies onto `response`
  return response;
}

export const config = {
  matcher: [
    // skip static files, images, the cron endpoint and metadata files
    "/((?!_next/static|_next/image|api/cron|go/|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
