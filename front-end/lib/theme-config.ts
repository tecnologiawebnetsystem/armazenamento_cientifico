import type { Role } from "@/lib/types"

export interface RoleTheme {
  primary: string
  accent: string
  background: string
  text: string
  label: string
}

export const themesByRole: Record<Role, RoleTheme> = {
  admin: { primary: "#1B3B5A", accent: "#E67E22", background: "#F8F9FA", text: "#1B3B5A", label: "Governança total" },
  gerente: { primary: "#2E5C6E", accent: "#F39C12", background: "#EBF5FB", text: "#1B3B5A", label: "Gestão operacional" },
  patrocinador: { primary: "#16A085", accent: "#F1C40F", background: "#EAFAF1", text: "#0E4C3D", label: "Acompanhamento executivo" },
  auditor: { primary: "#7F8C8D", accent: "#95A5A6", background: "#F5F5F5", text: "#2C3E50", label: "Leitura e auditoria" },
  solicitante: { primary: "#3498DB", accent: "#5DADE2", background: "#EBF5FB", text: "#2C3E50", label: "Acesso solicitado" },
}

export function themeForRole(role: Role | string | null | undefined) {
  const normalized = String(role ?? "solicitante").toLowerCase()
  const aliases: Record<string, Role> = { administrador: "admin", gestor: "gerente", sponsor: "patrocinador", viewer: "auditor", requester: "solicitante" }
  return themesByRole[aliases[normalized] ?? (normalized in themesByRole ? normalized as Role : "solicitante")]
}

export function roleThemeStyle(role: Role | string | null | undefined): React.CSSProperties {
  const theme = themeForRole(role)
  return { "--profile-primary": theme.primary, "--profile-accent": theme.accent, "--profile-background": theme.background, "--profile-text": theme.text } as React.CSSProperties
}
