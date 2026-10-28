"use server"

import { cookies } from "next/headers"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

/**
 * Server Action to persist the sidebar open/closed preference as an HttpOnly cookie.
 * Using a Server Action (instead of document.cookie) allows setting the HttpOnly flag,
 * which prevents client-side scripts from accessing the cookie and mitigates XSS risks.
 */
export async function setSidebarCookie(open: boolean): Promise<void> {
  const store = await cookies()
  store.set(SIDEBAR_COOKIE_NAME, String(open), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SIDEBAR_COOKIE_MAX_AGE,
  })
}