import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendRehearsalNotification(
  members: { email: string; name: string }[],
  groupName: string,
  groupId: number,
  rehearsal: {
    id: number
    date: Date
    startTime: string
    endTime?: string | null
    location: string
    notes?: string | null
  },
  baseUrl: string
) {
  const dateStr = new Date(rehearsal.date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const timeStr = rehearsal.endTime
    ? `${rehearsal.startTime} – ${rehearsal.endTime}`
    : rehearsal.startTime
  const rehearsalUrl = `${baseUrl}/groupes/${groupId}/repetitions/${rehearsal.id}`

  await Promise.all(
    members.map(({ email, name }) =>
      resend.emails.send({
        from: 'Solaupiano <noreply@solaupiano.fr>',
        to: email,
        subject: `Nouvelle répétition — ${groupName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; border-radius: 14px; margin-bottom: 12px;">
                  <span style="font-size: 24px;">🎹</span>
                </div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e1b4b;">Solaupiano</h1>
              </div>

              <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 4px;">Bonjour ${name},</h2>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                Une nouvelle répétition a été programmée pour le groupe <strong>${groupName}</strong>.
              </p>

              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #1e3a8a; text-transform: capitalize;">${dateStr}</p>
                <p style="margin: 0 0 4px; font-size: 13px; color: #1d4ed8;">🕐 ${timeStr}</p>
                <p style="margin: 0; font-size: 13px; color: #1d4ed8;">📍 ${rehearsal.location}</p>
                ${rehearsal.notes ? `<p style="margin: 8px 0 0; font-size: 12px; color: #6b7280; font-style: italic;">${rehearsal.notes}</p>` : ''}
              </div>

              <p style="color: #6b7280; font-size: 13px; margin-bottom: 20px;">
                Pensez à indiquer votre présence directement sur la plateforme.
              </p>

              <div style="text-align: center;">
                <a href="${rehearsalUrl}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                  Indiquer ma présence
                </a>
              </div>
            </div>
          </div>
        `,
      })
    )
  )
}

export async function sendEmailVerification(to: string, name: string, verifyUrl: string) {
  await resend.emails.send({
    from: 'Solaupiano <noreply@solaupiano.fr>',
    to,
    subject: 'Confirmez votre adresse email',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; border-radius: 14px; margin-bottom: 12px;">
              <span style="font-size: 24px;">🎶</span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e1b4b;">Solaupiano</h1>
          </div>

          <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 8px;">Bienvenue ${name} !</h2>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Votre compte a bien été créé. Pour l'activer, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.
            Ce lien est valable <strong>24 heures</strong>.
          </p>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${verifyUrl}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
              Confirmer mon email
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            Si vous n'avez pas créé de compte sur Solaupiano, ignorez cet email.
          </p>
        </div>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  await resend.emails.send({
    from: 'Solaupiano <noreply@solaupiano.fr>',
    to,
    subject: 'Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; border-radius: 14px; margin-bottom: 12px;">
              <span style="font-size: 24px;">🎹</span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e1b4b;">Solaupiano</h1>
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
