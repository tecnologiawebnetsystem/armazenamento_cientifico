"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2Icon, ChevronRightIcon, PencilIcon, PlusIcon, SearchIcon, Settings2Icon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createConfiguration, deleteConfiguration, getConfigurations, updateConfiguration, type ConfigurationResource, type ConfigurationRow } from "@/lib/api-client"

type Field = { key: string; label: string; type?: "boolean" | "number" }
type ResourceConfig = { label: string; group: string; key: string[]; fields: Field[] }
const f = (key: string, label: string, type?: Field["type"]): Field => ({ key, label, type })

const resources: Record<ConfigurationResource, ResourceConfig> = {
  menus: { label: "Menus", group: "Acesso e navegação", key: ["id"], fields: [f("id", "Identificador"), f("module_id", "Módulo"), f("parent_id", "Menu pai"), f("name", "Nome"), f("route", "Rota"), f("icon", "Ícone"), f("display_order", "Ordem", "number"), f("active", "Ativo", "boolean")] },
  modules: { label: "Módulos", group: "Acesso e navegação", key: ["id"], fields: [f("id", "Identificador"), f("name", "Nome"), f("route", "Rota"), f("icon", "Ícone"), f("display_order", "Ordem", "number"), f("active", "Ativo", "boolean")] },
  permissions: { label: "Permissões", group: "Acesso e navegação", key: ["id"], fields: [f("id", "Identificador"), f("module_id", "Módulo"), f("name", "Nome"), f("description", "Descrição"), f("active", "Ativa", "boolean")] },
  menu_permissions: { label: "Permissões de menu", group: "Segurança", key: ["menu_id", "permission_id"], fields: [f("menu_id", "Menu"), f("permission_id", "Permissão"), f("allowed", "Permitida", "boolean")] },
  profiles: { label: "Perfis", group: "Segurança", key: ["id"], fields: [f("id", "Identificador"), f("name", "Nome"), f("description", "Descrição")] },
  profile_permissions: { label: "Permissões por perfil", group: "Segurança", key: ["profile_id", "permission_id"], fields: [f("profile_id", "Perfil"), f("permission_id", "Permissão"), f("allowed", "Permitida", "boolean")] },
  profile_modules: { label: "Módulos por perfil", group: "Segurança", key: ["profile_id", "module_id"], fields: [f("profile_id", "Perfil"), f("module_id", "Módulo"), f("can_view", "Pode visualizar", "boolean")] },
  project_statuses: { label: "Status de projetos", group: "Operação", key: ["id"], fields: [f("id", "Identificador"), f("code", "Código"), f("name", "Nome"), f("color", "Cor"), f("display_order", "Ordem", "number"), f("active", "Ativo", "boolean"), f("allows_edit", "Permite edição", "boolean")] },
  responsible_areas: { label: "Áreas responsáveis", group: "Operação", key: ["id"], fields: [f("id", "Identificador"), f("name", "Nome"), f("prefix", "Prefixo"), f("next_number", "Próximo número", "number"), f("active", "Ativa", "boolean")] },
  report_types: { label: "Tipos de relatório", group: "Relatórios", key: ["id"], fields: [f("id", "Identificador"), f("code", "Código"), f("name", "Nome"), f("description", "Descrição"), f("formats", "Formatos"), f("active", "Ativo", "boolean")] },
  report_fields: { label: "Campos de relatório", group: "Relatórios", key: ["id"], fields: [f("id", "Identificador"), f("report_code", "Relatório"), f("field_key", "Chave"), f("label", "Rótulo"), f("source_key", "Origem"), f("display_order", "Ordem", "number"), f("active", "Ativo", "boolean")] },
  dashboard_cards: { label: "Cards do dashboard", group: "Dashboard", key: ["id"], fields: [f("id", "Identificador"), f("module_id", "Módulo"), f("key", "Chave"), f("title", "Título"), f("description", "Descrição"), f("metric_key", "Métrica"), f("route", "Rota"), f("profile_ids", "Perfis"), f("display_order", "Ordem", "number"), f("active", "Ativo", "boolean")] },
}

const resourceList = Object.keys(resources) as ConfigurationResource[]
const groups = [...new Set(resourceList.map((item) => resources[item].group))]
const groupDescriptions: Record<string, string> = {
  "Segurança": "Perfis, permissões e vínculos de acesso.",
  "Acesso e navegação": "Módulos, menus e permissões exibidas no sistema.",
  "Relatórios": "Tipos de relatório e campos disponíveis para exportação.",
  "Operação": "Status e áreas usados no fluxo dos projetos.",
  "Dashboard": "Cards, métricas e visibilidade por perfil.",
}
const formatValue = (value: unknown) => typeof value === "boolean" ? (value ? "Ativo" : "Inativo") : value === null || value === undefined || value === "" ? "—" : String(value)

export function ConfigurationPanel() {
  const [resource, setResource] = useState<ConfigurationResource>("menus")
  const [rows, setRows] = useState<ConfigurationRow[]>([])
  const [search, setSearch] = useState("")
  const [editor, setEditor] = useState<{ row?: ConfigurationRow; values: Record<string, string> } | null>(null)
  const [loading, setLoading] = useState(false)
  const config = resources[resource]

  const load = useCallback(async (next: ConfigurationResource = resource) => {
    setLoading(true)
    try { setRows(await getConfigurations(next)) } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível carregar os registros") } finally { setLoading(false) }
  }, [resource])
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])

  const filteredRows = useMemo(() => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [rows, search])
  const activeRows = useMemo(() => rows.filter((row) => row.active !== false), [rows])
  const inactiveRows = rows.length - activeRows.length
  const quickResources = resourceList.filter((item) => resources[item].group === config.group)
  const groupResources = groups.map((group) => ({ group, items: resourceList.filter((item) => resources[item].group === group) }))
  const openEditor = (row?: ConfigurationRow) => setEditor({ row, values: Object.fromEntries(config.fields.map(({ key }) => [key, String(row?.[key] ?? "")])) })
  const serialize = (values: Record<string, string>) => Object.fromEntries(config.fields.map(({ key, type }) => [key, type === "boolean" ? values[key] === "true" : type === "number" ? Number(values[key] || 0) : values[key]]))
  async function save() { if (!editor) return; try { const data = serialize(editor.values); if (editor.row) await updateConfiguration(resource, config.key.map((key) => String(editor.row?.[key] ?? "")).join("|"), data); else await createConfiguration(resource, data); toast.success("Registro salvo com sucesso"); setEditor(null); await load() } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar") } }
  async function remove(row: ConfigurationRow) { if (!window.confirm(`Excluir ${config.label.toLowerCase()}?`)) return; try { await deleteConfiguration(resource, config.key.map((key) => String(row[key] ?? "")).join("|")); toast.success("Registro excluído"); await load() } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível excluir") } }

  return <div className="flex flex-col gap-6">
    <section className="relative overflow-hidden rounded-2xl border bg-primary px-6 py-7 text-primary-foreground shadow-sm sm:px-8">
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl"><Badge variant="secondary" className="mb-4 gap-2 bg-primary-foreground/15 text-primary-foreground"><Settings2Icon className="size-3.5" /> Administração central</Badge><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Configurações do sistema</h1><p className="mt-2 max-w-xl text-sm leading-6 text-primary-foreground/75">Organize o acesso, a operação e os relatórios em um único espaço de controle.</p></div>
        <div className="flex items-center gap-3 text-sm text-primary-foreground/80"><div className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/15"><CheckCircle2Icon className="size-5" /></div><div><p className="font-medium text-primary-foreground">Ambiente protegido</p><p>Alterações aplicadas em tempo real</p></div></div>
      </div><div className="pointer-events-none absolute -right-8 -top-16 size-56 rounded-full border-[32px] border-primary-foreground/10" />
    </section>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Card className="border-primary/20 bg-primary/5"><CardHeader className="gap-2 pb-4"><CardDescription>Catálogo selecionado</CardDescription><CardTitle className="truncate text-xl">{config.label}</CardTitle><p className="text-xs text-muted-foreground">{rows.length} registros carregados</p></CardHeader></Card><Card><CardHeader className="gap-2 pb-4"><CardDescription>Registros ativos</CardDescription><CardTitle className="text-2xl">{activeRows.length}</CardTitle><p className="text-xs text-muted-foreground">Disponíveis para uso</p></CardHeader></Card><Card><CardHeader className="gap-2 pb-4"><CardDescription>Registros inativos</CardDescription><CardTitle className="text-2xl">{inactiveRows}</CardTitle><p className="text-xs text-muted-foreground">Preservados para histórico</p></CardHeader></Card><Card><CardHeader className="gap-2 pb-4"><CardDescription>Domínio</CardDescription><CardTitle className="truncate text-xl">{config.group}</CardTitle><p className="text-xs text-muted-foreground">{quickResources.length} catálogos relacionados</p></CardHeader></Card></div>
    <Card className="overflow-hidden shadow-sm"><CardHeader className="border-b bg-muted/20 pb-5"><div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Catálogo administrativo</p><CardTitle className="text-xl">{config.label}</CardTitle><CardDescription className="mt-1">{groupDescriptions[config.group]} Escolha um item abaixo para editar seus parâmetros.</CardDescription></div><div className="flex flex-col gap-2 sm:flex-row"><Button onClick={() => openEditor()}><PlusIcon data-icon="inline-start" />Novo registro</Button></div></div><div className="grid gap-3 border-t pt-5 md:grid-cols-2 xl:grid-cols-4">{groupResources.map(({ group, items }) => <div key={group} className="rounded-xl border bg-background/70 p-3"><div className="mb-2 flex items-start justify-between gap-2"><div><p className="text-sm font-semibold">{group}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{groupDescriptions[group]}</p></div><Badge variant="outline">{items.length}</Badge></div><div className="flex flex-wrap gap-1.5">{items.map((item) => <Button key={item} variant={item === resource ? "secondary" : "ghost"} size="sm" className="h-8 text-xs" onClick={() => { setResource(item); setSearch(""); void load(item) }}>{resources[item].label}</Button>)}</div></div>)}</div></CardHeader><CardContent className="p-0"><div className="flex items-center gap-3 border-b px-5 py-3"><SearchIcon className="size-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar em ${config.label.toLowerCase()}`} className="border-0 bg-transparent shadow-none focus-visible:ring-0" /><Badge variant="secondary">{filteredRows.length} registros</Badge></div><div className="overflow-x-auto">{loading ? <p className="p-12 text-center text-sm text-muted-foreground">Carregando registros...</p> : <Table><TableHeader><TableRow>{config.fields.map((item) => <TableHead key={item.key}>{item.label}</TableHead>)}<TableHead className="w-28 text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{filteredRows.map((row, index) => <TableRow key={config.key.map((key) => String(row[key] ?? index)).join("-")} className="group"><TableCell className="py-4" colSpan={Math.min(2, config.fields.length)}>{config.fields.slice(0, Math.min(2, config.fields.length)).map((item, itemIndex) => <div key={item.key} className={itemIndex === 0 ? "font-medium" : "mt-1 text-xs text-muted-foreground"}>{formatValue(row[item.key])}</div>)}</TableCell>{config.fields.slice(2).map((item) => <TableCell key={item.key} className="whitespace-nowrap text-sm">{typeof row[item.key] === "boolean" ? <Badge variant={row[item.key] ? "default" : "secondary"}>{formatValue(row[item.key])}</Badge> : formatValue(row[item.key])}</TableCell>)}<TableCell className="text-right"><div className="flex justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100"><Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEditor(row)}><PencilIcon /></Button><Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => void remove(row)}><Trash2Icon /></Button></div></TableCell></TableRow>)}</TableBody></Table>}</div>{!loading && filteredRows.length === 0 && <div className="flex flex-col items-center gap-2 border-t px-6 py-14 text-center"><div className="flex size-12 items-center justify-center rounded-full bg-muted"><SearchIcon className="size-5 text-muted-foreground" /></div><p className="font-medium">Nenhum registro encontrado</p><p className="text-sm text-muted-foreground">Ajuste a busca ou crie um novo registro.</p></div>}</CardContent></Card>
    <Dialog open={editor !== null} onOpenChange={(open) => !open && setEditor(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editor?.row ? "Editar" : "Novo"} — {config.label}</DialogTitle></DialogHeader><Separator /><div className="grid gap-4 py-2 sm:grid-cols-2">{config.fields.map((item) => <div className="flex flex-col gap-2" key={item.key}><Label htmlFor={`config-${item.key}`}>{item.label}</Label>{item.type === "boolean" ? <Select value={editor?.values[item.key] || "false"} onValueChange={(value) => setEditor((current) => current && { ...current, values: { ...current.values, [item.key]: value ?? "" } })}><SelectTrigger id={`config-${item.key}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Ativo / Sim</SelectItem><SelectItem value="false">Inativo / Não</SelectItem></SelectContent></Select> : <Input id={`config-${item.key}`} type={item.type === "number" ? "number" : "text"} disabled={Boolean(editor?.row && config.key.includes(item.key))} value={editor?.values[item.key] ?? ""} onChange={(event) => setEditor((current) => current && { ...current, values: { ...current.values, [item.key]: event.target.value } })} />}</div>)}</div><DialogFooter><Button variant="outline" onClick={() => setEditor(null)}>Cancelar</Button><Button onClick={() => void save()}>Salvar alterações<ChevronRightIcon data-icon="inline-end" /></Button></DialogFooter></DialogContent></Dialog>
  </div>
}

export const configurationResourceLabels = resources
