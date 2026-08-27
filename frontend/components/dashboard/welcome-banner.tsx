function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Bom dia"
  if (hour < 18) return "Boa tarde"
  return "Boa noite"
}

export function WelcomeBanner({ nome }: { nome: string }) {
  const primeiroNome = nome.split(" ")[0]

  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {greeting()}, {primeiroNome}
      </h2>
      <p className="text-sm text-muted-foreground">
        Acompanhe seus projetos científicos e o armazenamento de dados da plataforma.
      </p>
    </div>
  )
}
