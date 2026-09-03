import type { Metadata } from "next"
import { SqlManagerShell } from "@/components/sql-manager/sql-manager-shell"

export const metadata: Metadata = {
  title: "SQL Manager | Petrobras",
  description: "Consulta e manutenção controlada das tabelas do banco do SIGAC.",
}

export default function SqlManagerPage() {
  return <SqlManagerShell />
}
