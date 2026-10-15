"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2Icon, EyeIcon, PencilIcon, PlusIcon, SearchIcon, Settings2Icon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
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
const groupDescriptions: Record<string, string> = { "Segurança": "Perfis, permissões e vínculos de acesso.", "Acesso e navegação": "Módulos e menus exibidos no sistema.", "Relatórios": "Tipos e campos disponíveis para exportação.", "Operação": "Status e áreas usados nos projetos.", "Dashboard": "Cards, métricas e visibilidade." }
const formatValue = (value: unknown) => typeof value === "boolean" ? (value ? "Ativo" : "Inativo") : value === null || value === undefined || value === "" ? "—" : String(value)

export function ConfigurationPanel({ initialResource = "menus" }: { initialResource?: ConfigurationResource }) {
  const resource = initialResource
  const [rows, setRows] = useState<ConfigurationRow[]>([])
  const [search, setSearch] = useState("")
  const [editor, setEditor] = useState<{ row?: ConfigurationRow; values: Record<string, string> } | null>(null)
  const [viewing, setViewing] = useState<ConfigurationRow | null>(null)
  const [deleting, setDeleting] = useState<ConfigurationRow | null>(null)
  const [formError, setFormError] = useState("")
  const [loading, setLoading] = useState(false)
  const config = resources[resource]
  const load = useCallback(async (next: ConfigurationResource = resource) => { setLoading(true); try { setRows(await getConfigurations(next)) } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível carregar os registros") } finally { setLoading(false) } }, [resource])
  // A troca de recurso precisa sincronizar a tabela com a API na montagem e nas mudanças de seleção.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])
  const filteredRows = useMemo(() => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [rows, search])
  const activeRows = rows.filter((row) => row.active !== false)
  const openEditor = (row?: ConfigurationRow) => { setFormError(""); setEditor({ row, values: Object.fromEntries(config.fields.map(({ key }) => [key, String(row?.[key] ?? "")])) }) }
  const serialize = (values: Record<string, string>) => Object.fromEntries(config.fields.map(({ key, type }) => [key, type === "boolean" ? values[key] === "true" : type === "number" ? Number(values[key] || 0) : values[key]]))
  async function save() { if (!editor) return; const missing = config.fields.filter((field) => !config.key.includes(field.key) && !editor.values[field.key]?.trim()); if (missing.length) { setFormError(`Preencha: ${missing.map((field) => field.label).join(", ")}.`); return } setFormError(""); try { const data = serialize(editor.values); if (editor.row) await updateConfiguration(resource, config.key.map((key) => String(editor.row?.[key] ?? "")).join("|"), data); else await createConfiguration(resource, data); toast.success("Registro salvo com sucesso"); setEditor(null); await load() } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar") } }
  async function remove(row: ConfigurationRow) { try { await deleteConfiguration(resource, config.key.map((key) => String(row[key] ?? "")).join("|")); toast.success("Registro excluído"); setDeleting(null); await load() } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível excluir") } }

  return <div className="configuration-petrobras flex flex-col gap-5">
    <section className="rounded-2xl border border-[#007f3e]/20 bg-[#007f3e] px-6 py-6 text-white shadow-sm sm:px-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><Badge variant="secondary" className="mb-3 gap-2 bg-[#fdbb30] text-[#003b24]"><Settings2Icon className="size-3.5" /> Central de parâmetros</Badge><h2 className="text-2xl font-semibold tracking-tight">Gerencie os parâmetros com segurança</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">Consulte, pesquise e mantenha os registros desta configuração em um único lugar.</p></div><CheckCircle2Icon className="hidden size-10 text-[#fdbb30] sm:block" /></div></section>
    <Card>
      <CardHeader className="gap-3 pb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Configuração de {config.label.toLowerCase()}</CardTitle>
            <CardDescription className="mt-1">Administre os registros desta seção. Para acessar outra configuração, use o submenu lateral.</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit shrink-0">{config.group}</Badge>
        </div>
        <div className="flex min-h-16 items-center gap-3 rounded-xl border bg-muted/20 px-4 py-3">
          <Settings2Icon className="size-5 text-primary" />
          <p className="text-sm leading-6 text-muted-foreground">{groupDescriptions[config.group]}</p>
        </div>
      </CardHeader>
    </Card>
    <Card className="overflow-hidden"><CardHeader className="border-b bg-muted/20 pb-4"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">Registros cadastrados</p><CardTitle>{config.label}</CardTitle><CardDescription className="mt-1">{rows.length} registros · {activeRows.length} ativos · Exibindo os principais campos</CardDescription></div><Button onClick={() => openEditor()}><PlusIcon data-icon="inline-start" />Criar registro</Button></div><div className="mt-4 flex items-center gap-3 rounded-lg border bg-background px-3"><SearchIcon className="size-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Filtrar ${config.label.toLowerCase()}...`} className="border-0 bg-transparent shadow-none focus-visible:ring-0" /><Badge variant="secondary">{filteredRows.length}</Badge></div></CardHeader><CardContent className="p-0">{loading ? <p className="p-12 text-center text-sm text-muted-foreground">Carregando registros...</p> : filteredRows.length === 0 ? <p className="p-12 text-center text-sm text-muted-foreground">Nenhum registro encontrado. Ajuste a busca ou crie um novo registro.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow>{config.fields.slice(0, 5).map((field) => <TableHead key={field.key}>{field.label}</TableHead>)}<TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{filteredRows.map((row, index) => <TableRow key={config.key.map((key) => String(row[key] ?? index)).join("-")}>{config.fields.slice(0, 5).map((field) => <TableCell key={field.key} className="max-w-56 truncate">{formatValue(row[field.key])}</TableCell>)}<TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label="Visualizar registro" onClick={() => setViewing(row)}><EyeIcon /></Button><Button variant="ghost" size="icon" aria-label="Editar registro" onClick={() => openEditor(row)}><PencilIcon /></Button><Button variant="ghost" size="icon" aria-label="Excluir registro" onClick={() => setDeleting(row)}><Trash2Icon /></Button></div></TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card>
    <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}><DialogContent><DialogHeader><DialogTitle>Visualizar — {config.label}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2">{config.fields.map((field) => <div key={field.key} className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{field.label}</p><p className="mt-1 break-words text-sm font-medium">{formatValue(viewing?.[field.key])}</p></div>)}</div></DialogContent></Dialog>
    <Dialog open={editor !== null} onOpenChange={(open) => !open && setEditor(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editor?.row ? "Editar" : "Criar"} — {config.label}</DialogTitle><CardDescription>Preencha os parâmetros e salve a alteração.</CardDescription></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2">{config.fields.map((item) => <div className="flex flex-col gap-2" key={item.key}><Label htmlFor={`config-${item.key}`}>{item.label}</Label>{item.type === "boolean" ? <Select value={editor?.values[item.key] || "false"} onValueChange={(value) => setEditor((current) => current && { ...current, values: { ...current.values, [item.key]: value ?? "" } })}><SelectTrigger id={`config-${item.key}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Ativo / Sim</SelectItem><SelectItem value="false">Inativo / Não</SelectItem></SelectContent></Select> : <Input id={`config-${item.key}`} type={item.type === "number" ? "number" : "text"} disabled={Boolean(editor?.row && config.key.includes(item.key))} value={editor?.values[item.key] ?? ""} onChange={(event) => setEditor((current) => current && { ...current, values: { ...current.values, [item.key]: event.target.value } })} />}</div>)}</div>{formError ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p> : null}<DialogFooter><Button variant="outline" onClick={() => setEditor(null)}>Cancelar</Button><Button onClick={() => void save()}>Salvar</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir este registro?</AlertDialogTitle><AlertDialogDescription>Essa ação removerá o registro de {config.label.toLowerCase()}. Não será possível desfazê-la.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleting && void remove(deleting)}>Excluir registro</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}

export const configurationResourceLabels = resources
export const configurationResources = resourceList

