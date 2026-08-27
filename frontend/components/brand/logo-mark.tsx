import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * Marca da plataforma: ícone institucional Petrobras (verde e amarelo).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-block size-8 overflow-hidden rounded-md bg-white p-1", className)}>
      <Image
        src="/images/petrobras-logo.png"
        alt="Símbolo da Petrobras"
        fill
        sizes="40px"
        className="object-contain p-0.5"
        priority
      />
    </span>
  )
}

/**
 * Logotipo completo (ícone + wordmark) para cabeçalhos e telas de login.
 */
export function LogoFull({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-block h-9 w-44 overflow-hidden rounded-md bg-white px-2 py-1", className)}>
      <Image
        src="/images/petrobras-full-logo.png"
        alt="Petrobras"
        fill
        sizes="220px"
        className="object-contain object-left p-1"
        priority
      />
    </span>
  )
}
