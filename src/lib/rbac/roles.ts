import type { Role } from "@prisma/client";

/** Rollerin kullanıcıya gösterilen Türkçe adları. */
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Sistem Yöneticisi",
  GENEL_YAYIN_YONETMENI: "Genel Yayın Yönetmeni",
  TEKNIK_MUDUR: "Teknik Müdür",
  TEKNIK_YONETMEN: "Teknik Yönetmen",
  MANAGER: "Birim / Departman Yöneticisi",
  IT_AGENT: "IT Uzmanı",
  EMPLOYEE: "Personel",
};

/** Yetki sırası — yukarıdan aşağıya (yüksekten düşüğe). */
export const ROLE_ORDER: Role[] = [
  "SUPER_ADMIN",
  "GENEL_YAYIN_YONETMENI",
  "TEKNIK_MUDUR",
  "TEKNIK_YONETMEN",
  "MANAGER",
  "IT_AGENT",
  "EMPLOYEE",
];

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

/** Bir aktörün atayabileceği roller (yetki yükseltmeyi engeller). */
export function assignableRoles(actor: Role): Role[] {
  if (actor === "SUPER_ADMIN") {
    return ROLE_ORDER;
  }
  if (actor === "GENEL_YAYIN_YONETMENI") {
    return ["TEKNIK_MUDUR", "TEKNIK_YONETMEN", "MANAGER", "IT_AGENT", "EMPLOYEE"];
  }
  if (actor === "TEKNIK_MUDUR") {
    return ["TEKNIK_MUDUR", "TEKNIK_YONETMEN", "MANAGER", "IT_AGENT", "EMPLOYEE"];
  }
  if (actor === "TEKNIK_YONETMEN") {
    return ["TEKNIK_YONETMEN", "MANAGER", "IT_AGENT", "EMPLOYEE"];
  }
  if (actor === "IT_AGENT") {
    return ["IT_AGENT", "EMPLOYEE", "MANAGER"];
  }
  return [];
}
