"use client"

import type { ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import type { Capability } from "@/hooks/use-permissions"
import { hasCapability } from "@/hooks/use-permissions"
interface ActionButtonProps extends ComponentProps<typeof Button> {
  permissions?: string[]
  capability: Capability
}

export function ActionButton({ permissions, capability, children, ...props }: ActionButtonProps) {
  if (!hasCapability(permissions, capability)) return null
  return <Button {...props}>{children}</Button>
}
