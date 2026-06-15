import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "sid";

export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(COOKIE_NAME)?.value);

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect everything except: login page, gallery (public), auth APIs,
    // wechat callback, gallery API, jobs API, pay APIs (notify must be public
    // for the epay server callback; create/status enforce auth in-route),
    // next internals, public files.
    "/((?!login|gallery|api/auth|api/wechat|api/gallery|api/jobs|api/pay|_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
