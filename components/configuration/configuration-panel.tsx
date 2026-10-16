"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { EyeIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react"
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
  menus: { label: "Menus", group: "Acesso e navegação", key: ["id"], fields: [f("id", "Identificador"), f("module_id", "Módulo"), f("parent_id", "Menu pai"), f("name", "Nome"), f("route", "Rota"), f("icon", "Ícone"), f("display_order", "Ordem", "number"), f("active", "Mostrar no menu", "boolean")] },
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
const resourceDescriptions: Record<ConfigurationResource, string> = {
  menus: "Defina quais menus aparecem na navegação global, independentemente do perfil do usuário.",
  modules: "Organize as áreas funcionais disponíveis no sistema.",
  permissions: "Cadastre as ações que podem ser liberadas por perfil.",
  menu_permissions: "Controle quais permissões cada menu exige.",
  profiles: "Crie perfis para organizar os níveis de acesso.",
  profile_permissions: "Associe ações permitidas a cada perfil.",
  profile_modules: "Defina quais módulos cada perfil pode visualizar.",
  project_statuses: "Mantenha os estados usados no acompanhamento dos projetos.",
  responsible_areas: "Configure as áreas responsáveis pelos registros.",
  report_types: "Cadastre os tipos de relatório disponibilizados.",
  report_fields: "Configure os campos exibidos nos relatórios.",
  dashboard_cards: "Defina os cards e métricas exibidos no dashboard.",
}
const formatValue = (value: unknown) => typeof value === "boolean" ? (value ? "Ativo" : "Inativo") : value === null || value === undefined || value === "" ? "—" : String(value)

export function ConfigurationPanel() {
  const searchParams = useSearchParams()
  const requestedResource = searchParams.get("tabela") as ConfigurationResource | null
  const [resource, setResource] = useState<ConfigurationResource>(() => requestedResource && resourceList.includes(requestedResource) ? requestedResource : "menus")
  const [rows, setRows] = useState<ConfigurationRow[]>([])
  const [search, setSearch] = useState("")
  const [editor, setEditor] = useState<{ row?: ConfigurationRow; values: Record<string, string> } | null>(null)
  const [viewing, setViewing] = useState<ConfigurationRow | null>(null)
  const [loading, setLoading] = useState(false)
  const config = resources[resource]
  const load = useCallback(async (next: ConfigurationResource = resource) => { setLoading(true); try { setRows(await getConfigurations(next)) } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível carregar os registros") } finally { setLoading(false) } }, [resource])
  // A troca de recurso precisa sincronizar a tabela com a API na montagem e nas mudanças de seleção.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (requestedResource && resourceList.includes(requestedResource) && requestedResource !== resource) {
      // A URL é a fonte de verdade quando o usuário navega pelos submenus.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResource(requestedResource)
      setSearch("")
    }
  }, [requestedResource, resource])
  const filteredRows = useMemo(() => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [rows, search])
  const activeRows = rows.filter((row) => row.active !== false)
  const openEditor = (row?: ConfigurationRow) => setEditor({ row, values: Object.fromEntries(config.fields.map(({ key }) => [key, String(row?.[key] ?? "")])) })
  const serialize = (values: Record<string, string>) => Object.fromEntries(config.fields.map(({ key, type }) => [key, type === "boolean" ? values[key] === "true" : type === "number" ? Number(values[key] || 0) : values[key]]))
  async function save() { if (!editor) return; try { const data = serialize(editor.values); if (editor.row) await updateConfiguration(resource, config.key.map((key) => String(editor.row?.[key] ?? "")).join("|"), data); else await createConfiguration(resource, data); toast.success("Registro salvo com sucesso"); setEditor(null); await load() } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar") } }
  async function remove(row: ConfigurationRow) { if (!window.confirm(`Excluir ${config.label.toLowerCase()}?`)) return; try { await deleteConfiguration(resource, config.key.map((key) => String(row[key] ?? "")).join("|")); toast.success("Registro excluído"); await load() } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível excluir") } }

  return <div className="flex flex-col gap-5">
    <Card className="overflow-hidden border-primary/20 shadow-[0_8px_30px_color-mix(in_oklch,var(--primary)_7%,transparent)]"><CardHeader className="border-b border-primary/15 bg-gradient-to-r from-primary/[0.06] via-background to-accent/[0.08] pb-4"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="mb-2 flex flex-wrap items-center gap-2"><Badge className="bg-primary/10 text-primary hover:bg-primary/15">{config.group}</Badge><span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Configurações</span></div><CardTitle className="text-primary">{config.label}</CardTitle><CardDescription className="mt-1 max-w-2xl">{resourceDescriptions[resource]}</CardDescription><p className="mt-2 text-xs text-muted-foreground">{rows.length} registros · {activeRows.length} ativos</p></div><Button onClick={() => openEditor()}><PlusIcon data-icon="inline-start" />Criar registro</Button></div><div className="mt-4 flex items-center gap-3 rounded-lg border bg-background px-3"><SearchIcon className="size-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Filtrar ${config.label.toLowerCase()}...`} className="border-0 bg-transparent shadow-none focus-visible:ring-0" /><Badge variant="secondary">{filteredRows.length}</Badge></div></CardHeader><CardContent className="p-0">{loading ? <p className="p-12 text-center text-sm text-muted-foreground">Carregando registros...</p> : filteredRows.length === 0 ? <div className="flex flex-col items-center gap-3 px-6 py-14 text-center"><div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><SearchIcon className="size-5" /></div><div><p className="font-medium">{search ? "Nenhum resultado encontrado" : `Ainda não há ${config.label.toLowerCase()}`}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{search ? "Tente outro termo ou limpe a busca." : resourceDescriptions[resource]}</p></div>{search ? <Button variant="outline" size="sm" onClick={() => setSearch("")}>Limpar busca</Button> : <Button size="sm" onClick={() => openEditor()}><PlusIcon data-icon="inline-start" />Criar primeiro registro</Button>}</div> : <div className="overflow-x-auto"><Table><TableHeader><TableRow>{config.fields.slice(0, 5).map((field) => <TableHead key={field.key}>{field.label}</TableHead>)}<TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{filteredRows.map((row, index) => <TableRow key={config.key.map((key) => String(row[key] ?? index)).join("-")}>{config.fields.slice(0, 5).map((field) => <TableCell key={field.key} className="max-w-56 truncate">{formatValue(row[field.key])}</TableCell>)}<TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label="Visualizar registro" onClick={() => setViewing(row)}><EyeIcon /></Button><Button variant="ghost" size="icon" aria-label="Editar registro" onClick={() => openEditor(row)}><PencilIcon /></Button><Button variant="ghost" size="icon" aria-label="Excluir registro" onClick={() => void remove(row)}><Trash2Icon /></Button></div></TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card>
    <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}><DialogContent><DialogHeader><DialogTitle>Visualizar — {config.label}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2">{config.fields.map((field) => <div key={field.key} className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{field.label}</p><p className="mt-1 break-words text-sm font-medium">{formatValue(viewing?.[field.key])}</p></div>)}</div></DialogContent></Dialog>
    <Dialog open={editor !== null} onOpenChange={(open) => !open && setEditor(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editor?.row ? "Editar" : "Criar"} — {config.label}</DialogTitle><CardDescription>Preencha os parâmetros e salve a alteração.</CardDescription></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2">{config.fields.map((item) => <div className="flex flex-col gap-2" key={item.key}><Label htmlFor={`config-${item.key}`}>{item.label}</Label>{item.type === "boolean" ? <Select value={editor?.values[item.key] || "false"} onValueChange={(value) => setEditor((current) => current && { ...current, values: { ...current.values, [item.key]: value ?? "" } })}><SelectTrigger id={`config-${item.key}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Sim — mostrar</SelectItem><SelectItem value="false">Não — ocultar</SelectItem></SelectContent></Select> : <Input id={`config-${item.key}`} type={item.type === "number" ? "number" : "text"} disabled={Boolean(editor?.row && config.key.includes(item.key))} value={editor?.values[item.key] ?? ""} onChange={(event) => setEditor((current) => current && { ...current, values: { ...current.values, [item.key]: event.target.value } })} />}</div>)}</div><DialogFooter><Button variant="outline" onClick={() => setEditor(null)}>Cancelar</Button><Button onClick={() => void save()}>Salvar</Button></DialogFooter></DialogContent></Dialog>
  </div>
}

export const configurationResourceLabels = resources

