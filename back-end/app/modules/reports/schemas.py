from pydantic import BaseModel, ConfigDict


class ReportFilters(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    status: str | None = None
    area: str | None = None
    gestor_id: str | None = None


class ReportFieldQuery(BaseModel):
    report_code: str


class ReportExportQuery(ReportFilters):
    format: str = "csv"
    fields: str = ""


class ReportResponse(BaseModel):
    filtros: dict
    indicadores: dict
    porArea: list[dict]
    porStatus: list[dict]
    projetos: list[dict]


class ReportFieldResponse(BaseModel):
    reportCode: str
    fields: list[dict]


class AccessRequestCreate(BaseModel):
    projetoId: str
    tipo: str
    papelSolicitado: str
    justificativa: str


class AccessRequestUpdate(BaseModel):
    status: str


class SettingsUpdate(BaseModel):
    values: dict[str, str | int | bool | None]


class SettingsResponse(BaseModel):
    settings: dict[str, str | None]


class AccessRequestResponse(BaseModel):
    request: dict


class AccessRequestListResponse(BaseModel):
    requests: list[dict]


class ReportExportResponse(BaseModel):
    content_type: str
    filename: str
    rows: list[dict]


class ResearchDomainDecision(BaseModel):
    domain: str = "research"
    status: str = "not_implemented"
    rationale: str = "Pesquisas serão criadas somente após requisitos, ownership e modelo de dados aprovados."
    boundaries: list[str] = ["researches", "datasets", "publications", "research_access"]
    dependencies: list[str] = ["projects", "users", "files", "authorization"]


class ReportFieldOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    report_code: str
    field_key: str
    label: str
    source_key: str
    display_order: int
    active: bool


class ReportProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    nome: str
    codigo: str
    areaResponsavel: str | None = None
    status: str
    descricao: str | None = None
    criadoEm: object | None = None
    atualizadoEm: object | None = None
    totalMapas: int = 0
    totalMembros: int = 0


class ReportFiltersOut(BaseModel):
    status: str
    area: str | None = None
    gestorId: str | None = None


class ReportsOut(BaseModel):
    filtros: ReportFiltersOut
    indicadores: dict
    porArea: list[dict]
    porStatus: list[dict]
    projetos: list[dict]


class ReportFieldsOut(BaseModel):
    reportCode: str
    fields: list[dict]


class PlatformContextOut(BaseModel):
    user: dict | None
    permissions: list
    modules: list[dict]
    menus: list[dict]
    dashboardCards: list[dict]


class DashboardOut(BaseModel):
    projects: list[dict]
    totalMembros: int
    totalMapas: int
    armazenamentoMb: int | float
    pendencias: int
    activity: list[dict]
    source: str
    consultedAt: str


class UsersOut(BaseModel):
    users: list[dict]


class CatalogsOut(BaseModel):
    areas: list[dict]
    perfis: list[dict]
    modulos: list[dict]
    permissoes: list[dict]
    statusProjetos: list[dict]
    tiposProjetos: list[dict]
    tiposRelatorios: list[dict]


class FoldersOut(BaseModel):
    folders: list[dict]


class ActivityLogsOut(BaseModel):
    logs: list[dict]
    pagination: dict


class AccessMapOut(BaseModel):
    source: str
    consultedAt: str
    summary: dict
    rows: list[dict]


class AccessRequestOut(BaseModel):
    request: dict


class SettingsOut(BaseModel):
    settings: dict[str, str | None]


class ErrorOut(BaseModel):
    error: str
    message: str
    details: dict = {}
