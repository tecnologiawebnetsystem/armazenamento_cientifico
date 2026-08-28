"use client"

import { useState } from "react"
import { CheckIcon, DownloadIcon, FileTextIcon, FileSpreadsheetIcon, FileType2Icon } from "lucide-react"
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

// Ajuste visual rápido da modal: teste estes dois valores aos poucos.
// Largura: max-w-4xl, max-w-5xl, max-w-6xl ou max-w-7xl.
export const EXPORT_DIALOG_WIDTH_CLASS = "max-w-none sm:w-[min(96vw,80rem)]"
// Altura: use min-h-[70vh] max-h-[92vh] e ajuste os percentuais conforme necessário.
export const EXPORT_DIALOG_HEIGHT_CLASS = "min-h-[78vh] max-h-[94vh]"

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
    <DialogContent className={`${EXPORT_DIALOG_HEIGHT_CLASS} flex w-[calc(100%-1rem)] ${EXPORT_DIALOG_WIDTH_CLASS} flex-col overflow-hidden border-petrobras-blue/15 bg-gradient-to-br from-background via-background to-petrobras-green/5 p-4 shadow-[0_24px_80px_-32px_rgba(0,88,140,0.5)] sm:w-[min(96vw,80rem)] sm:p-8`}>
      <DialogHeader className="rounded-xl border border-petrobras-yellow/30 bg-gradient-to-r from-petrobras-green via-petrobras-teal to-petrobras-blue px-5 py-4 text-primary-foreground shadow-lg shadow-petrobras-blue/20">
        <DialogTitle className="flex items-center gap-2 text-xl text-primary-foreground"><DownloadIcon data-icon="inline-start" />Configurar exportação</DialogTitle>
        <DialogDescription className="text-primary-foreground/85">Escolha os formatos e os campos do {title} que serão gerados.</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto py-2 pr-2">
        <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3" aria-labelledby="export-format-title">
          <div><h3 id="export-format-title" className="font-semibold">Formato do arquivo</h3><p className="text-sm text-muted-foreground">Você pode selecionar mais de um formato.</p></div>
          <div className="grid gap-3 sm:grid-cols-3">
            {formats.map(({ key, label, description, icon: Icon }) => {
              const active = selectedFormats.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleFormat(key)}
                  aria-pressed={active}
                  className={active ? "flex items-start gap-3 rounded-lg border border-petrobras-green bg-petrobras-green/10 p-3 text-left transition-colors" : "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"}
                >
                  <span className={active ? "flex size-9 shrink-0 items-center justify-center rounded-md bg-petrobras-green text-primary-foreground" : "flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"}>
                    {active ? <CheckIcon aria-hidden="true" /> : <Icon aria-hidden="true" />}
                  </span>
                  <span>
                    <span className="block font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{description}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
        <section className="flex flex-col gap-3" aria-labelledby="export-fields-title">
          <div><h3 id="export-fields-title" className="font-semibold">Campos incluídos</h3><p className="text-sm text-muted-foreground">Selecione pelo menos um campo para cada arquivo.</p></div>
          <div className="grid max-h-80 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {fields.map((field) => <label key={field.key} className="flex cursor-pointer items-center gap-3 rounded-md p-2 text-sm hover:bg-muted/50"><Checkbox checked={selectedFields.includes(field.key)} onCheckedChange={(checked) => toggleField(field.key, checked === true)} /><span>{field.label}</span></label>)}
          </div>
        </section>
        </div>
      </div>
      {(!selectedFields.length || !selectedFormats.length) && <p className="text-sm text-destructive">Selecione ao menos um formato e um campo.</p>}
      <DialogFooter className="border-t border-petrobras-yellow/25 pt-4"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={confirm} disabled={!selectedFields.length || !selectedFormats.length} className="bg-gradient-to-r from-petrobras-green via-petrobras-teal to-petrobras-yellow text-primary-foreground shadow-md shadow-petrobras-yellow/25 hover:brightness-105"><DownloadIcon data-icon="inline-start" />Gerar arquivos</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

export function ExportButton({ onClick }: { onClick: () => void }) {
  return <Button onClick={onClick} className="bg-gradient-to-r from-petrobras-green via-petrobras-teal to-petrobras-blue text-primary-foreground shadow-sm hover:opacity-90"><DownloadIcon data-icon="inline-start" />Exportar</Button>
}
