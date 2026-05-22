import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import type { JWT } from 'next-auth/jwt'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email et mot de passe requis')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          throw new Error('Aucun compte trouvé avec cet email')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('Mot de passe incorrect')
        }

        if (!user.emailVerified) {
          throw new Error('EMAIL_NOT_VERIFIED')
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          siteRole: user.siteRole,
          userPlan: user.userPlan,
          avatarUrl: user.avatarUrl ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.siteRole = (user as any).siteRole
        token.userPlan = (user as any).userPlan
        token.picture = (user as any).avatarUrl ?? undefined
      }
      // Re-fetch from DB on explicit update() call OR when userPlan is missing (old sessions)
      if (trigger === 'update' || !token.userPlan) {
        const dbUser = await prisma.user.findUnique({
          where: { id: Number(token.id) },
          select: { siteRole: true, userPlan: true, avatarUrl: true },
        })
        if (dbUser) {
          token.siteRole = dbUser.siteRole
          token.userPlan = dbUser.userPlan
          token.picture = dbUser.avatarUrl ?? undefined
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.siteRole = token.siteRole as string
        session.user.userPlan = token.userPlan as string
        session.user.image = (token.picture as string | undefined) ?? null
      }
      return session
    },
  },
  pages: {
    signIn: '/connexion',
    error: '/connexion',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Extend next-auth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      siteRole: string
      userPlan: string
    }
  }

  interface User {
    siteRole?: string
    userPlan?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    siteRole?: string
    userPlan?: string
  }
}
