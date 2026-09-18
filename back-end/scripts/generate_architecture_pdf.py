from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    HRFlowable,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
)
from reportlab.platypus.tableofcontents import TableOfContents

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "docs/SIGAC-arquitetura.pdf"
LOGO = ROOT / "public/images/petrobras-full-logo.png"

BLUE = colors.HexColor("#063F58")
GREEN = colors.HexColor("#007F3E")
YELLOW = colors.HexColor("#F5C400")
INK = colors.HexColor("#172B36")
MUTED = colors.HexColor("#58707A")
PALE_BLUE = colors.HexColor("#EAF2F6")
PALE_GREEN = colors.HexColor("#EAF5EE")
PALE_YELLOW = colors.HexColor("#FFF8D9")
BORDER = colors.HexColor("#C9D8DE")
PAGE = A4


class ArchitectureDiagram(Flowable):
    def __init__(self, title: str, nodes: list[tuple[str, str, str]], arrows: list[tuple[int, int]], height=82 * mm):
        super().__init__()
        self.title = title
        self.nodes = nodes
        self.arrows = arrows
        self.width = 178 * mm
        self.height = height

    def wrap(self, avail_width, avail_height):
        return self.width, self.height

    def draw(self):
        canvas = self.canv
        canvas.setFillColor(INK)
        canvas.setFont("Helvetica-Bold", 11)
        canvas.drawString(0, self.height - 7 * mm, self.title)
        top = self.height - 19 * mm
        cols = min(3, len(self.nodes))
        gap = 8 * mm
        box_w = (self.width - (cols - 1) * gap) / cols
        box_h = 32 * mm
        positions = []
        for index, (label, detail, tone) in enumerate(self.nodes):
            row, col = divmod(index, cols)
            x = col * (box_w + gap)
            y = top - row * (box_h + 15 * mm) - box_h
            positions.append((x, y))
            fill = {"blue": PALE_BLUE, "green": PALE_GREEN, "yellow": PALE_YELLOW}.get(tone, colors.white)
            canvas.setFillColor(fill)
            canvas.setStrokeColor(BORDER)
            canvas.setLineWidth(0.8)
            canvas.roundRect(x, y, box_w, box_h, 3 * mm, fill=1, stroke=1)
            canvas.setFillColor(BLUE if tone == "blue" else GREEN if tone == "green" else INK)
            canvas.setFont("Helvetica-Bold", 8.5)
            canvas.drawCentredString(x + box_w / 2, y + box_h - 9 * mm, label)
            canvas.setFillColor(MUTED)
            canvas.setFont("Helvetica", 7)
            for line_index, line in enumerate(detail.split("\\n")):
                canvas.drawCentredString(x + box_w / 2, y + box_h - (16 + line_index * 4.5) * mm, line)
        canvas.setStrokeColor(GREEN)
        canvas.setLineWidth(1.2)
        for source, target in self.arrows:
            if source >= len(positions) or target >= len(positions):
                continue
            sx, sy = positions[source]
            tx, ty = positions[target]
            x1 = sx + box_w if tx > sx else sx
            x2 = tx if tx > sx else tx + box_w
            y1 = sy + box_h / 2
            y2 = ty + box_h / 2
            canvas.line(x1, y1, x2, y2)
            canvas.line(x2, y2, x2 - 3 * mm if x2 > x1 else x2 + 3 * mm, y2 + 1.5 * mm)
            canvas.line(x2, y2, x2 - 3 * mm if x2 > x1 else x2 + 3 * mm, y2 - 1.5 * mm)


class ArchitectureDocTemplate(BaseDocTemplate):
    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name in {"H1", "H2"}:
            level = 0 if flowable.style.name == "H1" else 1
            self.canv.bookmarkPage(flowable.getPlainText())
            self.canv.addOutlineEntry(flowable.getPlainText(), flowable.getPlainText(), level=level, closed=False)
            self.notify("TOCEntry", (level, flowable.getPlainText(), self.page))


def styles():
    base = getSampleStyleSheet()
    return {
        "Title": ParagraphStyle("Title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=23, leading=28, textColor=BLUE, alignment=TA_LEFT, spaceAfter=6),
        "Subtitle": ParagraphStyle("Subtitle", parent=base["BodyText"], fontSize=11, leading=16, textColor=MUTED, spaceAfter=8),
        "H1": ParagraphStyle("H1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=BLUE, spaceBefore=8, spaceAfter=8, keepWithNext=1),
        "H2": ParagraphStyle("H2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=GREEN, spaceBefore=8, spaceAfter=5, keepWithNext=1),
        "Body": ParagraphStyle("Body", parent=base["BodyText"], fontName="Helvetica", fontSize=9.2, leading=13.5, textColor=INK, spaceAfter=5),
        "Small": ParagraphStyle("Small", parent=base["BodyText"], fontSize=7.5, leading=10, textColor=MUTED),
        "Callout": ParagraphStyle("Callout", parent=base["BodyText"], fontSize=9, leading=13, textColor=INK, leftIndent=7, rightIndent=7, spaceBefore=5, spaceAfter=7),
        "TOC": ParagraphStyle("TOC", parent=base["BodyText"], fontSize=10, leading=16, textColor=INK),
    }


def P(text, style):
    return Paragraph(text, style)


def bullet(text, s):
    return P(f"• {text}", s)


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = PAGE
    canvas.setStrokeColor(GREEN)
    canvas.setLineWidth(1.1)
    canvas.line(16 * mm, height - 18 * mm, width - 16 * mm, height - 18 * mm)
    if LOGO.exists():
        canvas.drawImage(str(LOGO), 16 * mm, height - 15 * mm, width=31 * mm, height=8 * mm, preserveAspectRatio=True, mask="auto")
    canvas.setFillColor(BLUE)
    canvas.setFont("Helvetica-Bold", 8.5)
    canvas.drawString(51 * mm, height - 12 * mm, "SIGAC — Arquitetura da Solução")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(16 * mm, 9 * mm, "Documento técnico para validação do gestor · versão 2.0 · 2026")
    canvas.drawRightString(width - 16 * mm, 9 * mm, f"Página {doc.page}")
    canvas.restoreState()


def table(data, widths, s):
    formatted = [[P(str(cell), s["Small"]) for cell in row] for row in data]
    t = Table(formatted, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.35, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE_BLUE]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ])
    return t


def main():
    s = styles()
    frame = Frame(16 * mm, 18 * mm, PAGE[0] - 32 * mm, PAGE[1] - 42 * mm, id="main")
    doc = ArchitectureDocTemplate(str(OUTPUT), pagesize=PAGE, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=25 * mm, bottomMargin=18 * mm, title="SIGAC — Arquitetura da Solução", author="SIGAC")
    doc.addPageTemplates([PageTemplate(id="standard", frames=frame, onPage=header_footer)])
    toc = TableOfContents()
    toc.levelStyles = [s["TOC"], ParagraphStyle("TOC2", parent=s["TOC"], leftIndent=14, fontSize=9)]
    story = [
        Spacer(1, 14 * mm),
        P("ARQUITETURA CORPORATIVA", s["Small"]),
        P("SIGAC — Arquitetura da Solução", s["Title"]),
        P("Sistema de Gestão de Acesso ao Armazenamento Científico", s["Subtitle"]),
        P("Baseline técnico para decisão, construção, operação e governança", s["Subtitle"]),
        Spacer(1, 4 * mm),
        table([["Controle do documento", "Valor"], ["Versão", "2.1"], ["Status", "Para validação do gestor e arquitetura"], ["Escopo", "Primeira fase do SIGAC"], ["Autoridade de identidade", "CAV4 — grupos, papéis e permissões"], ["Persistência", "Aurora PostgreSQL"], ["Stack", "Next.js · FastAPI · SQLAlchemy · Alembic"]], [52 * mm, 126 * mm], s),
        Spacer(1, 8 * mm),
        ArchitectureDiagram("Visão executiva", [("Usuário", "Navegador\\nNext.js", "blue"), ("SIGAC", "FastAPI\\nregras e autorização", "green"), ("CAV4", "OIDC\\ identidade corporativa", "yellow"), ("Aurora", "PostgreSQL\\ persistência", "blue")], [(0, 1), (1, 2), (1, 3)]),
        Spacer(1, 5 * mm),
        P("<b>Resumo executivo.</b> O SIGAC é uma aplicação web corporativa com frontend Next.js e backend FastAPI organizado em módulos e camadas. O CAV4 é a autoridade de autenticação e identidade; o Aurora PostgreSQL é a fonte persistente do sistema; o acesso às pastas é consultivo na primeira fase, sem upload ou manipulação de arquivos.", s["Callout"]),
        PageBreak(),
        P("Índice", s["H1"]), toc, PageBreak(),
        P("1. Objetivo e escopo", s["H1"]),
        P("Este documento descreve a arquitetura implementada e as decisões técnicas do SIGAC, servindo como base para validação do gestor, evolução do produto e comunicação com infraestrutura, segurança e desenvolvimento.", s["Body"]),
        P("1.1. Princípios que governam a solução", s["H2"]),
        bullet("CAV4 é a autoridade de identidade: o SIGAC não inventa, ele interpreta os claims corporativos aprovados.", s["Body"]), bullet("Negação por padrão: usuário sem papel reconhecido não recebe acesso por fallback.", s["Body"]), bullet("Backend é a autoridade de autorização: o frontend pode ocultar ações, mas nunca concede permissão.", s["Body"]), bullet("Contratos estáveis: rotas, endpoints e regras de negócio são preservados durante a evolução visual.", s["Body"]), bullet("Observabilidade sem exposição: rastrear operações sem registrar credenciais, tokens ou dados sensíveis.", s["Body"]), bullet("Evolução incremental: separar o que está implementado do que depende de CAV4, DBA, infraestrutura ou decisão do gestor.", s["Body"]),
        P("1.2. Leitura recomendada", s["H2"]),
        P("Gestores podem concentrar-se nas seções 1, 5, 6, 10, 11 e 12. Arquitetura e desenvolvimento devem validar as seções 2, 3, 4 e 7. Segurança e infraestrutura devem validar as seções 5, 9 e 10. O documento não substitui os contratos oficiais do CAV4 nem a aprovação de acesso ao Aurora.", s["Body"]),
        P("<b>Escopo vigente da primeira fase:</b>", s["H2"]),
        bullet("Autenticação corporativa pelo CAV4/OIDC.", s["Body"]), bullet("Consulta de grupos, roles, valores de informação e dados administrativos do usuário no CAV4.", s["Body"]), bullet("Cadastro e gestão de projetos, participantes, status, áreas responsáveis e relatórios conforme endpoints disponíveis.", s["Body"]), bullet("Listagem de pastas existentes no servidor corporativo e exibição de permissões de leitura/escrita.", s["Body"]), bullet("Auditoria de operações relevantes e observabilidade do backend.", s["Body"]),
        P("<b>Fora do escopo da primeira fase:</b> criação, exclusão ou renomeação de pastas; upload, download, edição ou exclusão de arquivos; alteração física de permissões no servidor de armazenamento.", s["Callout"]),
        P("2. Estilo arquitetural", s["H1"]),
        P("O sistema utiliza uma <b>arquitetura em camadas com organização modular por domínio</b> (Layered/Modular Architecture). A separação evita que transporte HTTP, regras de negócio, persistência e integrações externas fiquem misturados.", s["Body"]),
        table([["Camada", "Responsabilidade", "Tecnologia/implementação"], ["Apresentação", "Rotas HTTP, validação de entrada e resposta", "FastAPI routers; Next.js App Router"], ["Aplicação", "Casos de uso e orquestração", "Services por módulo"], ["Domínio", "Entidades, perfis, regras e autorização", "Modelos, schemas e guards"], ["Persistência", "Consultas e transações", "Repositories; SQLAlchemy async"], ["Infraestrutura", "CAV4, Aurora, logs, configuração", "httpx, PostgreSQL/asyncpg, Alembic"]], [34 * mm, 85 * mm, 59 * mm], s),
        Spacer(1, 7 * mm),
        ArchitectureDiagram("Separação de responsabilidades", [("Frontend", "páginas\\componentes\\hooks", "blue"), ("Controllers", "HTTP\\DTOs\\guards", "green"), ("Services", "casos de uso\\regras", "green"), ("Repositories", "persistência\\queries", "blue"), ("Infraestrutura", "CAV4\\Aurora\\logs", "yellow")], [(0, 1), (1, 2), (2, 3), (3, 4)]),
        PageBreak(),
        P("3. Arquitetura do frontend", s["H1"]),
        P("O frontend utiliza Next.js com App Router, componentes React reutilizáveis e uma camada de cliente HTTP centralizada. O layout autenticado protege as páginas da aplicação e compõe sidebar, topbar, conteúdo e rodapé.", s["Body"]),
        table([["Elemento", "Função"], ["app/(app)/layout.tsx", "Layout autenticado, sessão e composição visual"], ["app/(app)/dashboard", "Visão executiva e indicadores"], ["app/(app)/projetos", "Lista, cadastro, detalhe, membros e explorador de pastas"], ["app/(app)/relatorios", "Consulta e exportação de relatórios"], ["app/(app)/logs", "Consulta da trilha de auditoria"], ["components/", "Componentes visuais, guards, formulários e navegação"], ["lib/api-client.ts", "Contrato HTTP único com o backend"], ["lib/types.ts", "Tipos de domínio consumidos pelo frontend"]], [55 * mm, 123 * mm], s),
        P("Princípio adotado: o frontend controla apresentação, experiência e visibilidade inicial dos menus, mas a autorização efetiva deve sempre ser aplicada no backend. Ocultar um menu não substitui uma verificação de permissão na API.", s["Callout"]),
        P("4. Arquitetura do backend", s["H1"]),
        P("O backend é uma aplicação FastAPI modular. Cada domínio possui controllers, services, repositories, schemas e modelos quando necessário. O acesso ao banco deve ficar encapsulado nos repositories; services não devem depender de detalhes de HTTP.", s["Body"]),
        table([["Módulo", "Responsabilidade principal"], ["api/routes", "Autenticação CAV4, diretório CAV4, health e composição das rotas"], ["modules/users", "Usuários, perfis e identidade local"], ["modules/projects", "Projetos, participantes, estados e acesso"], ["modules/files", "Pastas e metadados consultivos"], ["modules/catalogs", "Áreas, perfis, módulos, permissões e catálogos"], ["modules/audit", "Registro e consulta da auditoria"], ["core", "Configuração, autorização, logs, CAV4 e sessões"], ["db", "Engine, modelos SQLAlchemy, seed e base declarativa"]], [55 * mm, 123 * mm], s),
        P("5. Integração e autenticação CAV4", s["H1"]),
        P("O fluxo segue Authorization Code/OIDC: primeiro o backend valida se já existe uma sessão CAV4 válida; nesse caso, resolve o perfil e redireciona diretamente para /dashboard. Sem sessão válida, o SIGAC inicia o login, o CAV4 autentica o usuário, o callback troca o código por tokens, valida o JWT e consulta os endpoints corporativos quando necessário. O backend então cria a sessão e redireciona o navegador para o frontend.", s["Body"]),
        ArchitectureDiagram("Fluxo de autenticação", [("Usuário", "acessa /login", "blue"), ("SIGAC", "gera state\\redireciona", "green"), ("CAV4", "login corporativo\\code", "yellow"), ("Callback", "troca code\\valida JWT", "green"), ("Sessão", "cookie seguro\\dashboard", "blue")], [(0, 1), (1, 2), (2, 3), (3, 4)]),
        P("Endpoints consultivos implementados: grupos do usuário, information-values, dados administrativos, enterprise-groups e roles. Tokens não devem ser gravados em logs. O modo temporário em memória existe para contingência, mas perde sessões ao reiniciar e não é adequado para múltiplas instâncias.", s["Body"]),
        P("6. Autorização e perfis", s["H1"]),
        table([["Perfil", "Responsabilidade e acesso esperado"], ["Administrador", "Governança total: usuários, perfis, menus, permissões, projetos, solicitações e auditoria"], ["Gerente", "Gestão operacional dos projetos sob sua responsabilidade e consulta de pastas/permissões"], ["Patrocinador", "Acompanhamento executivo e aprovação conforme alçada definida"], ["Auditor", "Consulta de projetos, pastas e trilha de auditoria; sem alteração operacional"], ["Solicitante", "Solicitação de acesso e consulta limitada ao escopo concedido"]], [38 * mm, 140 * mm], s),
        P("A fonte futura dos perfis é o CAV4: grupos, roles e information-values devem ser mapeados para os perfis SIGAC em uma regra formal aprovada. Usuários fixos no seed são apenas bootstrap técnico e não devem substituir a identidade corporativa em produção.", s["Callout"]),
        P("6.1. Cadeia de decisão de acesso", s["H2"]),
        ArchitectureDiagram("CAV4 como autoridade", [("CAV4", "autenticação\\nsubject e e-mail", "yellow"), ("SIGAC", "localiza usuário\\ncarrega perfil", "green"), ("Banco", "permissions\\nperfil local", "green"), ("Frontend", "menu e ações\\nexperiência", "blue"), ("API", "guards por endpoint\\nnega no servidor", "blue")], [(0, 1), (1, 2), (2, 3), (2, 4)]),
        P("Nesta fase, o CAV4 autentica e fornece a identidade validada. O e-mail localiza o usuário pré-cadastrado no banco SIGAC; o perfil e as permissões são carregados de users, profiles e profile_permissions. Papéis e grupos presentes nos claims CAV4 são informativos e não bloqueiam o login. A autorização real ocorre novamente em cada endpoint; portanto, alterações no menu não ampliam acesso.", s["Body"]),
        PageBreak(),
        P("7. Modelagem e persistência", s["H1"]),
        P("O modelo relacional utiliza PostgreSQL Aurora, chaves técnicas UUID, relacionamentos por chaves estrangeiras, índices para consultas frequentes e migrations versionadas pelo Alembic. O ORM SQLAlchemy representa a persistência; schemas Pydantic representam contratos de entrada e saída.", s["Body"]),
        ArchitectureDiagram("Modelo lógico resumido", [("users", "identidade local\\perfil", "blue"), ("profiles", "papel e alçada", "green"), ("projects", "projetos\\status\\área", "blue"), ("members", "usuário × projeto", "green"), ("folders", "pastas listadas", "yellow"), ("audit", "trilha de eventos", "yellow")], [(0, 1), (0, 3), (2, 3), (2, 4), (0, 5), (2, 5)]),
        P("Entidades principais: users, profiles, projects, project_members, folders, access_requests, activity_logs, permission_matrix, catálogos e configurações. A modelagem deve permanecer alinhada às migrations aplicadas; o banco é a fonte de verdade do schema físico.", s["Body"]),
        P("8. Pastas e permissões na primeira fase", s["H1"]),
        P("As pastas são listadas do servidor corporativo por integração. O SIGAC apresenta nome, caminho/identificador, projeto, grupos, usuários e nível de acesso quando fornecidos. Leitura e escrita são exibidas como informação de autorização; nenhuma operação física de escrita é executada pelo SIGAC nesta fase.", s["Body"]),
        P("9. Segurança, auditoria e observabilidade", s["H1"]),
        bullet("CORS restrito às origens aprovadas; cookies e sessão com atributos seguros.", s["Body"]), bullet("Queries parametrizadas e validação de entrada.", s["Body"]), bullet("Logs estruturados/legíveis com request_id, método, rota, status e duração.", s["Body"]), bullet("Nunca registrar senha, client secret, access token ou conteúdo sensível do CAV4.", s["Body"]), bullet("Auditar login, logout, alterações de projeto, membros, solicitações, permissões e consultas administrativas.", s["Body"]), bullet("Health check deve diferenciar aplicação disponível de dependência de banco indisponível.", s["Body"]),
        P("10. Deploy e operação", s["H1"]),
        ArchitectureDiagram("Topologia operacional", [("Browser", "usuário corporativo", "blue"), ("Frontend", "Next.js\\Vercel/host", "green"), ("Backend", "FastAPI\\container", "green"), ("Rede", "VPN/VPC\\Security Group", "yellow"), ("Aurora", "PostgreSQL\\schema public/sigac", "blue")], [(0, 1), (1, 2), (2, 3), (3, 4)]),
        P("Migrations devem ser executadas com alembic upgrade head por uma identidade com privilégio controlado. O startup da aplicação não deve criar schema automaticamente. Variáveis de ambiente devem ser injetadas pelo ambiente de execução; segredos não devem ser versionados.", s["Body"]),
        P("11. Decisões, riscos e melhorias", s["H1"]),
        table([["Tema", "Estado atual", "Próximo passo recomendado"], ["Sessão temporária", "Contingência em memória", "Persistir sessão/token de forma segura e remover o modo temporário"], ["CAV4", "OIDC e consultas de diretório", "Formalizar mapeamento de claims/roles para perfis SIGAC"], ["Pastas", "Consulta/listagem", "Definir contrato oficial do servidor e cache somente se aprovado"], ["ORM", "SQLAlchemy + migrations", "Testar metadata contra schema PostgreSQL em CI"], ["Permissões", "Matriz por perfil e guards", "Centralizar policy engine e testes por endpoint"], ["Observabilidade", "Logs com request_id", "Centralizar logs, métricas e alertas operacionais"]], [34 * mm, 64 * mm, 80 * mm], s),
        P("12. Critérios de aceite arquitetural", s["H1"]),
        bullet("O gestor aprova o escopo da primeira fase e confirma que não haverá operações de arquivos/pastas.", s["Body"]), bullet("Infraestrutura confirma conectividade VPN/VPC, Security Group, DNS e porta 5432.", s["Body"]), bullet("DBA aprova schema, grants e execução das migrations.", s["Body"]), bullet("Segurança aprova fluxo CAV4, cookies, CORS, logs e retenção de auditoria.", s["Body"]), bullet("Produto aprova matriz de perfis, menus e permissões.", s["Body"]), bullet("QA valida contratos frontend/backend, autenticação, autorização e principais fluxos.", s["Body"]),
        Spacer(1, 8 * mm), HRFlowable(width="100%", thickness=1, color=GREEN), Spacer(1, 4 * mm), P("Documento preparado a partir da implementação atual do frontend, backend, migrations, modelos, componentes e regras de negócio do SIGAC. Deve ser validado pelo gestor antes de ser considerado baseline oficial.", s["Small"]),
    ]
    doc.build(story)
    print(f"Generated {OUTPUT}")


if __name__ == "__main__":
    main()
