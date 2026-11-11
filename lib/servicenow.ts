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
  members: number
  operation: AccessOperation
  status: "Pendente" | "Concluído"
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
  message: string
}

/** Contrato que o futuro cliente HTTP deverá implementar, sem acoplar a UI ao transporte. */
export interface ServiceNowGateway {
  findRitm(ritmNumber: string): Promise<ServiceNowRitm | null>
  listQueryLogs(): Promise<ServiceNowQueryLog[]>
  processAccessOperation(input: ServiceNowAccessOperationRequest): Promise<ServiceNowAccessOperationResult>
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
      { id: "grp-01", name: "GRP-DEMO-PESQUISA-LEITURA", permission: "Leitura", members: 12, operation: "concessao", status: "Pendente" },
      { id: "grp-02", name: "GRP-DEMO-PESQUISA-EDICAO", permission: "Leitura e gravação", members: 4, operation: "concessao", status: "Pendente" },
    ],
  },
  {
    ritmNumber: "RITM0012398",
    requestNumber: "REQ0048266",
    requestedBy: "Rafael Nunes",
    requestedAt: "2026-10-30T09:15:00-03:00",
    status: "Concluído",
    networkArea: {
      name: "Dados de Geofísica Aplicada",
      path: "\\\\rede-petrobras\\cientifico\\geofisica-aplicada",
      description: "Repositório de dados e produtos de geofísica aplicada.",
      responsibleArea: "CENPES / Geofísica",
    },
    responsibles: [
      { name: "Rafael Nunes", email: "rafael.nunes@petrobras.com.br", role: "Responsável pela área" },
    ],
    accessGroups: [
      { id: "grp-03", name: "GG-CENPES-GEOFISICA-LEITURA", permission: "Leitura", members: 8, operation: "concessao", status: "Concluído" },
      { id: "grp-04", name: "GG-CENPES-GEOFISICA-ANTIGO", permission: "Leitura", members: 2, operation: "revogacao", status: "Concluído" },
    ],
  },
]

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
}

export const demoQueryLogs: ServiceNowQueryLog[] = [
  { id: "log-01", ritmNumber: "RITM0012398", timestamp: "2026-10-30T09:16:12-03:00", status: "Sucesso", duration: "1,2 s", actor: "Rafael Nunes" },
  { id: "log-02", ritmNumber: "RITM0012345", timestamp: "2026-10-28T14:33:04-03:00", status: "Sucesso", duration: "0,9 s", actor: "Mariana Costa" },
  { id: "log-03", ritmNumber: "RITM0012299", timestamp: "2026-10-27T11:08:51-03:00", status: "Não encontrado", duration: "0,7 s", actor: "Mariana Costa" },
]
