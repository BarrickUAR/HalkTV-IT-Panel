import type { Role } from "@prisma/client";

/**
 * HalkTV HelpDesk — rol tabanlı yetki (RBAC) haritası.
 * Tek doğruluk kaynağı burasıdır. UI'da butonları gizlemek için `can()` kullan,
 * ama GÜVENLİK her zaman sunucu tarafında (server action / route) tekrar doğrulanır.
 */
export const PERMISSIONS = [
  "ticket:create",
  "ticket:read:own",
  "ticket:read:all",
  "ticket:assign",
  "ticket:update",
  "ticket:comment:internal",
  "ticket:delete",
  "time:log",
  "asset:manage",
  "asset:assign",
  "reservation:manage",
  "consumable:manage",
  "maintenance:manage",
  "account:manage",
  "lifecycle:manage",
  "kb:manage",
  "announcement:manage",
  "user:read",
  "user:manage",
  "report:view",
  "audit:read",
  "approval:decide",
  "location:manage",
  "oncall:manage",
  "role:manage",
  "settings:manage",
  "integration:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const EMPLOYEE: Permission[] = ["ticket:create", "ticket:read:own"];

const IT_AGENT: Permission[] = [
  ...EMPLOYEE,
  "ticket:read:all",
  "ticket:assign",
  "ticket:update",
  "ticket:comment:internal",
  "time:log",
  "user:read",
];

// IT Yöneticisi
const IT_LEAD: Permission[] = [
  ...IT_AGENT,
  "report:view",
  "audit:read",
  "approval:decide",
  "announcement:manage",
  "oncall:manage",
  "location:manage",
];

// IT Müdürü
const IT_MANAGER: Permission[] = [...IT_LEAD, "ticket:delete", "user:manage"];

// Sistem Yöneticisi
const SUPER_ADMIN: Permission[] = [
  ...IT_MANAGER,
  "role:manage",
  "settings:manage",
  "integration:manage",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  EMPLOYEE,
  IT_AGENT,
  IT_LEAD,
  IT_MANAGER,
  SUPER_ADMIN,
};

/** Bir rolün belirli bir izne sahip olup olmadığını döner. */
export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** IT ekibi mi (uzman / yönetici / müdür / sistem yöneticisi)? */
export function isITStaff(role: Role): boolean {
  return (
    role === "IT_AGENT" ||
    role === "IT_LEAD" ||
    role === "IT_MANAGER" ||
    role === "SUPER_ADMIN"
  );
}
