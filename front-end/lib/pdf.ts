import { chromium } from "playwright"

export async function renderPdf(title: string, fields: string[], labels: Record<string, string>, rows: string[][]) {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    const header = fields.map((field) => `<th>${escapeHtml(labels[field] ?? field)}</th>`).join("")
    const body = rows.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`).join("")
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      @page { size: A4 landscape; margin: 18mm 14mm; } body { font-family: Arial, sans-serif; color: #17324d; font-size: 10px; }
      h1 { color: #007f3e; font-size: 20px; margin: 0 0 4px; } p { color: #5c6f7d; margin: 0 0 16px; }
      table { width: 100%; border-collapse: collapse; } th { background: #007f3e; color: white; text-align: left; } th, td { border: 1px solid #d6dee5; padding: 7px; vertical-align: top; } tr:nth-child(even) { background: #f2f7f5; }
      footer { position: fixed; bottom: -10mm; width: 100%; color: #5c6f7d; font-size: 9px; }
    </style></head><body><h1>${escapeHtml(title)}</h1><p>Exportação SIGAC · Gerado em ${new Date().toLocaleString("pt-BR")}</p><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table><footer>Documento gerado pelo SIGAC</footer></body></html>`, { waitUntil: "load" })
    return await page.pdf({ format: "A4", landscape: true, printBackground: true, preferCSSPageSize: true })
  } finally { await browser.close() }
}

function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;") }
