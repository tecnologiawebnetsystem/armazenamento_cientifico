from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "SIGAC-modelo-dados.pdf"
LOGO = ROOT / "frontend" / "public" / "images" / "petrobras-full-logo.png"

GREEN = colors.HexColor("#007A4D")
DARK = colors.HexColor("#123B2A")
LIGHT = colors.HexColor("#EEF5F1")
MUTED = colors.HexColor("#52635B")


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = doc.pagesize
    canvas.setStrokeColor(GREEN)
    canvas.setLineWidth(1.2)
    canvas.line(doc.leftMargin, height - 22 * mm, width - doc.rightMargin, height - 22 * mm)
    if LOGO.exists():
        canvas.drawImage(str(LOGO), doc.leftMargin, height - 19 * mm, width=28 * mm, height=8 * mm, preserveAspectRatio=True, mask="auto")
    canvas.setFillColor(DARK)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(doc.leftMargin + 35 * mm, height - 16 * mm, "SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(width - doc.rightMargin, 13 * mm, f"SIGAC | Modelo de dados | {doc.page}")
    canvas.restoreState()


def table_box(title, rows, width=62 * mm):
    data = [[title]] + [[Paragraph(f"<b>{r}</b>" if i == 0 else r, styles["BodyText"])] for i, r in enumerate(rows)]
    t = Table(data, colWidths=[width], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#DCE7E1")),
        ("TEXTCOLOR", (0, 0), (-1, 0), DARK),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#50685D")),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleGreen", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=25, leading=30, textColor=DARK, spaceAfter=8))
styles.add(ParagraphStyle(name="Subtitle", parent=styles["Normal"], fontSize=11, leading=16, textColor=MUTED))
styles.add(ParagraphStyle(name="Section", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=16, textColor=DARK, spaceBefore=4, spaceAfter=12))
styles["BodyText"].fontName = "Helvetica"
styles["BodyText"].fontSize = 8
styles["BodyText"].leading = 10
styles["BodyText"].textColor = DARK


doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=16 * mm, leftMargin=16 * mm, topMargin=30 * mm, bottomMargin=20 * mm, title="SIGAC — Modelo de dados")
story = [
    Spacer(1, 18 * mm),
    Paragraph("SIGAC — Modelo de dados", styles["TitleGreen"]),
    Paragraph("Sistema de Gestão de Acesso ao Armazenamento Científico", styles["Subtitle"]),
    Spacer(1, 16 * mm),
    Paragraph("Documentação técnica do modelo entidade-relacionamento, dicionário de dados e regras de integridade.", styles["BodyText"]),
    PageBreak(),
    Paragraph("Diagrama ER clássico", styles["Section"]),
    Paragraph("Caixas de tabelas, campos e relacionamentos — cada conjunto começa em uma página própria para evitar cortes.", styles["Subtitle"]),
    Spacer(1, 12 * mm),
]

groups = [
    ("Identidade e autorização", [("PROFILES", ["PK id : VARCHAR(40)", "name : VARCHAR(100)", "description : TEXT"]), ("USERS", ["PK id : VARCHAR(40)", "email : VARCHAR(180)", "profile_id : VARCHAR(40) FK"]), ("SESSIONS", ["PK id : VARCHAR(40)", "user_id : VARCHAR(40) FK", "expires_at : TIMESTAMP"])]),
    ("Navegação e permissões", [("MODULES", ["PK id : VARCHAR(40)", "name : VARCHAR(100)"]), ("PERMISSIONS", ["PK id : VARCHAR(40)", "code : VARCHAR(80)"]), ("MENUS", ["PK id : VARCHAR(80)", "route : VARCHAR(180)", "parent_id : VARCHAR(80)"])]),
    ("Projetos e documentos", [("PROJECTS", ["PK id : VARCHAR(40)", "code : VARCHAR(50)", "name : VARCHAR(160)"]), ("PROJECT_MEMBERS", ["PK/FK project_id", "PK/FK user_id", "role : VARCHAR(40)"]), ("FILES", ["PK id : VARCHAR(40)", "project_id : VARCHAR(40) FK", "name : VARCHAR(255)"])]),
    ("Fluxos, auditoria e relatórios", [("ACCESS_REQUESTS", ["PK id : VARCHAR(40)", "project_id : VARCHAR(40) FK", "status : VARCHAR(30)"]), ("ACTIVITY_LOGS", ["PK id : VARCHAR(40)", "user_id : VARCHAR(40) FK", "action : VARCHAR(80)"]), ("REPORT_TYPES", ["PK id : VARCHAR(60)", "code : VARCHAR(60)", "name : VARCHAR(120)"])]),
]
for index, (title, boxes) in enumerate(groups):
    if index:
        story.append(PageBreak())
    story.extend([Paragraph(title, styles["Section"]), Spacer(1, 4 * mm)])
    story.append(Table([[table_box(name, rows) for name, rows in boxes]], colWidths=[58 * mm] * len(boxes), hAlign="LEFT", style=[("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 5)]))
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph("Relacionamentos representados pelas chaves estrangeiras indicadas em cada caixa. PK = chave primária; FK = chave estrangeira; PK/FK = associação.", styles["Subtitle"]))

story.extend([
    PageBreak(),
    Paragraph("Dicionário de dados e regras", styles["Section"]),
    Paragraph("O modelo utiliza identificadores estáveis, relacionamentos explícitos e regras de integridade para preservar histórico e consistência.", styles["Subtitle"]),
    Spacer(1, 8 * mm),
    Paragraph("• ON DELETE CASCADE remove dependentes quando a entidade principal é eliminada.<br/>• RESTRICT protege referências que não podem ser removidas.<br/>• SET NULL preserva o registro dependente quando a referência deixa de existir.<br/>• Campos de auditoria registram usuário, ação, entidade e data da operação.<br/>• Arquivos devem respeitar nome normalizado, MIME permitido e limite de tamanho.", styles["BodyText"]),
])

doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(OUT)
