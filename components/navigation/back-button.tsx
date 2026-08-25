"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

type BackButtonProps = {
  fallback?: string
}

export function BackButton({ fallback = "/dashboard" }: BackButtonProps) {
  const router = useRouter()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="w-fit text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-primary"
      onClick={() => {
        if (window.history.length > 1) router.back()
        else router.push(fallback)
      }}
      aria-label="Voltar para a página anterior"
    >
      <ArrowLeft data-icon="inline-start" />
      Voltar
    </Button>
  )
}
