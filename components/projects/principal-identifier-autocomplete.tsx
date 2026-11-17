"use client"

import useSWR from "swr"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { searchProjectGroupsCatalog } from "@/lib/api-client"

export function PrincipalIdentifierAutocomplete({
  id,
  principalType,
  value,
  onChange,
  onSelect,
}: {
  id: string
  principalType: "group" | "role"
  value: string
  onChange: (value: string) => void
  onSelect: (groupName: string) => void
}) {
  const query = value.trim()
  const { data } = useSWR(
    query.length >= 2 ? ["project-group-catalog", principalType, query] : null,
    () => searchProjectGroupsCatalog(query, principalType),
    { keepPreviousData: true }
  )
  const options = data ?? []
  const selected = options.find(
    (item) => item.identifier.toLocaleLowerCase() === query.toLocaleLowerCase()
  )

  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {principalType === "group" ? "Object ID do Entra ID" : "Identificador do role"}
      </FieldLabel>
      <Input
        id={id}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value
          onChange(nextValue)
          const match = options.find(
            (item) => item.identifier.toLocaleLowerCase() === nextValue.trim().toLocaleLowerCase()
          )
          if (match) onSelect(match.groupName)
        }}
        placeholder={
          principalType === "group"
            ? "Digite para buscar um grupo existente"
            : "Digite para buscar um role existente"
        }
        list={`${id}-suggestions`}
        maxLength={256}
        required
        autoComplete="off"
      />
      <datalist id={`${id}-suggestions`}>
        {options.map((item) => (
          <option key={item.id} value={item.identifier} label={item.groupName} />
        ))}
      </datalist>
      <FieldDescription>
        {selected
          ? `Identificador encontrado: ${selected.groupName}. O cadastro e o nível de acesso serão próprios deste projeto.`
          : "Sugestões mostram identificadores cadastrados em outros projetos; o cadastro será criado para este projeto."}
      </FieldDescription>
    </Field>
  )
}
