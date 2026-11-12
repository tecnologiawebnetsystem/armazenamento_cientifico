export type ServiceNowRequestStatus = "Aberto" | "Em processamento" | "Concluído" | "Falha"
export type AccessOperation = "concessao" | "revogacao"

export interface ServiceNowResponsible {
  name: string
  email: string
  role: string
}

export interface ServiceNowAccessGroup {
  id: string
  name: string
  permission: "Leitura" | "Leitura e gravação"
  currentAccess: "Com acesso" | "Sem acesso"
  members: number
  operation: AccessOperation
  status: "Pendente" | "Concluído"
}

export interface ServiceNowOperationRun {
  status: "Pendente" | "Processando" | "Concluído" | "Falha"
  attempts: number
  attemptedAt?: string
  failureCategory?: "Integração" | "Regra de acesso" | "Permissão"
  message?: string
}

export interface ServiceNowAuditEntry {
  id: string
  ritmNumber: string
  timestamp: string
  category: "Consulta" | "Concessão" | "Revogação" | "Atualização"
  title: string
  description: string
  status: "Concluído" | "Pendente" | "Falha"
  actor: string
  groupId?: string
}

export interface ServiceNowRitm {
  ritmNumber: string
  requestNumber: string
  requestedBy: string
  requestedAt: string
  status: ServiceNowRequestStatus
  networkArea: {
    name: string
    path: string
    description: string
    responsibleArea: string
  }
  responsibles: ServiceNowResponsible[]
  accessGroups: ServiceNowAccessGroup[]
  isDemo?: boolean
}

export interface ServiceNowQueryLog {
  id: string
  ritmNumber: string
  timestamp: string
  status: "Sucesso" | "Não encontrado" | "Falha de integração"
  duration: string
  actor: string
}

export interface ServiceNowAccessOperationRequest {
  ritmNumber: string
  groupId: string
  operation: AccessOperation
}

export interface ServiceNowAccessOperationResult {
  operationId: string
  status: "Concluído" | "Falha"
  completedAt: string
  failureCategory?: "Integração" | "Regra de acesso" | "Permissão"
  message: string
}

export interface ServiceNowTicketUpdateRequest {
  ritmNumber: string
  status: "Concluído"
}

export interface ServiceNowTicketUpdateResult {
  status: "Concluído" | "Falha"
  updatedAt: string
  failureCategory?: "Integração" | "Regra de acesso" | "Permissão"
  message: string
}

/** Contrato que o futuro cliente HTTP deverá implementar, sem acoplar a UI ao transporte. */
export interface ServiceNowGateway {
  findRitm(ritmNumber: string): Promise<ServiceNowRitm | null>
  listQueryLogs(): Promise<ServiceNowQueryLog[]>
  processAccessOperation(input: ServiceNowAccessOperationRequest): Promise<ServiceNowAccessOperationResult>
  updateRitmStatus(input: ServiceNowTicketUpdateRequest): Promise<ServiceNowTicketUpdateResult>
}

const demoRequests: ServiceNowRitm[] = [
  {
    ritmNumber: "RITM0012345",
    requestNumber: "REQ0048210",
    requestedBy: "Usuário demonstrativo 01",
    requestedAt: "2026-10-28T14:32:00-03:00",
    status: "Em processamento",
    networkArea: {
      name: "Projeto demonstrativo de pesquisa",
      path: "\\\\rede-demo\\areas\\pesquisa-exemplo",
      description: "Área fictícia para demonstrar o fluxo de acesso a dados científicos.",
      responsibleArea: "Área de pesquisa demonstrativa",
    },
    responsibles: [
      { name: "Responsável demonstrativo 01", email: "responsavel01@example.com", role: "Responsável pela área" },
      { name: "Responsável demonstrativo 02", email: "responsavel02@example.com", role: "Responsável substituto" },
    ],
    accessGroups: [
      { id: "grp-01", name: "GRP-DEMO-PESQUISA-LEITURA", permission: "Leitura", currentAccess: "Sem acesso", members: 12, operation: "concessao", status: "Pendente" },
      { id: "grp-02", name: "GRP-DEMO-PESQUISA-EDICAO", permission: "Leitura e gravação", currentAccess: "Sem acesso", members: 4, operation: "concessao", status: "Pendente" },
    ],
    isDemo: true,
  },
  {
    ritmNumber: "RITM0012398",
    requestNumber: "REQ0048266",
    requestedBy: "Usuário demonstrativo 02",
    requestedAt: "2026-10-30T09:15:00-03:00",
    status: "Concluído",
    networkArea: {
      name: "Projeto demonstrativo de geofísica",
      path: "\\\\rede-demo\\areas\\geofisica-exemplo",
      description: "Repositório fictício para demonstrar uma solicitação concluída.",
      responsibleArea: "Área demonstrativa de geofísica",
    },
    responsibles: [
      { name: "Responsável demonstrativo 02", email: "responsavel02@example.com", role: "Responsável pela área" },
    ],
    accessGroups: [
      { id: "grp-03", name: "GRP-DEMO-GEOFISICA-LEITURA", permission: "Leitura", currentAccess: "Com acesso", members: 8, operation: "concessao", status: "Concluído" },
      { id: "grp-04", name: "GRP-DEMO-GEOFISICA-ANTIGO", permission: "Leitura", currentAccess: "Sem acesso", members: 2, operation: "revogacao", status: "Concluído" },
    ],
    isDemo: true,
  },
  {
    ritmNumber: "RITM0012412",
    requestNumber: "REQ0048310",
    requestedBy: "Pessoa demonstrativa 03",
    requestedAt: "2026-11-07T10:20:00-03:00",
    status: "Aberto",
    isDemo: true,
    networkArea: {
      name: "Geologia computacional",
      path: "\\\\rede-demo\\areas\\geologia-computacional",
      description: "Solicitação de acesso demonstrativa para análise de dados geológicos.",
      responsibleArea: "Área demonstrativa de geologia",
    },
    responsibles: [{ name: "Responsável demonstrativo 03", email: "responsavel03@example.com", role: "Responsável pela área" }],
    accessGroups: [
      { id: "grp-05", name: "GRP-DEMO-GEOLOGIA-LEITURA", permission: "Leitura", currentAccess: "Sem acesso", members: 6, operation: "concessao", status: "Pendente" },
      { id: "grp-06", name: "GRP-DEMO-GEOLOGIA-EDICAO", permission: "Leitura e gravação", currentAccess: "Sem acesso", members: 2, operation: "concessao", status: "Pendente" },
    ],
  },
  {
    ritmNumber: "RITM0012456",
    requestNumber: "REQ0048344",
    requestedBy: "Pessoa demonstrativa 04",
    requestedAt: "2026-11-06T15:45:00-03:00",
    status: "Em processamento",
    isDemo: true,
    networkArea: {
      name: "Laboratório de materiais",
      path: "\\\\rede-demo\\areas\\laboratorio-materiais",
      description: "Solicitação de acesso demonstrativa a dados de laboratório.",
      responsibleArea: "Área demonstrativa de materiais",
    },
    responsibles: [{ name: "Responsável demonstrativo 04", email: "responsavel04@example.com", role: "Responsável pela área" }],
    accessGroups: [
      { id: "grp-07", name: "GRP-DEMO-MATERIAIS-LEITURA", permission: "Leitura", currentAccess: "Sem acesso", members: 9, operation: "concessao", status: "Pendente" },
    ],
  },
  {
    ritmNumber: "RITM0012481",
    requestNumber: "REQ0048391",
    requestedBy: "Pessoa demonstrativa 05",
    requestedAt: "2026-11-05T08:10:00-03:00",
    status: "Aberto",
    isDemo: true,
    networkArea: {
      name: "Bioinformática aplicada",
      path: "\\\\rede-demo\\areas\\bioinformatica-aplicada",
      description: "Solicitação de acesso demonstrativa a conjuntos de dados de pesquisa.",
      responsibleArea: "Área demonstrativa de bioinformática",
    },
    responsibles: [{ name: "Responsável demonstrativo 05", email: "responsavel05@example.com", role: "Responsável pela área" }],
    accessGroups: [
      { id: "grp-08", name: "GRP-DEMO-BIOINFO-LEITURA", permission: "Leitura", currentAccess: "Sem acesso", members: 14, operation: "concessao", status: "Pendente" },
      { id: "grp-09", name: "GRP-DEMO-BIOINFO-EDICAO", permission: "Leitura e gravação", currentAccess: "Sem acesso", members: 3, operation: "concessao", status: "Pendente" },
      { id: "grp-10", name: "GRP-DEMO-BIOINFO-ANTIGO", permission: "Leitura", currentAccess: "Com acesso", members: 1, operation: "revogacao", status: "Pendente" },
    ],
  },
]

export const demoPendingRitms = demoRequests.filter((request) => request.status === "Aberto" || request.status === "Em processamento")

/** Implementação temporária de demonstração. Substituir por chamada ao backend. */
export const demoServiceNowGateway: ServiceNowGateway = {
  async findRitm(ritmNumber) {
    const normalizedNumber = ritmNumber.trim().toUpperCase()
    return demoRequests.find((request) => request.ritmNumber === normalizedNumber) ?? null
  },
  async listQueryLogs() {
    return demoQueryLogs
  },
  async processAccessOperation(input) {
    return {
      operationId: `DEMO-${input.groupId}-${Date.now()}`,
      status: "Concluído",
      completedAt: new Date().toISOString(),
      message: `A ${input.operation === "concessao" ? "concessão" : "revogação"} foi simulada localmente. Nenhuma alteração foi enviada.`,
    }
  },
  async updateRitmStatus(input) {
    return {
      status: "Concluído",
      updatedAt: new Date().toISOString(),
      message: `A atualização do RITM ${input.ritmNumber} foi simulada localmente. Nenhuma alteração foi enviada.`,
    }
  },
}

export const demoQueryLogs: ServiceNowQueryLog[] = [
  { id: "log-01", ritmNumber: "RITM0012398", timestamp: "2026-10-30T09:16:12-03:00", status: "Sucesso", duration: "1,2 s", actor: "Rafael Nunes" },
  { id: "log-02", ritmNumber: "RITM0012345", timestamp: "2026-10-28T14:33:04-03:00", status: "Sucesso", duration: "0,9 s", actor: "Mariana Costa" },
  { id: "log-03", ritmNumber: "RITM0012299", timestamp: "2026-10-27T11:08:51-03:00", status: "Não encontrado", duration: "0,7 s", actor: "Mariana Costa" },
]
