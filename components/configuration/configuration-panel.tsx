"use client"

import { useMemo, useState } from "react"
import { PencilIcon, PlusIcon, SearchIcon, Settings2Icon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { createConfiguration, deleteConfiguration, getConfigurations, updateConfiguration, type ConfigurationRow, type ConfigurationResource } from "@/lib/api-client"

const groups = [
  { label: "Acesso e navegação", resources: ["menus", "modules", "permissions", "menu_permissions", "profiles", "profile_permissions", "profile_modules"] },
  { label: "Operação", resources: ["project_statuses", "responsible_areas"] },
  { label: "Relatórios", resources: ["report_types", "report_fields"] },
  { label: "Dashboard", resources: ["dashboard_cards"] },
] as const

const labels: Record<string, string> = { menus: "Menus", modules: "Módulos", permissions: "Permissões", menu_permissions: "Permissões de menu", profiles: "Perfis", profile_permissions: "Permissões por perfil", profile_modules: "Módulos por perfil", project_statuses: "Status de projetos", responsible_areas: "Áreas responsáveis", report_types: "Tipos de relatório", report_fields: "Campos de relatório", dashboard_cards: "Cards do dashboard" }
const editableFields: Record<string, string[]> = { menus: ["id", "name", "route", "icon", "display_order", "active"], modules: ["id", "name", "route", "icon", "display_order", "active"], permissions: ["id", "module_id", "name", "description", "active"], profiles: ["id", "name", "description"], project_statuses: ["id", "code", "name", "color", "display_order", "active", "allows_edit"], responsible_areas: ["id", "name", "prefix", "next_number", "active"], report_types: ["id", "code", "name", "description", "formats", "active"], report_fields: ["id", "report_code", "field_key", "label", "source_key", "display_order", "active"], dashboard_cards: ["id", "module_id", "key", "title", "description", "metric_key", "route", "profile_ids", "display_order", "active"] }

function displayValue(value: unknown) { if (typeof value === "boolean") return value ? "Ativo" : "Inativo"; if (value === null || value === undefined || value === "") return "—"; return String(value) }

export function ConfigurationPanel() {
  const [resource, setResource] = useState<ConfigurationResource>("menus")
  const [rows, setRows] = useState<ConfigurationRow[]>([])
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<ConfigurationRow | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const fields = editableFields[resource] ?? []
  const visibleRows = useMemo(() => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [rows, search])

  async function load(nextResource = resource) { setLoading(true); try { setRows(await getConfigurations(nextResource)) } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível carregar a configuração") } finally { setLoading(false) } }
  function selectResource(value: ConfigurationResource) { setResource(value); setSearch(""); void load(value) }
  function openEditor(row?: ConfigurationRow) { const next = row ?? {}; setEditing(row ?? {}); setIsNew(!row); setForm(Object.fromEntries(fields.map((field) => [field, String(next[field] ?? "")]))); }
  async function save() { try { const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, ["active", "allows_edit"].includes(key) ? value === "true" : ["display_order", "next_number"].includes(key) ? Number(value || 0) : value])); if (isNew) await createConfiguration(resource, payload); else if (editing?.id) await updateConfiguration(resource, String(editing.id), payload); toast.success("Configuração salva"); setEditing(null); await load() } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar") } }
  async function remove(row: ConfigurationRow) { if (!row.id || !window.confirm("Excluir este registro?")) return; try { await deleteConfiguration(resource, String(row.id)); toast.success("Registro excluído"); await load() } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível excluir") } }

  return <div className="flex flex-col gap-6">
    <div className="grid gap-3 md:grid-cols-4">{groups.map((group) => <Card key={group.label} className="border-border/70 bg-card/80"><CardHeader className="pb-3"><CardDescription>{group.label}</CardDescription><CardTitle className="text-2xl">{group.resources.length}<span className="ml-2 text-sm font-normal text-muted-foreground">cadastros</span></CardTitle></CardHeader></Card>)}</div>
    <Card className="overflow-hidden border-border/70 shadow-sm"><CardHeader className="border-b bg-muted/20"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2"><Settings2Icon className="size-5 text-primary" /><CardTitle>Central de parametrização</CardTitle></div><CardDescription className="mt-1">Gerencie menus, segurança, relatórios e catálogos operacionais em um só lugar.</CardDescription></div><div className="flex flex-col gap-2 sm:flex-row"><Select value={resource} onValueChange={(value) => selectResource(value as ConfigurationResource)}><SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger><SelectContent>{groups.flatMap((group) => group.resources).map((item) => <SelectItem key={item} value={item}>{labels[item]}</SelectItem>)}</SelectContent></Select><Button onClick={() => openEditor()}><PlusIcon data-icon="inline-start" />Novo registro</Button></div></div></CardHeader><CardContent className="p-0"><div className="flex items-center gap-3 border-b p-4"><SearchIcon className="size-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar em ${labels[resource].toLowerCase()}...`} className="border-0 shadow-none focus-visible:ring-0" /></div><div className="overflow-x-auto">{loading ? <div className="p-8 text-center text-sm text-muted-foreground">Carregando registros...</div> : <Table><TableHeader><TableRow>{fields.map((field) => <TableHead key={field}>{field.replaceAll("_", " ")}</TableHead>)}<TableHead className="w-28 text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{visibleRows.length ? visibleRows.map((row, index) => <TableRow key={String(row.id ?? index)}>{fields.map((field) => <TableCell key={field} className="max-w-64 truncate">{["active", "allows_edit"].includes(field) ? <Badge variant={row[field] ? "default" : "secondary"}>{displayValue(row[field])}</Badge> : displayValue(row[field])}</TableCell>)}<TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => openEditor(row)} aria-label="Editar"><PencilIcon /></Button><Button size="icon" variant="ghost" onClick={() => void remove(row)} aria-label="Excluir"><Trash2Icon /></Button></div></TableCell></TableRow>) : <TableRow><TableCell colSpan={fields.length + 1} className="h-28 text-center text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>}</TableBody></Table>}</div></CardContent></Card>
    <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{isNew ? "Novo registro" : "Editar registro"} — {labels[resource]}</DialogTitle></DialogHeader><div className="grid max-h-[60vh] gap-4 overflow-y-auto py-2 sm:grid-cols-2">{fields.map((field) => <div key={field} className="flex flex-col gap-2"><Label htmlFor={`config-${field}`}>{field.replaceAll("_", " ")}</Label>{["active", "allows_edit"].includes(field) ? <Select value={form[field] || "false"} onValueChange={(value) => setForm((current) => ({ ...current, [field]: value }))}><SelectTrigger id={`config-${field}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Ativo / Sim</SelectItem><SelectItem value="false">Inativo / Não</SelectItem></SelectContent></Select> : <Input id={`config-${field}`} value={form[field] ?? ""} disabled={!isNew && field === "id"} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} />}</div>)}</div><DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={() => void save()}>Salvar alterações</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
