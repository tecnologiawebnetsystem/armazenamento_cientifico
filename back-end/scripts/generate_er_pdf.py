from __future__ import annotations

import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
)

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = ROOT / "back-end/database/postgresql-schema.sql"
OUTPUT = ROOT / "docs/SIGAC-modelo-dados.pdf"
LOGO = ROOT / "public/images/petrobras-full-logo.png"
PAGE = landscape(A4)
GREEN = colors.HexColor("#007F3E")
DARK = colors.HexColor("#0B253E")
PALE = colors.HexColor("#E8F1EC")
MUTED = colors.HexColor("#557064")


def parse_schema(text: str) -> list[dict]:
    tables = []
    for match in re.finditer(r"CREATE TABLE(?: IF NOT EXISTS)?\s+([\w]+)\s*\((.*?)\);", text, re.IGNORECASE | re.DOTALL):
        name, body = match.groups()
        columns, pks, fks = [], [], []
        for raw in re.split(r",(?=\s*[A-Za-z_][\w]*\s)", body):
            line = raw.strip().rstrip(",")
            if not line:
                continue
            fk = re.search(r"FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s+([\w]+)\s*\(([^)]+)\)", line, re.IGNORECASE)
            pk = re.search(r"PRIMARY KEY\s*\(([^)]+)\)", line, re.IGNORECASE)
            if pk:
                pks.extend(column.strip() for column in pk.group(1).split(","))
            if line.upper().startswith(("CONSTRAINT", "PRIMARY KEY", "FOREIGN KEY", "UNIQUE", "CHECK")):
                if fk:
                    local_columns = [column.strip() for column in fk.group(1).split(",")]
                    target_columns = [column.strip() for column in fk.group(3).split(",")]
                    fks.extend(zip(local_columns, [fk.group(2)] * len(local_columns), target_columns))
                continue
            bits = line.split()
            if len(bits) < 2:
                continue
            col, typ = bits[0], bits[1]
            columns.append((col, typ, "NOT NULL" in line.upper()))
            if "PRIMARY KEY" in line.upper():
                pks.append(col)
            if fk:
                fks.append((col, fk.group(1), fk.group(2).strip()))
        tables.append({"name": name, "columns": columns, "pks": pks, "fks": fks})
    return tables


class ERPage(Flowable):
    def __init__(self, tables):
        super().__init__()
        self.tables = tables
        self.width = 257 * mm
        self.height = 150 * mm

    def wrap(self, avail_width, avail_height):
        return self.width, self.height

    def draw(self):
        canvas = self.canv
        box_w, gap = 61 * mm, 6 * mm
        top = self.height - 4 * mm
        positions = {}
        for index, table in enumerate(self.tables):
            x = index * (box_w + gap)
            visible = min(len(table["columns"]), 14)
            box_h = (visible + 2) * 5.3 * mm
            y = top - box_h
            positions[table["name"]] = (x, y, box_w, box_h)
            canvas.setStrokeColor(DARK)
            canvas.setLineWidth(0.6)
            canvas.setFillColor(colors.white)
            canvas.rect(x, y, box_w, box_h, fill=1, stroke=1)
            canvas.setFillColor(PALE)
            canvas.rect(x, y + box_h - 11 * mm, box_w, 11 * mm, fill=1, stroke=0)
            canvas.setFillColor(DARK)
            canvas.setFont("Helvetica-Bold", 8.5)
            canvas.drawCentredString(x + box_w / 2, y + box_h - 7.2 * mm, table["name"].upper())
            row_y = y + box_h - 17 * mm
            for col, typ, required in table["columns"][:visible]:
                label = f"PK {col} : {typ}" if col in table["pks"] else f"{col} : {typ}"
                if required and col not in table["pks"]:
                    label += " *"
                canvas.setFillColor(DARK if col in table["pks"] else colors.HexColor("#30443A"))
                canvas.setFont("Helvetica-Bold" if col in table["pks"] else "Helvetica", 6.8)
                canvas.drawString(x + 3 * mm, row_y, label[:39])
                row_y -= 5.3 * mm
            if len(table["columns"]) > visible:
                canvas.setFont("Helvetica-Oblique", 6.5)
                canvas.setFillColor(MUTED)
                canvas.drawString(x + 3 * mm, y + 3 * mm, f"+ {len(table['columns']) - visible} campos")
        for table in self.tables:
            x, y, w, h = positions[table["name"]]
            for _, target, _ in table["fks"]:
                if target in positions:
                    tx, ty, _, th = positions[target]
                    canvas.setStrokeColor(GREEN)
                    canvas.setLineWidth(0.8)
                    canvas.line(x + w, y + h / 2, tx, ty + th / 2)


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = PAGE
    canvas.setStrokeColor(GREEN)
    canvas.setLineWidth(1.2)
    canvas.line(16 * mm, height - 17 * mm, width - 16 * mm, height - 17 * mm)
    if LOGO.exists():
        canvas.drawImage(str(LOGO), 16 * mm, height - 14 * mm, width=31 * mm, height=7 * mm, preserveAspectRatio=True, mask="auto")
    canvas.setFillColor(DARK)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(51 * mm, height - 11.5 * mm, "SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(16 * mm, 9 * mm, "Tabelas e campos · fonte: back-end/database/postgresql-schema.sql")
    canvas.drawRightString(width - 16 * mm, 9 * mm, f"Página {doc.page}")
    canvas.restoreState()


def main():
    tables = parse_schema(SCHEMA.read_text(encoding="utf-8"))
    if not tables:
        raise RuntimeError("Schema vazio: nenhum CREATE TABLE foi encontrado")
    styles = getSampleStyleSheet()
    title = ParagraphStyle("title", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=22, textColor=DARK, spaceAfter=8)
    body = ParagraphStyle("body", parent=styles["BodyText"], fontSize=10, leading=15, textColor=MUTED)
    frame = Frame(16 * mm, 18 * mm, PAGE[0] - 32 * mm, PAGE[1] - 40 * mm, id="normal")
    doc = BaseDocTemplate(str(OUTPUT), pagesize=PAGE, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=24 * mm, bottomMargin=18 * mm, title="SIGAC — Modelo de dados")
    doc.addPageTemplates([PageTemplate(id="main", frames=frame, onPage=header_footer)])
    story = [Spacer(1, 18 * mm), Paragraph("SIGAC — Tabelas e campos", title), Paragraph("Inventário das tabelas utilizadas pelo SiGAC no PostgreSQL, com campos físicos, chaves primárias, chaves estrangeiras e diagrama visual dos relacionamentos.", body), Spacer(1, 12 * mm), Paragraph(f"Tabelas: {len(tables)}", title), Paragraph("Legenda: PK = chave primária; * = campo obrigatório; linhas verdes = relacionamentos FK.", body), PageBreak()]
    for i in range(0, len(tables), 3):
        group = tables[i:i + 3]
        story += [Paragraph(f"Diagrama ER visual · tabelas {i + 1}–{i + len(group)} de {len(tables)}", title), Spacer(1, 5 * mm), ERPage(group)]
        if i + 3 < len(tables):
            story.append(PageBreak())
    story += [PageBreak(), Paragraph("Inventário de tabelas e campos", title), Paragraph("Campos físicos, PKs e FKs das tabelas utilizadas pelo SiGAC.", body), Spacer(1, 5 * mm)]
    for table in tables:
        field_lines = []
        fk_by_column = {column: (target, target_column) for column, target, target_column in table["fks"]}
        for column, data_type, required in table["columns"]:
            markers = []
            if column in table["pks"]:
                markers.append("PK")
            if column in fk_by_column:
                target, target_column = fk_by_column[column]
                markers.append(f"FK → {target}.{target_column}")
            if required:
                markers.append("NOT NULL")
            suffix = f" ({'; '.join(markers)})" if markers else ""
            field_lines.append(f"<b>{column}</b> · {data_type}{suffix}")
        story += [Paragraph(f"<b>{table['name']}</b>", body), Paragraph("<br/>".join(field_lines), body), Spacer(1, 5 * mm)]
    doc.build(story)
    print(f"Generated {OUTPUT} with {len(tables)} tables")


if __name__ == "__main__":
    main()
