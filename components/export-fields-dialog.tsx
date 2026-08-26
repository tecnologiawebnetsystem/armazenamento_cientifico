"use client"

import { useState } from "react"
import { DownloadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export type ExportField = { key: string; label: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  format: "csv" | "txt"
  title: string
  fields: ExportField[]
  defaultFields?: string[]
  onConfirm: (fields: string[]) => void
}

export function ExportFieldsDialog({ open, onOpenChange, format, title, fields, defaultFields, onConfirm }: Props) {
  const [selected, setSelected] = useState<string[]>(defaultFields ?? fields.map((field) => field.key))
  const toggle = (key: string, checked: boolean) => setSelected((current) => checked ? [...new Set([...current, key])] : current.filter((item) => item !== key))
  const confirm = () => { if (selected.length) { onConfirm(selected); onOpenChange(false) } }
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader><DialogTitle>Escolha os campos</DialogTitle><DialogDescription>Selecione as colunas que serão incluídas no arquivo {format.toUpperCase()} de {title}.</DialogDescription></DialogHeader>
      <div className="grid gap-3 py-2 sm:grid-cols-2">
        {fields.map((field) => <label key={field.key} className="flex items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"><Checkbox checked={selected.includes(field.key)} onCheckedChange={(checked) => toggle(field.key, checked === true)} /><span>{field.label}</span></label>)}
      </div>
      {!selected.length && <p className="text-sm text-destructive">Selecione pelo menos um campo.</p>}
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={confirm} disabled={!selected.length}><DownloadIcon data-icon="inline-start" />Gerar {format.toUpperCase()}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

