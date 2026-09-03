import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role, UserStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    // Credentials (kullanıcı adı/şifre) JWT gerektirir. Kalıcı oturum:
    // uzun süre, otomatik düşmez; offboarding'de User.status=INACTIVE ile iptal.
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 gün
    updateAge: 60 * 60 * 24, // her gün aktivitede tazelenir
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    // Herkes: kullanıcı adı + şifre (hesapları IT panelden oluşturur)
    Credentials({
      credentials: {
        username: { label: "Kullanıcı adı" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(creds) {
        const username = String(creds?.username ?? "")
          .trim()
          .toLowerCase();
        const password = String(creds?.password ?? "");
        if (!username || !password) return null;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user?.passwordHash || user.status !== "ACTIVE") return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as Role;
        session.user.status = token.status as UserStatus;
      }
      return session;
    },
  },
  events: {
    // İlk yönetici bootstrap: SUPER_ADMIN_EMAILS'teki e-posta ilk kez giriş
    // yapıp oluşturulduğunda otomatik SUPER_ADMIN olur (e-posta ile giriş yolu).
    async createUser({ user }) {
      const admins = (process.env.SUPER_ADMIN_EMAILS ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (user.email && admins.includes(user.email.toLowerCase())) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "SUPER_ADMIN" },
        });
      }
    },
  },
});
