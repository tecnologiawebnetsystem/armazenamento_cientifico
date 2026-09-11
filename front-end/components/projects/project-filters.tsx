"use client"

import { SearchIcon, LayoutGridIcon, ListIcon } from "lucide-react"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export type StatusFilter = "todos" | "ativo" | "concluido" | "suspenso"
export type SortOption = "recentes" | "nome" | "armazenamento"
export type ViewMode = "grade" | "lista"

interface Props {
  search: string
  onSearchChange: (value: string) => void
  status: StatusFilter
  onStatusChange: (value: StatusFilter) => void
  area: string
  onAreaChange: (value: string) => void
  areas: string[]
  sort: SortOption
  onSortChange: (value: SortOption) => void
  view: ViewMode
  onViewChange: (value: ViewMode) => void
}

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "todos", label: "Todos os status" },
  { value: "ativo", label: "Ativo" },
  { value: "concluido", label: "Concluído" },
  { value: "suspenso", label: "Suspenso" },
]

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "recentes", label: "Mais recentes" },
  { value: "nome", label: "Nome (A–Z)" },
  { value: "armazenamento", label: "Maior armazenamento" },
]

export function ProjectFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  area,
  onAreaChange,
  areas,
  sort,
  onSortChange,
  view,
  onViewChange,
}: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-petrobras-blue/15 bg-gradient-to-r from-background via-background to-petrobras-green/5 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <InputGroup className="lg:max-w-xs">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Buscar por nome, área ou código..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </InputGroup>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select value={area} onValueChange={(v) => onAreaChange(v ?? "todas")}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Todas as áreas" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="todas">Todas as áreas</SelectItem>
              {areas.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <ToggleGroup
          value={[view]}
          onValueChange={(v) => v[0] && onViewChange(v[0] as ViewMode)}
          className="hidden sm:flex"
        >
          <ToggleGroupItem value="grade" aria-label="Visualizar em grade">
            <LayoutGridIcon className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="lista" aria-label="Visualizar em lista">
            <ListIcon className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  )
}
