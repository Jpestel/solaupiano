import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  await resend.emails.send({
    from: 'Sol au Piano <noreply@solaupiano.fr>',
    to,
    subject: 'Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; border-radius: 14px; margin-bottom: 12px;">
              <span style="font-size: 24px;">🎹</span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e1b4b;">Sol au Piano</h1>
          </div>

          <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 8px;">Bonjour ${name},</h2>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
            Ce lien est valable <strong>1 heure</strong>.
          </p>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
              Réinitialiser mon mot de passe
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            Si vous n'avez pas fait cette demande, ignorez cet email. Votre mot de passe ne sera pas modifié.
          </p>
        </div>
      </div>
    `,
  })
}
