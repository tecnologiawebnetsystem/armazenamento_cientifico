import { reportFrontendEvent } from "@/lib/api-client"

let installed = false
const recent = new Map<string, number>()

function send(message: string, metadata: Record<string, unknown> = {}) {
  const key = `${message}:${JSON.stringify(metadata)}`
  const now = Date.now()
  if (recent.has(key) && now - (recent.get(key) ?? 0) < 5000) return
  recent.set(key, now)
  void reportFrontendEvent({ level: "error", message, endpoint: window.location.pathname, metadata })
}

export function installFrontendTelemetry() {
  if (installed || typeof window === "undefined") return
  installed = true
  window.addEventListener("error", (event) => {
    if (event.target !== window) {
      const target = event.target as HTMLElement
      send("Falha ao carregar recurso do frontend", { tag: target.tagName, source: (target as HTMLImageElement).src || (target as HTMLScriptElement).src || (target as HTMLLinkElement).href })
      return
    }
    send(event.message || "Erro JavaScript não tratado", { filename: event.filename, line: event.lineno, column: event.colno, stack: event.error?.stack })
  }, true)
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason instanceof Error ? { message: event.reason.message, stack: event.reason.stack } : { reason: String(event.reason) }
    send(error.message ?? "Promise rejeitada sem tratamento", error)
  })
}

export function FrontendTelemetry() {
  installFrontendTelemetry()
  return null
}
