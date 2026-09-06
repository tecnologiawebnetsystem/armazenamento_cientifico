const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3000"

async function assertPage(path, expected, label) {
  const response = await fetch(`${baseURL}${path}`)
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`)
  const html = await response.text()
  for (const text of expected) {
    if (!html.includes(text)) throw new Error(`${label}: conteúdo ausente: ${text}`)
  }
}

await assertPage("/login", ["Login Corporativo"], "login")
console.log("Wiki Dev: documentação mantida em wiki-dev.md")
console.log("Frontend smoke tests: OK")
