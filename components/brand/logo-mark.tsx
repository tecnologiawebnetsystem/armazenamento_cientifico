import { cn } from "@/lib/utils"

/**
 * Marca da plataforma: hexágono estilizado (referência ao selo Petrobras)
 * em verde institucional com núcleo em amarelo.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-8", className)}
      role="img"
      aria-label="Símbolo da plataforma"
    >
      <path
        d="M20 2 L36 11 V29 L20 38 L4 29 V11 Z"
        className="fill-primary"
      />
      <path d="M20 10 L28 14.5 V23.5 L20 28 L12 23.5 V14.5 Z" className="fill-accent" />
    </svg>
  )
}
