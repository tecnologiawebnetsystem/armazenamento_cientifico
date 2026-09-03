"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, ChevronLeft, ChevronRight, Database, Play, Search, Table2, Zap } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { executeSql, getSqlTables, previewSqlTable, type SqlResult, type SqlTable } from "@/lib/api-client"

export function SqlManagerShell() {
  const [tables, setTables] = useState<SqlTable[]>([])
  const [selected, setSelected] = useState<string>("")
  const [query, setQuery] = useState("SELECT * FROM ")
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [result, setResult] = useState<SqlResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { getSqlTables().then((data) => { setTables(data.tables); if (data.tables[0]) selectTable(data.tables[0].name) }).catch((error) => toast.error(error.message)) }, [])
  const filteredTables = useMemo(() => tables.filter((table) => table.name.toLowerCase().includes(search.toLowerCase())), [tables, search])

  async function selectTable(name: string, nextPage = 1) {
    setSelected(name); setQuery(`SELECT * FROM ${name}`); setLoading(true)
    try { const data = await previewSqlTable(name, nextPage); setRows(data.rows); setColumns(data.columns.map((column) => column.name)); setPage(nextPage); setHasMore(data.hasMore); setResult(null) } catch (error) { toast.error(error instanceof Error ? error.message : "Erro ao carregar tabela") } finally { setLoading(false) }
  }
  async function runQuery() {
    const kind = query.trim().split(/\s+/)[0]?.toLowerCase()
    if (["insert", "update", "delete"].includes(kind) && !window.confirm("Você está prestes a alterar dados. Deseja continuar?")) return
    setLoading(true)
    try { const data = await executeSql(query); setResult(data); setRows(data.rows); setColumns(data.columns); toast.success(`${data.kind} executado com sucesso`); if (selected && kind !== "select") await selectTable(selected) } catch (error) { toast.error(error instanceof Error ? error.message : "Erro ao executar SQL") } finally { setLoading(false) }
  }
  return <main className="min-h-screen bg-[#f4f7f5] text-[#18352b]">
    <header className="flex h-16 items-center justify-between bg-[#006b3f] px-5 text-white shadow-lg"><div className="flex items-center gap-4"><img src="/images/petrobras-full-logo.png" alt="Petrobras" className="h-9 w-auto" /><Separator orientation="vertical" className="h-7 bg-white/30" /><div><p className="text-xs font-medium uppercase tracking-[0.22em] text-[#f4d000]">Ferramenta administrativa</p><h1 className="text-lg font-semibold tracking-tight">SQL Manager</h1></div></div><Badge className="border-[#f4d000]/50 bg-[#f4d000]/15 text-[#fff5a8]"><Zap data-icon="inline-start" /> Acesso direto</Badge></header>
    <div className="flex min-h-[calc(100vh-4rem)]"><aside className="flex w-64 shrink-0 flex-col border-r border-[#d9e3dd] bg-[#ffffff]"><div className="border-b border-[#d9e3dd] p-4"><div className="relative"><Search className="absolute left-3 top-2.5 text-[#779087]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar tabelas" className="border-[#d9e3dd] pl-9" /></div><p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#779087]">Tabelas <span className="float-right font-normal">{tables.length}</span></p></div><nav className="flex flex-col gap-1 overflow-y-auto p-2">{filteredTables.map((table) => <button key={table.name} onClick={() => selectTable(table.name)} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${selected === table.name ? "bg-[#e5f2eb] font-semibold text-[#006b3f]" : "text-[#52675d] hover:bg-[#f0f5f2]"}`}><Table2 className="size-4 shrink-0" /> <span className="truncate">{table.name}</span></button>)}{!filteredTables.length && <p className="p-4 text-sm text-[#779087]">Nenhuma tabela encontrada.</p>}</nav></aside>
    <section className="flex min-w-0 flex-1 flex-col"><div className="border-b border-[#d9e3dd] bg-white px-6 py-5"><div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4"><div><div className="flex items-center gap-2 text-sm text-[#779087]"><Database className="size-4" /> Banco conectado</div><h2 className="mt-1 text-2xl font-semibold tracking-tight">{selected || "Selecione uma tabela"}</h2></div><Badge variant="outline" className="border-[#c7d8ce] text-[#52675d]">Limite: 100 linhas</Badge></div></div><div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-5 p-6"><div className="overflow-hidden rounded-xl border border-[#c7d8ce] bg-[#102d24] shadow-sm"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><span className="font-mono text-xs uppercase tracking-widest text-[#b9cec3]">Editor SQL</span><Button onClick={runQuery} disabled={loading || !query.trim()} className="bg-[#f4d000] font-semibold text-[#18352b] hover:bg-[#e5c500]"><Play data-icon="inline-start" /> {loading ? "Executando…" : "Executar"}</Button></div><Textarea value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") runQuery() }} className="min-h-32 resize-y rounded-none border-0 bg-transparent px-4 py-4 font-mono text-sm leading-6 text-[#f4f7f5] shadow-none focus-visible:ring-0" aria-label="Consulta SQL" /></div>{result && <div className="flex flex-wrap items-center gap-3 text-sm text-[#52675d]"><Badge variant="secondary">{result.kind}</Badge><span>{result.rowCount} linha(s)</span><span>{result.durationMs} ms</span>{result.truncated && <span className="flex items-center gap-1 text-[#9a6d00]"><AlertTriangle className="size-4" /> Resultado limitado a 100 linhas</span>}</div>}<div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-[#c7d8ce] bg-white shadow-sm"><div className="overflow-auto"><table className="w-full text-left text-sm"><thead className="bg-[#eef5f0] text-xs uppercase tracking-wider text-[#52675d]"><tr>{columns.map((column) => <th key={column} className="whitespace-nowrap border-b border-[#d9e3dd] px-4 py-3 font-semibold">{column}</th>)}{!columns.length && <th className="px-4 py-3">Resultado</th>}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-b border-[#edf2ee] last:border-0 hover:bg-[#f7faf8]">{columns.map((column) => <td key={column} className="max-w-72 whitespace-nowrap px-4 py-3 font-mono text-xs text-[#52675d]">{row[column] === null ? <span className="text-[#a2b1a9]">NULL</span> : String(row[column])}</td>)}</tr>)}{!loading && !rows.length && <tr><td colSpan={Math.max(columns.length, 1)} className="px-4 py-16 text-center text-[#779087]">Selecione uma tabela ou execute uma consulta para ver os resultados.</td></tr>}</tbody></table></div><div className="flex items-center justify-between border-t border-[#d9e3dd] px-4 py-3 text-sm text-[#779087]"><span>{rows.length} registro(s) exibido(s)</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => selected && selectTable(selected, page - 1)}><ChevronLeft data-icon="inline-start" /> Anterior</Button><span className="px-2">Página {page}</span><Button variant="outline" size="sm" disabled={!hasMore || loading} onClick={() => selected && selectTable(selected, page + 1)}>Próxima <ChevronRight data-icon="inline-end" /></Button></div></div></div></div></section></div></main>
}
