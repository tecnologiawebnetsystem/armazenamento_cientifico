"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { recordAuditEvent } from "@/lib/api-client"

export function ActivityTracker() {
  const pathname = usePathname()

  useEffect(() => {
    void recordAuditEvent({ action: "visualizar_pagina", entity: "pagina", details: { rota: pathname } }).catch(() => undefined)
  }, [pathname])

  useEffect(() => {
    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null
      if (!form) return
      void recordAuditEvent({
        action: "enviar_formulario",
        entity: "formulario",
        entity_id: form.id || form.getAttribute("name") || undefined,
        details: {
          evento: "submit",
          campos: Array.from(form.elements)
            .filter((field): field is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
              field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement,
            )
            .map((field) => ({ nome: field.name || field.id, tipo: field.type, preenchido: Boolean(field.value) }))
            .filter((field) => field.nome),
        },
      }).catch(() => undefined)
    }

    const handleDownloadClick = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a") as HTMLAnchorElement | null : null
      if (!anchor?.download && !anchor?.href) return
      const href = anchor.href
      if (anchor.download || /\.(pdf|csv|xlsx?|txt)(?:[?#]|$)/i.test(href)) {
        void recordAuditEvent({
          action: "download",
          entity: "arquivo",
          entity_id: anchor.download || href,
          details: { nome: anchor.download || undefined, url: href, rota_origem: window.location.pathname },
        }).catch(() => undefined)
      }
    }

    const handleError = (event: ErrorEvent) => {
      void recordAuditEvent({
        action: "erro_frontend",
        entity: "aplicacao",
        result: "erro",
        details: { mensagem: event.message, arquivo: event.filename, linha: event.lineno, coluna: event.colno, rota: window.location.pathname },
      }).catch(() => undefined)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      void recordAuditEvent({
        action: "erro_frontend",
        entity: "aplicacao",
        result: "erro",
        details: { mensagem: String(event.reason), rota: window.location.pathname, tipo: "unhandled_rejection" },
      }).catch(() => undefined)
    }

    document.addEventListener("click", handleDownloadClick, true)
    document.addEventListener("submit", handleSubmit, true)
    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    return () => {
      document.removeEventListener("click", handleDownloadClick, true)
      document.removeEventListener("submit", handleSubmit, true)
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])

  return null
}
