export function isOperatorRole(role?: string | null, profileId?: string | null, profileName?: string | null): boolean {
  const normalized = [role, profileName].map((value) => String(value ?? "").trim().toLowerCase())
  return profileId?.trim().toUpperCase() === "OPR" || normalized.some((value) => value === "operador" || value === "operator" || value === "opr")
}
