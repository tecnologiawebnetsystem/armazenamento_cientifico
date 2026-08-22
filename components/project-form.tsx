'use client'

import { FormEvent, useState } from 'react'
import { Check, ChevronDown, Folder, Plus, X } from 'lucide-react'

const initialForm = {
  name: '',
  code: '',
  area: '',
  snow: '',
  parentFolder: '',
}

const initialTags = {
  managers: ['Mariana Costa'],
  azureWrite: ['GRP-ARMAZENAMENTO-WRITE'],
  azureRead: ['GRP-ARMAZENAMENTO-READ'],
  identityWrite: ['projeto.armazenamento.write'],
  identityRead: ['projeto.armazenamento.read'],
}

type TagKey = keyof typeof initialTags

function TagField({ label, hint, values, onAdd, onRemove }: { label: string; hint: string; values: string[]; onAdd: (value: string) => void; onRemove: (value: string) => void }) {
  const [value, setValue] = useState('')
  function addValue() {
    const clean = value.trim()
    if (clean && !values.includes(clean)) onAdd(clean)
    setValue('')
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-semibold text-foreground">{label}</label>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
        {values.map((item) => (
          <span key={item} className="inline-flex max-w-full items-center gap-1 rounded bg-accent px-2 py-1 font-mono text-xs text-accent-foreground">
            <span className="truncate">{item}</span>
            <button type="button" onClick={() => onRemove(item)} aria-label={`Remover ${item}`} className="rounded-sm hover:bg-muted">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addValue() } }} onBlur={addValue} placeholder="Adicionar item..." className="min-w-32 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
      </div>
    </div>
  )
}

export function ProjectForm() {
  const [form, setForm] = useState(initialForm)
  const [tags, setTags] = useState(initialTags)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function update(field: keyof typeof initialForm, value: string) { setForm((current) => ({ ...current, [field]: value })); setSaved(false) }
  function updateTags(key: TagKey, values: string[]) { setTags((current) => ({ ...current, [key]: values })) }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !form.code.trim() || !form.area || !form.snow.trim() || !form.parentFolder.trim()) { setError('Preencha todos os campos obrigatórios antes de salvar.'); setSaved(false); return }
    setError(''); setSaved(true)
  }
  function reset() { setForm(initialForm); setTags(initialTags); setSaved(false); setError('') }

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2 md:col-span-2">
          <label htmlFor="project-name" className="text-sm font-semibold">Nome do projeto <span className="text-destructive">*</span></label>
          <input id="project-name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Ex.: Plataforma de Dados Científicos" className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="project-code" className="text-sm font-semibold">Código do projeto <span className="text-destructive">*</span></label>
          <input id="project-code" value={form.code} onChange={(e) => update('code', e.target.value.toUpperCase())} placeholder="Ex.: PDC-2025-001" className="h-11 rounded-md border border-input bg-background px-3 font-mono text-sm outline-none transition focus:ring-2 focus:ring-ring" />
          <p className="text-xs text-muted-foreground">Código manual e único para identificação do projeto.</p>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="created-at" className="text-sm font-semibold">Data de criação <span className="text-destructive">*</span></label>
          <input id="created-at" type="date" defaultValue="2025-04-17" className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="area" className="text-sm font-semibold">Área responsável <span className="text-destructive">*</span></label>
          <div className="relative">
            <select id="area" value={form.area} onChange={(e) => update('area', e.target.value)} className="h-11 w-full appearance-none rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring">
              <option value="">Selecione a gerência</option><option>Gerência de Tecnologia</option><option>Gerência de Dados</option><option>Gerência de Pesquisa</option><option>Gerência de Operações</option>
            </select><ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="snow" className="text-sm font-semibold">Tarefa Snow da demanda <span className="text-destructive">*</span></label>
          <input id="snow" value={form.snow} onChange={(e) => update('snow', e.target.value)} placeholder="Ex.: SNTASK0012345" className="h-11 rounded-md border border-input bg-background px-3 font-mono text-sm outline-none transition focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <label htmlFor="parent-folder" className="text-sm font-semibold">Nome da pasta mãe <span className="text-destructive">*</span></label>
          <div className="relative"><Folder className="absolute left-3 top-3 size-4 text-muted-foreground" /><input id="parent-folder" value={form.parentFolder} onChange={(e) => update('parentFolder', e.target.value)} placeholder="Ex.: /dados/projetos/cientificos" className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 font-mono text-sm outline-none transition focus:ring-2 focus:ring-ring" /></div>
        </div>
      </div>
      <div className="h-px bg-border" />
      <div className="flex flex-col gap-2"><h2 className="text-base font-semibold">Acessos e responsabilidades</h2><p className="text-sm leading-6 text-muted-foreground">Informe um ou mais valores. Pressione Enter para criar um novo item.</p></div>
      <div className="grid gap-6 md:grid-cols-2">
        <TagField label="Gestor(es) do projeto" hint="Usuários" values={tags.managers} onAdd={(v) => updateTags('managers', [...tags.managers, v])} onRemove={(v) => updateTags('managers', tags.managers.filter((x) => x !== v))} />
        <TagField label="Grupos Azure AD — escrita" hint="Grupos" values={tags.azureWrite} onAdd={(v) => updateTags('azureWrite', [...tags.azureWrite, v])} onRemove={(v) => updateTags('azureWrite', tags.azureWrite.filter((x) => x !== v))} />
        <TagField label="Grupos Azure AD — leitura" hint="Grupos" values={tags.azureRead} onAdd={(v) => updateTags('azureRead', [...tags.azureRead, v])} onRemove={(v) => updateTags('azureRead', tags.azureRead.filter((x) => x !== v))} />
        <TagField label="Roles do Identidade — escrita" hint="Roles" values={tags.identityWrite} onAdd={(v) => updateTags('identityWrite', [...tags.identityWrite, v])} onRemove={(v) => updateTags('identityWrite', tags.identityWrite.filter((x) => x !== v))} />
        <TagField label="Roles do Identidade — leitura" hint="Roles" values={tags.identityRead} onAdd={(v) => updateTags('identityRead', [...tags.identityRead, v])} onRemove={(v) => updateTags('identityRead', tags.identityRead.filter((x) => x !== v))} />
      </div>
      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {saved && <p role="status" className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary"><Check className="size-4" /> Projeto salvo no mock com sucesso.</p>}
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end"><button type="button" onClick={reset} className="h-11 rounded-md border border-input px-5 text-sm font-semibold transition hover:bg-muted">Cancelar</button><button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"><Plus className="size-4" /> Criar projeto</button></div>
    </form>
  )
}
