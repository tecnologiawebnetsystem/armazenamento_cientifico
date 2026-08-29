import { NextRequest, NextResponse } from "next/server"

const PUBLIC_PATHS = new Set(["/", "/login", "/recuperar-senha"])

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.has(pathname) || pathname.startsWith("/_next/") || pathname.startsWith("/api/auth/") || pathname === "/favicon.ico"
  if (isPublic) return NextResponse.next()

  // O layout protegido valida a sessão real no FastAPI. O middleware não pode
  // confiar apenas na existência do cookie, pois ele pode estar expirado.
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!.*\\.[^/]+$).*)"],
}
