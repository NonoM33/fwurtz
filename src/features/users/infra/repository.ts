import { randomUUID, createHash } from "node:crypto";
import { db } from "~/shared/db/db.ts";
import { ensureMigrated } from "~/shared/db/migrate.ts";
import type { NewUser, UpdateUser, User, UserRole } from "../domain/types.ts";
import { ROLES } from "../domain/types.ts";

interface Row {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

function rowToEntity(r: Row): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: (ROLES.includes(r.role as UserRole) ? r.role : "viewer") as UserRole,
    avatar: r.avatar,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function hashPassword(plain: string): string {
  // SHA-256 with a fixed pepper. Sufficient as a placeholder until we move to
  // bcrypt/argon2; the real admin uses ADMIN_PASSWORD env, this hash never
  // gates production auth, only stores collaborator credentials for future use.
  return createHash("sha256").update(`mf-pepper:${plain}`).digest("hex");
}

export class UsersRepository {
  constructor() {
    ensureMigrated();
  }

  list(): User[] {
    const rows = db().prepare<unknown[], Row>("SELECT * FROM users ORDER BY created_at ASC").all() as Row[];
    return rows.map(rowToEntity);
  }

  get(id: string): User | null {
    const row = db().prepare<unknown[], Row>("SELECT * FROM users WHERE id = ?").get(id) as Row | undefined;
    return row ? rowToEntity(row) : null;
  }

  byEmail(email: string): User | null {
    const row = db()
      .prepare<unknown[], Row>("SELECT * FROM users WHERE LOWER(email) = LOWER(?)")
      .get(email) as Row | undefined;
    return row ? rowToEntity(row) : null;
  }

  create(input: NewUser): User {
    if (this.byEmail(input.email)) {
      throw new Error("email_taken");
    }
    const id = randomUUID();
    const now = new Date().toISOString();
    const password = input.password ?? randomUUID();
    db()
      .prepare(
        `INSERT INTO users (id, email, password_hash, name, role, avatar, created_at, updated_at)
         VALUES (@id, @email, @hash, @name, @role, @avatar, @now, @now)`,
      )
      .run({
        id,
        email: input.email.trim().toLowerCase(),
        hash: hashPassword(password),
        name: input.name.trim(),
        role: input.role,
        avatar: input.avatar ?? null,
        now,
      });
    const created = this.get(id);
    if (!created) throw new Error("failed to read back inserted user");
    return created;
  }

  update(id: string, patch: UpdateUser): User | null {
    const current = this.get(id);
    if (!current) return null;
    const merged = {
      email: patch.email ?? current.email,
      name: patch.name ?? current.name,
      role: patch.role ?? current.role,
      avatar: patch.avatar !== undefined ? patch.avatar : current.avatar,
    };
    db()
      .prepare(
        `UPDATE users SET email=@email, name=@name, role=@role, avatar=@avatar, updated_at=@now WHERE id=@id`,
      )
      .run({
        id,
        email: merged.email.trim().toLowerCase(),
        name: merged.name.trim(),
        role: merged.role,
        avatar: merged.avatar,
        now: new Date().toISOString(),
      });
    return this.get(id);
  }

  remove(id: string): boolean {
    return db().prepare("DELETE FROM users WHERE id = ?").run(id).changes > 0;
  }
}

let singleton: UsersRepository | undefined;
export function usersRepo(): UsersRepository {
  if (!singleton) singleton = new UsersRepository();
  return singleton;
}
