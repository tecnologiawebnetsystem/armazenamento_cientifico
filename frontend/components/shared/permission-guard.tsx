import type { ReactNode } from "react"
import type { Capability } from "@/hooks/use-permissions"
import { hasCapability } from "@/hooks/use-permissions"
import type { Role } from "@/lib/types"

interface PermissionGuardProps {
  role?: Role | string | null
  capability: Capability
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGuard({ role, capability, children, fallback = null }: PermissionGuardProps) {
  return hasCapability(role, capability) ? children : fallback
}
