import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role, UserStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/logger";

// Single-server deployment: bounded, process-local login attempt window.
const loginAttempts = new Map<string, { count: number; expires: number }>();
const adminRoles: Role[] = ["SUPER_ADMIN", "GENEL_YAYIN_YONETMENI", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "MANAGER", "IT_AGENT"];

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12,
    updateAge: 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      async authorize(credentials) {
        if (typeof credentials.username !== "string" || typeof credentials.password !== "string") return null;
        const identifier = credentials.username.trim().toLowerCase();
        const password = credentials.password;
        if (!identifier || identifier.length > 254 || !password || password.length > 128) return null;
        const now = Date.now();
        for (const [key, attempt] of loginAttempts) if (attempt.expires <= now) loginAttempts.delete(key);
        const attempt = loginAttempts.get(identifier);
        if ((attempt?.count ?? 0) >= 5 || (!attempt && loginAttempts.size >= 10000)) return null;
        loginAttempts.set(identifier, { count: (attempt?.count ?? 0) + 1, expires: attempt?.expires ?? now + 15 * 60 * 1000 });
        const matches = await prisma.user.findMany({
          where: { OR: [{ username: { equals: identifier, mode: "insensitive" } }, { email: { equals: identifier, mode: "insensitive" } }] },
          take: 2,
        });
        const user = matches.length === 1 ? matches[0] : null;
        if (!user || user.status !== "ACTIVE" || !adminRoles.includes(user.role) || !user.passwordHash) return null;
        if (!(await bcrypt.compare(password, user.passwordHash))) return null;
        loginAttempts.delete(identifier);
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await auditLog({ actorId: user.id, action: "LOGIN", entityType: "User", entityId: user.id, meta: { method: "admin_credentials" } }).catch(() => {});
        return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role, status: user.status };
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            authorization: { params: { prompt: "select_account", access_type: "offline", response_type: "code" } }
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {

      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        if (!email.endsWith("@halktv.com.tr")) {
          return "/login?error=invalid_domain";
        }

        const existingUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true, status: true, name: true, image: true, passwordHash: true },
        });

        if (!existingUser) {
          // Kullanıcı ve Google Account bağlantısını Auth.js adapter aynı işlem akışında oluşturur.
          // Burada erken kullanıcı oluşturmak ilk girişte OAuthAccountNotLinked hatasına yol açıyordu.
          return true;
        }

        if (existingUser.status !== "ACTIVE") {
          return "/login?error=inactive";
        }

        const updates: Record<string, unknown> = { lastLoginAt: new Date() };

        if (!existingUser.name && user.name) {
          updates.name = user.name;
        }
        const googlePic = (profile as any)?.picture || (profile as any)?.avatar_url || (user as any)?.image;
        if (googlePic) {
          const highResImage = String(googlePic).replace(/=s\d+(-c)?$/, "=s384-c");
          updates.image = highResImage;
        }
        await prisma.user.update({
          where: { id: existingUser.id },
          data: updates,
        });

        // PrismaAdapter'ın hesap bağlama tablosunu (Account) bu kullanıcıya sabitle
        if (account.providerAccountId) {
          try {
            await prisma.account.upsert({
              where: {
                provider_providerAccountId: {
                  provider: "google",
                  providerAccountId: account.providerAccountId,
                },
              },
              create: {
                userId: existingUser.id,
                type: account.type || "oidc",
                provider: "google",
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                id_token: account.id_token,
                token_type: account.token_type,
                scope: account.scope,
                expires_at: account.expires_at,
              },
              update: {
                userId: existingUser.id,
                access_token: account.access_token,
                id_token: account.id_token,
                expires_at: account.expires_at,
              },
            });
          } catch {}
        }

        user.id = existingUser.id;

        await auditLog({
          actorId: existingUser.id,
          action: "LOGIN",
          entityType: "User",
          entityId: existingUser.id,
          meta: { email, method: "google" },
        }).catch(() => {});

        return true;
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.status = user.status;
        token.email = user.email;
        token.name = user.name;
        if ((user as any).image) {
          token.picture = (user as any).image;
        }
      }

      // Google OAuth girişinde kesinlikle Google hesabının ait olduğu DB kullanıcısına bağla
      if (account?.provider === "google") {
        const googleEmail = ((profile?.email || user?.email || token.email) as string | undefined)?.toLowerCase();
        if (googleEmail) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: googleEmail },
              select: { id: true, role: true, status: true, name: true, email: true, image: true },
            });
            if (dbUser) {
              token.sub = dbUser.id;
              token.email = dbUser.email;
              token.name = dbUser.name;
              token.role = dbUser.role;
              token.status = dbUser.status;
              if (dbUser.image) {
                token.picture = dbUser.image;
              }

              if (account.providerAccountId) {
                await prisma.account.updateMany({
                  where: { provider: "google", providerAccountId: account.providerAccountId },
                  data: { userId: dbUser.id },
                });
              }
            }
          } catch {}
        }
      } else if (token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: (token.email as string).toLowerCase() },
            select: { id: true, role: true, status: true, name: true, image: true },
          });
          if (dbUser) {
            token.sub = dbUser.id;
            token.role = dbUser.role;
            token.status = dbUser.status;
            token.name = dbUser.name;
            if (dbUser.image) {
              token.picture = dbUser.image;
            }
          }
        } catch {}
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as Role;
        session.user.status = token.status as UserStatus;
        if (token.picture) {
          session.user.image = token.picture as string;
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/") && url.startsWith("/kiosk")) return `${baseUrl}${url}`;
      if (url === "/" || url === baseUrl) return `${baseUrl}/kiosk`;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {}
      return `${baseUrl}/kiosk`;
    },
  },
  events: {
    async createUser({ user }) {
      const admins = (process.env.SUPER_ADMIN_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase());
      const data: { role?: Role; image?: string; lastLoginAt: Date } = { lastLoginAt: new Date() };
      if (user.email && admins.includes(user.email.toLowerCase())) data.role = "SUPER_ADMIN";
      if (user.image) data.image = user.image.replace(/=s\d+(-c)?$/, "=s384-c");
      await prisma.user.update({ where: { id: user.id }, data });
      await auditLog({ actorId: user.id, action: "CREATE", entityType: "User", entityId: user.id, meta: { email: user.email, method: "google_sso_auto_register" } }).catch(() => {});
    },
  },
});
