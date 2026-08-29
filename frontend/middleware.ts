import { NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE = "wayon_session_id"
const PUBLIC_PATHS = new Set(["/", "/login", "/recuperar-senha"])

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.has(pathname) || pathname.startsWith("/_next/") || pathname.startsWith("/api/auth/") || pathname === "/favicon.ico"
  if (isPublic) return NextResponse.next()

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value)
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!.*\\.[^/]+$).*)"],
}
