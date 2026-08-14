import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { findUserById } from "@/lib/store"
import { LoginForm } from "@/components/login/login-form"
import Image from "next/image"
import { FlaskConical } from "lucide-react"

export default async function LoginPage() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (user) redirect("/dashboard")

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 lg:flex">
        <Image
          src="/images/login-hero.png"
          alt=""
          fill
          priority
          className="object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/70 to-sidebar/30" />

        <div className="relative z-10 flex items-center gap-2 text-sidebar-foreground">
          <div className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary">
            <FlaskConical className="size-5 text-sidebar-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">Armazenamento Científico</span>
        </div>

        <div className="relative z-10 max-w-md">
          <blockquote className="space-y-4">
            <p className="text-2xl leading-snug font-medium text-balance text-sidebar-foreground">
              Organize, arquive e compartilhe os dados científicos de cada projeto com segurança e
              rastreabilidade.
            </p>
            <footer className="text-sm text-sidebar-foreground/70">
              Plataforma corporativa de armazenamento científico
            </footer>
          </blockquote>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 text-center lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary">
              <FlaskConical className="size-5 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">Armazenamento Científico</span>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
