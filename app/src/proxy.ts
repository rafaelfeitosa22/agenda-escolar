// Borda da aplicação:
// 1. CSRF — requisições que alteram dados na API precisam vir da própria origem
//    (Origin/Sec-Fetch-Site), além do cookie de sessão SameSite=Lax.
// 2. Páginas privadas sem cookie de sessão vão para o login (a sessão em si é validada no servidor).
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "adt_session";
const PUBLIC_PAGES = ["/login", "/cadastro", "/recuperar-senha", "/redefinir-senha", "/offline"];
const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
    } catch {
      return false;
    }
  }
  const site = req.headers.get("sec-fetch-site");
  return site === "same-origin" || site === "none";
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (!SAFE.has(req.method) && !sameOrigin(req)) {
      return NextResponse.json({ error: "origem_invalida", message: "Requisição bloqueada." }, { status: 403 });
    }
    return NextResponse.next();
  }

  const hasSession = req.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|icons/|favicon|manifest.webmanifest|sw.js|robots.txt).*)"],
};
