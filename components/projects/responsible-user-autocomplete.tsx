"use client"

import useSWR from "swr"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { searchResponsibleCandidates } from "@/lib/api-client"

export function ResponsibleUserAutocomplete({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const query = value.trim()
  const { data } = useSWR(
    query.length >= 1 ? ["responsible-user-candidates", query] : null,
    () => searchResponsibleCandidates(query),
    { keepPreviousData: true }
  )
  const suggestionsId = "responsible-user-suggestions"

  return (
    <Field>
      <FieldLabel htmlFor="gestor">Responsável pela área de rede</FieldLabel>
      <Input
        id="gestor"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Informe a chave do responsável"
        list={suggestionsId}
        maxLength={80}
        autoComplete="off"
        required
      />
      <datalist id={suggestionsId}>
        {(data ?? []).map((candidate) => (
          <option key={candidate.userId} value={candidate.userId} />
        ))}
      </datalist>
      <FieldDescription>
        A chave da sua sessão vem preenchida. Você pode apagá-la e buscar outra
        chave cadastrada.
      </FieldDescription>
    </Field>
  )
}
