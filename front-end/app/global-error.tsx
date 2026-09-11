"use client"

import { useEffect } from "react"

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Mantém detalhes técnicos fora da resposta exibida ao usuário.
  }, [])

  return <html lang="pt-BR"><body><main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", fontFamily: "Arial, sans-serif" }}><section style={{ maxWidth: "520px", textAlign: "center" }}><p style={{ fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Erro do sistema</p><h1>Não foi possível carregar a aplicação</h1><p>Tente novamente. Se o problema persistir, contate o administrador.</p><button onClick={reset} style={{ padding: "10px 16px", cursor: "pointer" }}>Tentar novamente</button></section></main></body></html>
}
