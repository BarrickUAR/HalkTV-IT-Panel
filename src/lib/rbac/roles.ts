import type { Role } from "@prisma/client";

/** Rollerin kullanıcıya gösterilen Türkçe adları. */
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Sistem Yöneticisi",
  TEKNIK_MUDUR: "Teknik Müdür",
  TEKNIK_YONETMEN: "Teknik Yönetmen",
  IT_AGENT: "IT Uzmanı",
  EMPLOYEE: "Personel",
};

/** Yetki sırası — yukarıdan aşağıya (yüksekten düşüğe). */
export const ROLE_ORDER: Role[] = [
  "SUPER_ADMIN",
  "TEKNIK_MUDUR",
  "TEKNIK_YONETMEN",
  "IT_AGENT",
  "EMPLOYEE",
];

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

/** Bir aktörün atayabileceği roller (yukarıdan aşağıya; yetki yükseltmeyi engeller). */
export function assignableRoles(actor: Role): Role[] {
  if (actor === "SUPER_ADMIN")
    return ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT", "EMPLOYEE"];
  if (actor === "TEKNIK_MUDUR") 
    return ["TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT", "EMPLOYEE"];
  if (actor === "TEKNIK_YONETMEN") 
    return ["IT_AGENT", "EMPLOYEE"];
  return [];
}
