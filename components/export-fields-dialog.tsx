"use client"

import { useState } from "react"
import { CheckIcon, DownloadIcon, FileTextIcon, FileType2Icon, FileSpreadsheetIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export type ExportField = { key: string; label: string }
export type ExportFormat = "csv" | "txt" | "pdf"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  fields: ExportField[]
  defaultFields?: string[]
  defaultFormats?: ExportFormat[]
  onConfirm: (fields: string[], formats: ExportFormat[]) => void
}

const formats: { key: ExportFormat; label: string; description: string; icon: typeof FileTextIcon }[] = [
  { key: "csv", label: "CSV", description: "Para planilhas e análises", icon: FileSpreadsheetIcon },
  { key: "txt", label: "TXT", description: "Texto simples e compatível", icon: FileTextIcon },
  { key: "pdf", label: "PDF", description: "Documento pronto para impressão", icon: FileType2Icon },
]

export function ExportFieldsDialog({ open, onOpenChange, title, fields, defaultFields, defaultFormats = ["csv"] , onConfirm }: Props) {
  const [selectedFields, setSelectedFields] = useState<string[]>(defaultFields ?? fields.map((field) => field.key))
  const [selectedFormats, setSelectedFormats] = useState<ExportFormat[]>(defaultFormats)
  const toggleField = (key: string, checked: boolean) => setSelectedFields((current) => checked ? [...new Set([...current, key])] : current.filter((item) => item !== key))
  const toggleFormat = (key: ExportFormat) => setSelectedFormats((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])
  const confirm = () => { if (selectedFields.length && selectedFormats.length) { onConfirm(selectedFields, selectedFormats); onOpenChange(false) } }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="text-xl">Configurar exportação</DialogTitle>
        <DialogDescription>Escolha os formatos e os campos do {title} que serão gerados.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-6 py-2">
        <section className="flex flex-col gap-3" aria-labelledby="export-format-title">
          <div><h3 id="export-format-title" className="font-semibold">Formato do arquivo</h3><p className="text-sm text-muted-foreground">Você pode selecionar mais de um formato.</p></div>
          <div className="grid gap-3 sm:grid-cols-3">
            {formats.map(({ key, label, description, icon: Icon }) => { const active = selectedFormats.includes(key); return <button key={key} type="button" onClick={() => toggleFormat(key)} aria-pressed={active} className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${active ? "border-petrobras-green bg-petrobras-green/10" : "hover:bg-muted/50"}`}><span className={`flex size-9 shrink-0 items-center justify-center rounded-md ${active ? "bg-petrobras-green text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{active ? <CheckIcon aria-hidden="true" /> : <Icon aria-hidden="true" />}</span><span><span className="block font-medium">{label}</span><span className="block text-xs text-muted-foreground">{description}</span></span></button> })}
          </div>
        </section>
        <section className="flex flex-col gap-3" aria-labelledby="export-fields-title">
          <div><h3 id="export-fields-title" className="font-semibold">Campos incluídos</h3><p className="text-sm text-muted-foreground">Selecione pelo menos um campo para cada arquivo.</p></div>
          <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
            {fields.map((field) => <label key={field.key} className="flex cursor-pointer items-center gap-3 rounded-md p-2 text-sm hover:bg-muted/50"><Checkbox checked={selectedFields.includes(field.key)} onCheckedChange={(checked) => toggleField(field.key, checked === true)} /><span>{field.label}</span></label>)}
          </div>
        </section>
      </div>
      {(!selectedFields.length || !selectedFormats.length) && <p className="text-sm text-destructive">Selecione ao menos um formato e um campo.</p>}
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={confirm} disabled={!selectedFields.length || !selectedFormats.length}><DownloadIcon data-icon="inline-start" />Gerar arquivos</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

export function ExportButton({ onClick }: { onClick: () => void }) {
  return <Button onClick={onClick} className="bg-gradient-to-r from-petrobras-green via-petrobras-teal to-petrobras-blue text-primary-foreground shadow-sm hover:opacity-90"><DownloadIcon data-icon="inline-start" />Exportar</Button>
}
