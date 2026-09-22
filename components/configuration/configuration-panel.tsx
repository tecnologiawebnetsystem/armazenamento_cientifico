"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { PencilIcon, PlusIcon, SearchIcon, Settings2Icon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])
  const filteredRows = useMemo(() => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [rows, search])
  const openEditor = (row?: ConfigurationRow) => setEditor({ row, values: Object.fromEntries(config.fields.map(({ key }) => [key, String(row?.[key] ?? "")])) })
  const serialize = (values: Record<string, string>) => Object.fromEntries(config.fields.map(({ key, type }) => [key, type === "boolean" ? values[key] === "true" : type === "number" ? Number(values[key] || 0) : values[key]]))
  async function save() {
    if (!editor) return
    try { const data = serialize(editor.values); if (editor.row) await updateConfiguration(resource, config.key.map((key) => String(editor.row?.[key] ?? "")).join("|"), data); else await createConfiguration(resource, data); toast.success("Registro salvo com sucesso"); setEditor(null); await load() } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar") }
  }
  async function remove(row: ConfigurationRow) {
    if (!window.confirm(`Excluir ${config.label.toLowerCase()}?`)) return
    try { await deleteConfiguration(resource, config.key.map((key) => String(row[key] ?? "")).join("|")); toast.success("Registro excluído"); await load() } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível excluir") }
  }

  return <div className="flex flex-col gap-6">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{groups.map((group) => <Card key={group}><CardHeader className="pb-3"><CardDescription>{group}</CardDescription><CardTitle>{resourceList.filter((item) => resources[item].group === group).length} cadastros</CardTitle></CardHeader></Card>)}</div>
    <Card className="overflow-hidden"><CardHeader className="border-b bg-muted/20"><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="flex items-center gap-2"><Settings2Icon className="size-5 text-primary" /><CardTitle>Central de configurações</CardTitle></div><CardDescription className="mt-1">Gerencie os parâmetros que controlam navegação, segurança, operação e relatórios.</CardDescription></div><div className="flex flex-col gap-2 sm:flex-row"><Select value={resource} onValueChange={(value) => { const next = value as ConfigurationResource; setResource(next); setSearch(""); void load(next) }}><SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger><SelectContent>{groups.map((group) => <div key={group}><div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{group}</div>{resourceList.filter((item) => resources[item].group === group).map((item) => <SelectItem key={item} value={item}>{resources[item].label}</SelectItem>)}</div>)}</SelectContent></Select><Button onClick={() => openEditor()}><PlusIcon data-icon="inline-start" />Novo registro</Button></div></div></CardHeader><CardContent className="p-0"><div className="flex items-center gap-3 border-b p-4"><SearchIcon className="size-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar em ${config.label.toLowerCase()}`} className="border-0 shadow-none focus-visible:ring-0" /></div><div className="overflow-x-auto">{loading ? <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p> : <Table><TableHeader><TableRow>{config.fields.map((item) => <TableHead key={item.key}>{item.label}</TableHead>)}<TableHead className="w-28 text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{filteredRows.map((row, index) => <TableRow key={config.key.map((key) => String(row[key] ?? index)).join("-")}>{config.fields.map((item) => <TableCell key={item.key} className="max-w-64 truncate">{item.type === "boolean" ? <Badge variant={row[item.key] ? "default" : "secondary"}>{formatValue(row[item.key])}</Badge> : formatValue(row[item.key])}</TableCell>)}<TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEditor(row)}><PencilIcon /></Button><Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => void remove(row)}><Trash2Icon /></Button></div></TableCell></TableRow>)}{!filteredRows.length && <TableRow><TableCell colSpan={config.fields.length + 1} className="h-24 text-center text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>}</TableBody></Table>}</div></CardContent></Card>
    <Dialog open={editor !== null} onOpenChange={(open) => !open && setEditor(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editor?.row ? "Editar" : "Novo"} — {config.label}</DialogTitle></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2">{config.fields.map((item) => <div className="flex flex-col gap-2" key={item.key}><Label htmlFor={`config-${item.key}`}>{item.label}</Label>{item.type === "boolean" ? <Select value={editor?.values[item.key] || "false"} onValueChange={(value) => setEditor((current) => current && { ...current, values: { ...current.values, [item.key]: value } })}><SelectTrigger id={`config-${item.key}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Ativo / Sim</SelectItem><SelectItem value="false">Inativo / Não</SelectItem></SelectContent></Select> : <Input id={`config-${item.key}`} type={item.type === "number" ? "number" : "text"} disabled={Boolean(editor?.row && config.key.includes(item.key))} value={editor?.values[item.key] ?? ""} onChange={(event) => setEditor((current) => current && { ...current, values: { ...current.values, [item.key]: event.target.value } })} />}</div>)}</div><DialogFooter><Button variant="outline" onClick={() => setEditor(null)}>Cancelar</Button><Button onClick={() => void save()}>Salvar</Button></DialogFooter></DialogContent></Dialog>
  </div>
}

export const configurationResourceLabels = resources
