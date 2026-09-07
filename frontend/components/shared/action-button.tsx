"use client"

import type { ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import type { Capability } from "@/hooks/use-permissions"
import { hasCapability } from "@/hooks/use-permissions"
import type { Role } from "@/lib/types"

interface ActionButtonProps extends Omit<ComponentProps<typeof Button>, "role"> {
  role?: Role | string | null
  capability: Capability
}

export function ActionButton({ role, capability, children, ...props }: ActionButtonProps) {
  if (!hasCapability(role, capability)) return null
  return <Button {...props}>{children}</Button>
}
