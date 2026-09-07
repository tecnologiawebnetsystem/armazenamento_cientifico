from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "docs" / "SIGAC-ER-Auditoria.pdf"


def esc(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def page_stream(page: int) -> bytes:
    lines = []
    lines += ["q", "0.96 0.98 0.97 rg", "0 0 595 842 re", "f", "Q"]
    lines += ["0.00 0.35 0.25 rg", "BT", "/F1 22 Tf", "42 790 Td", f"({esc('SIGAC — Modelo Entidade-Relacionamento')}) Tj", "ET"]
    lines += ["0.30 0.40 0.37 rg", "BT", "/F1 10 Tf", "42 770 Td", f"({esc('Auditoria de schema | Página ' + str(page))}) Tj", "ET"]
    return "\n".join(lines).encode("latin-1", "replace")


def diagram_page() -> bytes:
    commands = ["q", "0.96 0.98 0.97 rg", "0 0 595 842 re", "f", "Q", "0.00 0.35 0.25 rg"]
    boxes = [
        (35, 610, 160, 95, "IDENTIDADE", ["profiles  PK id", "users  PK id", "sessions  PK id"]),
        (215, 610, 160, 95, "AUTORIZAÇÃO", ["modules  PK id", "permissions  PK id", "profile_permissions  PK/FK"]),
        (395, 610, 160, 95, "NAVEGAÇÃO", ["profile_modules  PK/FK", "menus  PK id"]),
        (35, 430, 160, 110, "PROJETOS", ["projects  PK id", "project_members  PK/FK", "project_groups  PK/FK"]),
        (215, 430, 160, 110, "GRUPOS", ["groups  PK id", "user_groups  PK/FK", "project_access_roles"]),
        (395, 430, 160, 110, "DOCUMENTOS", ["files  PK id", "file_shares  PK/FK", "file_permissions"]),
        (35, 225, 160, 105, "FLUXOS", ["access_requests  PK id", "notifications  PK id"]),
        (215, 225, 160, 105, "AUDITORIA", ["activity_logs  PK id", "user_id  FK users"]),
        (395, 225, 160, 105, "RELATÓRIOS", ["report_types  PK id", "report_fields  PK id"]),
    ]
    for x, y, w, h, title, rows in boxes:
        commands += ["0.90 0.96 0.94 rg", f"{x} {y} {w} {h} re", "f", "0.00 0.45 0.32 RG", "1 w", f"{x} {y} {w} {h} re", "S"]
        commands += ["0.00 0.35 0.25 rg", "BT", "/F1 11 Tf", f"{x + 10} {y + h - 18} Td", f"({esc(title)}) Tj", "ET"]
        for index, row in enumerate(rows):
            commands += ["0.25 0.32 0.30 rg", "BT", "/F1 8 Tf", f"{x + 10} {y + h - 34 - index * 14} Td", f"({esc(row)}) Tj", "ET"]
    commands += ["0.32 0.42 0.39 RG", "0.8 w"]
    for x1, y1, x2, y2 in [(195, 655, 215, 655), (375, 655, 395, 655), (115, 540, 115, 610), (295, 540, 295, 610), (475, 540, 475, 610), (195, 275, 215, 275), (375, 275, 395, 275)]:
        commands.append(f"{x1} {y1} m {x2} {y2} l S")
    commands += ["0.30 0.40 0.37 rg", "BT", "/F1 9 Tf", "42 160 Td", f"({esc('PK = chave primária   FK = chave estrangeira   UK = única   PK/FK = associação N:N')}) Tj", "ET"]
    return "\n".join(commands).encode("latin-1", "replace")


def dictionary_page() -> bytes:
    entries = [
        "profiles / users: identidade local e perfil funcional.",
        "modules / permissions: módulos navegáveis e capacidades autorizáveis.",
        "projects / project_members / project_groups: unidade de trabalho e escopos de acesso.",
        "files / file_shares / file_permissions: árvore documental e compartilhamento.",
        "access_requests / notifications: fluxo de solicitação e comunicação.",
        "activity_logs: trilha de auditoria com ação, entidade e data.",
        "report_types / report_fields: configuração de relatórios e campos.",
        "sessions / permission_matrix: sessão persistida e compatibilidade de autorização.",
        "ON DELETE CASCADE remove dependentes; RESTRICT protege referências; SET NULL preserva o registro.",
        "Fonte editável: backend/docs/SIGAC-ER-Auditoria.mmd",
        "Fonte detalhada: backend/docs/SIGAC-ER-Auditoria.md",
    ]
    commands = ["q", "1 1 1 rg", "0 0 595 842 re", "f", "Q", "0.00 0.35 0.25 rg", "BT", "/F1 18 Tf", "42 790 Td", f"({esc('Dicionário de dados e regras')}) Tj", "ET"]
    for index, line in enumerate(entries):
        commands += ["0.20 0.26 0.24 rg", "BT", "/F1 10 Tf", f"42 {750 - index * 34} Td", f"({esc(line)}) Tj", "ET"]
    return "\n".join(commands).encode("latin-1", "replace")


def build_pdf(streams: list[bytes]) -> bytes:
    objects: list[bytes] = []
    page_ids = [3 + i * 2 for i in range(len(streams))]
    objects.append(f"<< /Type /Catalog /Pages 2 0 R >>".encode())
    objects.append(f"<< /Type /Pages /Kids [{' '.join(f'{x} 0 R' for x in page_ids)}] /Count {len(page_ids)} >>".encode())
    for index, stream in enumerate(streams):
        page_id = 3 + index * 2
        content_id = page_id + 1
        objects.append(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 {3 + len(streams) * 2} 0 R >> >> /Contents {content_id} 0 R >>".encode())
        objects.append(b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream")
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for number, obj in enumerate(objects, 1):
        offsets.append(len(pdf))
        pdf.extend(f"{number} 0 obj\n".encode() + obj + b"\nendobj\n")
    startxref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{startxref}\n%%EOF".encode())
    return bytes(pdf)


OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_bytes(build_pdf([diagram_page(), page_stream(2), dictionary_page()]))
print(f"Gerado: {OUT} ({OUT.stat().st_size} bytes)")
