import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

const TEST_ACCOUNT_EMAIL = 'testeur@solaupiano.fr'
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname
    const writeRequest = !READ_METHODS.has(req.method)

    if (token?.email === TEST_ACCOUNT_EMAIL && writeRequest) {
      return new NextResponse(
        JSON.stringify({
          error:
            'Compte TESTEUR : lecture seule. Les créations, modifications et suppressions sont désactivées pour préserver les données de démonstration.',
        }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      )
    }

    // Mode aperçu (admin « voir en tant que ») = lecture seule globale.
    // Tant que le cookie est présent, toute écriture est bloquée — sauf l'endpoint
    // qui permet justement de démarrer/quitter l'aperçu.
    const previewing = !!req.cookies.get('preview_as')?.value
    if (
      previewing &&
      writeRequest &&
      !pathname.startsWith('/api/admin/preview')
    ) {
      return new NextResponse(
        JSON.stringify({ error: 'Mode aperçu : lecture seule. Quittez l’aperçu pour modifier.' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      )
    }

    // Admin routes require ADMIN role
    if (pathname.startsWith('/admin') && token?.siteRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/tableau-de-bord', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname
        // Public pages accessible without login
        if (pathname === '/') return true
        if (pathname === '/aide' || pathname.startsWith('/aide/')) return true
        if (pathname === '/tarifs') return true
        if (pathname === '/annonces' || pathname.startsWith('/annonces/')) return true
        if (pathname === '/blog' || pathname.startsWith('/blog/')) return true
        // Lien d'invitation : la page gère elle-même connecté / non connecté.
        if (pathname.startsWith('/rejoindre/')) return true
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!connexion|inscription|mot-de-passe-oublie|reinitialiser-mot-de-passe|verifier-email|mentions-legales|tarifs|aide|annonces|presence|api/auth|api/inscription|api/instruments|api/settings|api/cron|_next/static|_next/image|favicon.ico|icon.svg).*)',
  ],
}
