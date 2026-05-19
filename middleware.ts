import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Admin routes require ADMIN role
    if (pathname.startsWith('/admin') && token?.siteRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/tableau-de-bord', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Public home page is always accessible
        if (req.nextUrl.pathname === '/') return true
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!connexion|inscription|mot-de-passe-oublie|reinitialiser-mot-de-passe|verifier-email|mentions-legales|api/auth|api/inscription|api/instruments|api/settings|_next/static|_next/image|favicon.ico).*)',
  ],
}
