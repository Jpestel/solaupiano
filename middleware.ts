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
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/((?!connexion|inscription|api/auth|api/inscription|api/instruments|_next/static|_next/image|favicon.ico).*)',
  ],
}
