export type UserRole = "admin" | "manager" | "sales" | "editor" | "viewer";

export const ROLES: ReadonlyArray<UserRole> = ["admin", "manager", "sales", "editor", "viewer"];

export const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  admin: "Administrateur",
  manager: "Manager",
  sales: "Commercial",
  editor: "Éditeur",
  viewer: "Lecteur",
};

export const ROLE_DESCRIPTIONS: Readonly<Record<UserRole, string>> = {
  admin: "Accès complet à tout",
  manager: "Tout sauf paramètres et équipe",
  sales: "CRM, devis, factures, messages",
  editor: "Contenus du site uniquement",
  viewer: "Lecture seule sur tout",
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewUser {
  email: string;
  name: string;
  role: UserRole;
  password?: string | undefined;
  avatar?: string | null | undefined;
}

export interface UpdateUser {
  email?: string | undefined;
  name?: string | undefined;
  role?: UserRole | undefined;
  avatar?: string | null | undefined;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}
