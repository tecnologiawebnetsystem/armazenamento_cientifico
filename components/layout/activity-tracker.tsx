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

function targetDetails(target: HTMLElement) {
  const field = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
  const value = field && !/password|token|secret/i.test(target.getAttribute("name") || target.id)
    ? target.value.slice(0, 120)
    : undefined

  return {
    texto: textOf(target),
    tag: target.tagName.toLowerCase(),
    id: target.id || undefined,
    classes: typeof target.className === "string" ? target.className.slice(0, 200) || undefined : undefined,
    name: target.getAttribute("name") || undefined,
    role: target.getAttribute("role") || undefined,
    href: target.getAttribute("href") || undefined,
    value,
  }
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
        details: { ...targetDetails(element), evento: "click", botao_mouse: event.button, rota_origem: window.location.pathname },
      }).catch(() => undefined)
    }

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

    const handleChange = (event: Event) => {
      const target = event.target instanceof HTMLElement ? event.target : null
      if (!target || !(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return
      void recordAuditEvent({
        action: "alterar_campo",
        entity: "formulario",
        entity_id: target.name || target.id || undefined,
        details: { ...targetDetails(target), evento: "change", preenchido: Boolean(target.value) },
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

    document.addEventListener("click", handleClick, true)
    document.addEventListener("click", handleDownloadClick, true)
    document.addEventListener("submit", handleSubmit, true)
    document.addEventListener("change", handleChange, true)
    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    return () => {
      document.removeEventListener("click", handleClick, true)
      document.removeEventListener("click", handleDownloadClick, true)
      document.removeEventListener("submit", handleSubmit, true)
      document.removeEventListener("change", handleChange, true)
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])

  return null
}
