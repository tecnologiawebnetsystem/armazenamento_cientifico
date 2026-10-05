"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { recordAuditEvent } from "@/lib/api-client"

function textOf(target: HTMLElement) {
  return (target.getAttribute("aria-label") || target.getAttribute("title") || target.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160)
}

export function ActivityTracker() {
  const pathname = usePathname()

  useEffect(() => {
    void recordAuditEvent({ action: "visualizar_pagina", entity: "pagina", entity_id: pathname, details: { rota: pathname } }).catch(() => undefined)
  }, [pathname])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a,button,[role='button'],input[type='submit']") : null
      if (!target) return
      const element = target as HTMLElement
      void recordAuditEvent({
        action: element.matches("a") ? "clicar_menu_ou_link" : "clicar_botao",
        entity: "interface",
        entity_id: element.getAttribute("href") || element.id || undefined,
        details: { rota: window.location.pathname, texto: textOf(element), tag: element.tagName.toLowerCase() },
      }).catch(() => undefined)
    }

    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [])

  return null
}
