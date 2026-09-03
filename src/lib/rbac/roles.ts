import type { Role } from "@prisma/client";

/** Rollerin kullanıcıya gösterilen Türkçe adları. */
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Sistem Yöneticisi",
  IT_MANAGER: "IT Müdürü",
  IT_LEAD: "IT Yöneticisi",
  IT_AGENT: "IT Uzmanı",
  EMPLOYEE: "Personel",
};

/** Yetki sırası — yukarıdan aşağıya (yüksekten düşüğe). */
export const ROLE_ORDER: Role[] = [
  "SUPER_ADMIN",
  "IT_MANAGER",
  "IT_LEAD",
  "IT_AGENT",
  "EMPLOYEE",
];

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

/** Bir aktörün atayabileceği roller (yukarıdan aşağıya; yetki yükseltmeyi engeller). */
export function assignableRoles(actor: Role): Role[] {
  if (actor === "SUPER_ADMIN")
    return ["SUPER_ADMIN", "IT_MANAGER", "IT_LEAD", "IT_AGENT", "EMPLOYEE"];
  if (actor === "IT_MANAGER") return ["IT_LEAD", "IT_AGENT", "EMPLOYEE"];
  return [];
}
