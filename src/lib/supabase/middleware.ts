import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/auth"];
const PUBLIC_PATH_PATTERNS = [/^\/orcamentos\/[^/]+\/pdf$/];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicPath =
    PUBLIC_PATHS.some((p) => path.startsWith(p)) || PUBLIC_PATH_PATTERNS.some((re) => re.test(path));
  const isOnboardingPath = path.startsWith("/onboarding");

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/orcamentos";
    return NextResponse.redirect(url);
  }

  if (user && !isPublicPath) {
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!company && !isOnboardingPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    if (company && isOnboardingPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/orcamentos";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
