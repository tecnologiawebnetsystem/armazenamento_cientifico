"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2Icon, SaveIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import useSWR from "swr"
import { getPermissionMatrix, updatePermissionMatrix, ApiError } from "@/lib/api-client"
import { roleLabel } from "@/hooks/use-permissions"
import type { PermissionMatrixEntry } from "@/lib/types"

const capabilities: { key: keyof Omit<PermissionMatrixEntry, "papel">; label: string }[] = [
  { key: "verProjetos", label: "Ver projetos" },
  { key: "criarProjetos", label: "Criar projetos" },
  { key: "editarProjeto", label: "Editar projeto" },
  { key: "excluirProjeto", label: "Excluir projeto" },
  { key: "gerenciarMembros", label: "Gerenciar membros" },
  { key: "uploadArquivos", label: "Enviar arquivos" },
  { key: "excluirArquivos", label: "Excluir arquivos" },
  { key: "compartilharArquivos", label: "Compartilhar arquivos" },
  { key: "aprovarSolicitacoes", label: "Aprovar solicitações" },
]

export function PermissionMatrixEditor() {
  const { data, isLoading } = useSWR("permission-matrix", () => getPermissionMatrix())
  const [matrix, setMatrix] = useState<PermissionMatrixEntry[] | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (data?.matrix && !matrix) setMatrix(data.matrix)
  }, [data, matrix])

  function toggle(papel: string, key: keyof Omit<PermissionMatrixEntry, "papel">) {
    setMatrix((prev) =>
      prev?.map((entry) => (entry.papel === papel ? { ...entry, [key]: !entry[key] } : entry)) ?? prev,
    )
  }

  async function handleSave() {
    if (!matrix) return
    setIsSaving(true)
    try {
      await updatePermissionMatrix(matrix)
      toast.success("Matriz de permissões atualizada.")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível salvar a matriz de permissões."
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alçadas por papel</CardTitle>
        <CardDescription>Admin possui todas as permissões por padrão e não pode ser restringido aqui.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !matrix ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permissão</TableHead>
                {matrix.map((entry) => (
                  <TableHead key={entry.papel} className="text-center">
                    {roleLabel(entry.papel)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {capabilities.map((cap) => (
                <TableRow key={cap.key}>
                  <TableCell className="text-sm font-medium text-foreground">{cap.label}</TableCell>
                  {matrix.map((entry) => (
                    <TableCell key={entry.papel} className="text-center">
                      <Switch
                        checked={entry[cap.key]}
                        disabled={entry.papel === "admin"}
                        onCheckedChange={() => toggle(entry.papel, cap.key)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={handleSave} disabled={!matrix || isSaving}>
          {isSaving ? (
            <Loader2Icon data-icon="inline-start" className="animate-spin" />
          ) : (
            <SaveIcon data-icon="inline-start" />
          )}
          Salvar matriz
        </Button>
      </CardFooter>
    </Card>
  )
}
