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
        {principalType === "group" ? "ID do grupo (Entra ID)" : "ID da role"}
      </FieldLabel>
      <Input
        id={id}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value
          onChange(nextValue)
          const match = options.find(
            (item) =>
              item.identifier.toLocaleLowerCase() ===
              nextValue.trim().toLocaleLowerCase()
          )
          if (match) onSelect(match.groupName)
        }}
        placeholder="Busque por nome ou informe o identificador"
        list={`${id}-suggestions`}
        maxLength={256}
        required
        autoComplete="off"
      />
      <datalist id={`${id}-suggestions`}>
        {options.map((item) => (
          <option
            key={item.id}
            value={item.identifier}
            label={item.groupName}
          />
        ))}
      </datalist>
      <FieldDescription>
        {selected
          ? `Encontrado: ${selected.groupName}.`
          : "Digite para ver sugestões do catálogo."}
      </FieldDescription>
    </Field>
  )
}
