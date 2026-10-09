export function routeMatches(pathname: string, route: string): boolean {
  const normalizedPath = pathname.replace(/\/$/, "") || "/"
  const normalizedRoute = route.replace(/\/$/, "") || "/"
  return normalizedPath === normalizedRoute || normalizedPath.startsWith(`${normalizedRoute}/`)
}
