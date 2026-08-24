"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Search, Users, FolderKanban, Files, FolderOpen, ShieldCheck, Clock3, FileBarChart, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getAccessMap } from "@/lib/api-client"
import type { AccessMapResponse } from "@/lib/types"

const fetcher = () => getAccessMap()
const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })

export default function PesquisasPage() {
  const { data, error, isLoading } = useSWR<AccessMapResponse>("access-map", fetcher)
  const [search, setSearch] = useState("")
  const [type, setType] = useState("todos")
  const [level, setLevel] = useState("todos")

  const rows = useMemo(() => (data?.rows ?? []).filter((row) => {
    const text = `${row.userName} ${row.userEmail} ${row.projectName} ${row.resourceName}`.toLowerCase()
    return text.includes(search.toLowerCase()) && (type === "todos" || row.resourceType === type) && (level === "todos" || row.accessLevel === level)
  }), [data?.rows, search, type, level])

  if (isLoading) return <main className="flex flex-col gap-6"><h1 className="text-2xl font-semibold">Pesquisas</h1><p className="text-muted-foreground">Carregando mapa de acessos...</p></main>
  if (error || !data) return <main className="flex flex-col gap-6"><h1 className="text-2xl font-semibold">Pesquisas</h1><p className="text-destructive">Não foi possível carregar o mapa de acessos.</p></main>

  const cards = [
    [Users, "Usuários no escopo", data.summary.users], [FolderKanban, "Projetos", data.summary.projects],
    [FolderOpen, "Pastas", data.summary.folders], [Files, "Arquivos", data.summary.files],
  ] as const

  return <main className="flex flex-col gap-6">
    <header className="flex flex-col gap-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex flex-col gap-2"><div className="flex items-center gap-2"><ShieldCheck className="text-primary" /><span className="text-xs font-semibold uppercase tracking-widest text-primary">Governança de acesso</span></div><h1 className="text-3xl font-semibold tracking-tight text-balance">Mapa de acessos científicos</h1></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" render={<Link href="/relatorios?origem=pesquisas" />} nativeButton={false}><FileBarChart data-icon="inline-start" />Gerar relatório</Button><Button variant="ghost" size="sm" render={<Link href="/logs" />} nativeButton={false}><Download data-icon="inline-start" />Auditoria</Button></div></div><p className="max-w-3xl text-muted-foreground leading-relaxed">Pesquise quem acessa cada projeto, pasta e arquivo. A visão respeita o seu perfil e torna a cadeia de acesso auditável em um único lugar.</p></header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo de acessos">{cards.map(([Icon, label, value]) => <Card key={label}><CardContent className="flex items-center gap-4 pt-6"><div className="rounded-lg bg-primary/10 p-3 text-primary"><Icon /></div><div><p className="text-2xl font-semibold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div></CardContent></Card>)}</section>
    <Card><CardHeader><CardTitle>Mapa relacional</CardTitle><CardDescription>{data.summary.relationships} relações de acesso identificadas no seu escopo.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar usuário, projeto, pasta ou arquivo" value={search} onChange={(event) => setSearch(event.target.value)} /></div><Select value={type} onValueChange={(value) => setType(value ?? "todos")}><SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="todos">Todos os recursos</SelectItem><SelectItem value="pasta">Pastas</SelectItem><SelectItem value="arquivo">Arquivos</SelectItem></SelectGroup></SelectContent></Select><Select value={level} onValueChange={(value) => setLevel(value ?? "todos")}><SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Permissão" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="todos">Todos os níveis</SelectItem><SelectItem value="leitura">Leitura</SelectItem><SelectItem value="edicao">Edição</SelectItem><SelectItem value="gerente">Gerente</SelectItem><SelectItem value="participante">Participante</SelectItem></SelectGroup></SelectContent></Select></div>
      <Table><TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Projeto</TableHead><TableHead>Recurso</TableHead><TableHead>Acesso</TableHead><TableHead>Última visualização</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={`${row.userId}-${row.resourceId}`}><TableCell><div className="flex flex-col"><span className="font-medium">{row.userName}</span><span className="text-xs text-muted-foreground">{row.userEmail}</span></div></TableCell><TableCell><div className="flex flex-col"><span>{row.projectName}</span><span className="text-xs text-muted-foreground">{row.projectId}</span></div></TableCell><TableCell><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" />{row.resourceName}<span className="text-xs text-muted-foreground">({row.resourceType})</span></div></TableCell><TableCell><Badge variant={row.accessLevel === "edicao" || row.accessLevel === "gerente" ? "default" : "secondary"}>{row.accessLevel}</Badge></TableCell><TableCell><span className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" />{dateFormat.format(new Date(row.lastViewedAt))}</span></TableCell></TableRow>)}</TableBody></Table>{rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum acesso encontrado para os filtros selecionados.</p>}
    </CardContent></Card>
  </main>
}
