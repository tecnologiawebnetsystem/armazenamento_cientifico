"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  Database,
  Globe,
  Pause,
  Play,
  RefreshCw,
  Search,
  Server,
  Wifi,
  X,
} from "lucide-react"

import {
  getObservabilityEvents,
  type ObservabilityEvent,
  type ObservabilityStats,
} from "@/lib/api-client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const emptyStats: ObservabilityStats = {
  total: 0,
  errors: 0,
  frontend: 0,
  backend: 0,
  error_rate: 0,
  correlated_groups: 0,
  latency: { average: 0, p50: 0, p95: 0 },
}

const tone: Record<string, string> = {
  info: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400",
  critical: "text-red-300",
}

function normalize(e: ObservabilityEvent): ObservabilityEvent {
  const m = e.metadata ?? {}
  const value = (key: string) => {
    const item = m[key]
    return item === undefined || item === null || item === "" ? undefined : item
  }
  const numberValue = (direct: number | undefined, key: string) => {
    const item = value(key)
    return direct ?? (typeof item === "number" ? item : typeof item === "string" && item.trim() !== "" ? Number(item) : undefined)
  }
  const endpoint = e.endpoint || String(value("endpoint") ?? "") || undefined
  return {
    ...e,
    message: e.message || String(value("message") ?? "Evento registrado"),
    source: e.source || (String(value("source") ?? "backend") as ObservabilityEvent["source"]),
    level: e.level || String(value("level") ?? "info"),
    endpoint,
    status: numberValue(e.status, "status"),
    duration_ms: numberValue(e.duration_ms, "duration_ms"),
    correlation_id: e.correlation_id || String(value("correlation_id") ?? "") || undefined,
    frontend_page: e.frontend_page || String(value("frontend_page") ?? (e.source === "frontend" ? value("page") ?? "" : "")) || undefined,
    frontend_file: e.frontend_file || String(value("frontend_file") ?? (e.source === "frontend" ? value("filename") ?? "" : "")) || undefined,
    backend_file: e.backend_file || String(value("backend_file") ?? (e.source === "backend" ? "backend/app/app.py" : "")) || undefined,
  }
}

export function ObservabilityShell() {
  const [events, setEvents] = useState<ObservabilityEvent[]>([])
  const [stats, setStats] = useState<ObservabilityStats>(emptyStats)

  const [source, setSource] = useState("")
  const [level, setLevel] = useState("")
  const [status, setStatus] = useState("") // mantendo string para compatibilidade com API
  const [search, setSearch] = useState("")

  const [auto, setAuto] = useState(true)
  const [connected, setConnected] = useState(false)

  const [selectedEvent, setSelectedEvent] = useState<ObservabilityEvent | null>(null)
  const [lastCount, setLastCount] = useState(0)

  const clearFilters = useCallback(() => {
    setSource("")
    setLevel("")
    setStatus("")
    setSearch("")
  }, [])

  const load = useCallback(async () => {
    try {
      const prevSize = events.length

      const data = await getObservabilityEvents({
        source,
        level,
        status,
        search,
      })

      const normalized = data.events.map(normalize)

      // Contagem simples de "novos eventos" quando o auto está ligado
      if (auto) {
        const delta = Math.max(0, normalized.length - prevSize)
        if (delta > 0) setLastCount((c) => c + delta)
      }

      setEvents(normalized)
      setStats(data.stats)
      setConnected(true)
    } catch {
      setConnected(false)
    }
  }, [auto, events.length, level, search, source, status])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!auto) return
    const id = window.setInterval(() => void load(), 5000)
    return () => window.clearInterval(id)
  }, [auto, load])

  const statuses = useMemo(() => {
    const setCodes = new Set<number>()
    for (const e of events) if (typeof e.status === "number") setCodes.add(e.status)
    return Array.from(setCodes).sort((a, b) => a - b)
  }, [events])

  const errors = stats.errors
  const avgLatency = stats.latency.average

  const copyJson = useCallback(async () => {
    if (!selectedEvent) return
    const text = JSON.stringify(selectedEvent, null, 2)

    // clipboard API (com fallback)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.left = "-9999px"
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
  }, [selectedEvent])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500 font-black text-slate-950">
              S
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                SIGAC / Operações
              </p>
              <h1 className="text-2xl font-bold tracking-tight">Observabilidade</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-400">
            <Wifi className={connected ? "text-emerald-400" : "text-red-400"} />
            {connected ? "Conectado" : "Backend indisponível"}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
        <section className="grid gap-4 md:grid-cols-5">
          {(
            [
              { label: "Eventos", value: stats.total, Icon: Activity },
              { label: "Erros", value: errors, Icon: Database },
              { label: "Frontend", value: stats.frontend, Icon: Globe },
              { label: "Backend", value: stats.backend, Icon: Server },
              { label: "Latência média", value: `${avgLatency} ms`, Icon: Activity },
            ] as const
          ).map(({ label, value, Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{label}</span>
                <Icon className="text-emerald-400" />
              </div>
              <strong className="mt-3 block text-3xl">{value}</strong>
            </div>
          ))}
        </section>

        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
            <input
              aria-label="Buscar eventos"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar mensagem ou endpoint"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <select
            aria-label="Origem"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="">Todas as origens</option>
            <option value="frontend">Frontend</option>
            <option value="backend">Backend</option>
          </select>

          <select
            aria-label="Nível"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="">Todos os níveis</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>

          <select
            aria-label="Status HTTP"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="">Todos os status</option>
            {statuses.map((code) => (
              <option key={code} value={String(code)}>
                {code}
              </option>
            ))}
          </select>

          {(source || status || level || search) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-slate-400 hover:text-white"
            >
              <X className="size-4" />
              Limpar
            </button>
          )}

          <button
            onClick={() => {
              setAuto(!auto)
              setLastCount(0)
            }}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              auto
                ? "bg-emerald-500 text-slate-950"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            {auto ? <Pause className="size-4" /> : <Play className="size-4" />}
            {auto ? "Pausar" : "Continuar"}
          </button>

          <button
            aria-label="Atualizar agora"
            onClick={() => void load()}
            className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800"
          >
            <RefreshCw className="size-4" />
          </button>
        </section>

        {lastCount > 0 && (
          <button
            onClick={() => setLastCount(0)}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-left text-sm text-emerald-300"
          >
            {lastCount} novos eventos recebidos — clique para dispensar
          </button>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold">Fluxo de eventos</h2>
            <p className="text-sm text-slate-400">
              Clique em uma linha para investigar todos os detalhes
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Horário</th>
                  <th>Origem</th>
                  <th>Nível</th>
                  <th>Status</th>
                  <th>Endpoint</th>
                  <th>Mensagem</th>
                  <th>Duração</th>
                </tr>
              </thead>

              <tbody>
                {events.map((event, index) => (
                  <tr
                    key={`${event.timestamp}-${index}`}
                    tabIndex={0}
                    onClick={() => setSelectedEvent(event)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelectedEvent(event)
                    }}
                    className="cursor-pointer border-t border-slate-800 hover:bg-slate-800/50 focus:bg-slate-800/70 focus:outline-none"
                  >
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-400">
                      {new Date(event.timestamp).toLocaleTimeString("pt-BR")}
                    </td>
                    <td>
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-xs">
                        {event.source}
                      </span>
                    </td>
                    <td className={tone[event.level] ?? "text-slate-300"}>{event.level}</td>
                    <td>{event.status ?? "—"}</td>
                    <td className="max-w-64 truncate font-mono text-xs">
                      {event.endpoint ?? "—"}
                    </td>
                    <td>{event.message}</td>
                    <td className="font-mono text-xs text-slate-400">
                      {event.duration_ms !== undefined ? `${event.duration_ms} ms` : "—"}
                    </td>
                  </tr>
                ))}

                {events.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-slate-500">
                      Nenhum evento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Dialog
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null)
        }}
      >
        <DialogContent className="w-full sm:!max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do evento</DialogTitle>
            <DialogDescription>
              Todos os dados registrados para esta linha de observabilidade.
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["Origem", selectedEvent.source],
                    ["Nível", selectedEvent.level],
                    ["Status", selectedEvent.status ?? "—"],
                    ["Horário", new Date(selectedEvent.timestamp).toLocaleString("pt-BR")],
                    ["Endpoint", selectedEvent.endpoint ?? "—"],
                    ["Duração", selectedEvent.duration_ms !== undefined ? `${selectedEvent.duration_ms} ms` : "—"],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-3"
                  >
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-100">{value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Mensagem</p>
                <p className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm font-medium text-slate-100">
                  {selectedEvent.message || "—"}
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Rastreamento do código</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["Página do frontend", selectedEvent.frontend_page],
                    ["Arquivo do frontend", selectedEvent.frontend_file],
                    ["Arquivo do backend", selectedEvent.backend_file],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="mt-1 break-all font-mono text-sm text-slate-100">{value || "Não identificado"}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">JSON completo</p>
                  <button
                    onClick={() => void copyJson()}
                    className="rounded-md border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
                  >
                    Copiar JSON
                  </button>
                </div>

                <pre className="max-h-80 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed text-emerald-300">
                  {JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
