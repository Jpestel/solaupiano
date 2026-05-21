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

export async function sendInvitationEmail(to: string, fromName: string, personalMessage: string | null, signupUrl: string) {
  await resend.emails.send({
    from: 'Solaupiano <noreply@solaupiano.fr>',
    to,
    subject: `${fromName} vous invite à rejoindre Solaupiano 🎶`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 60px; height: 60px; background: #4f46e5; border-radius: 16px; margin-bottom: 14px;">
              <span style="font-size: 28px;">🎶</span>
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1e1b4b;">Solaupiano</h1>
            <p style="margin: 6px 0 0; font-size: 14px; color: #6b7280;">La plateforme pour les musiciens en groupe</p>
          </div>

          <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 12px;">
            ${fromName} vous invite à rejoindre Solaupiano !
          </h2>

          <p style="color: #4b5563; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
            Bonjour,<br/><br/>
            <strong>${fromName}</strong> vous invite à découvrir <strong>Solaupiano</strong>, la plateforme pensée pour les musiciens qui répètent en groupe.
          </p>

          ${personalMessage ? `
          <div style="background: #f5f3ff; border-left: 4px solid #7c3aed; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #4c1d95; font-style: italic;">"${personalMessage}"</p>
            <p style="margin: 8px 0 0; font-size: 12px; color: #7c3aed; font-weight: 600;">— ${fromName}</p>
          </div>
          ` : ''}

          <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px; font-size: 13px; font-weight: 600; color: #374151;">Avec Solaupiano, vous pouvez :</p>
            <ul style="margin: 0; padding: 0; list-style: none; space-y: 8px;">
              <li style="font-size: 13px; color: #4b5563; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                🗓️ &nbsp;Organiser et planifier vos répétitions
              </li>
              <li style="font-size: 13px; color: #4b5563; margin-bottom: 8px;">
                🎵 &nbsp;Gérer le répertoire de vos morceaux
              </li>
              <li style="font-size: 13px; color: #4b5563; margin-bottom: 8px;">
                📁 &nbsp;Partager partitions, grilles et fichiers audio
              </li>
              <li style="font-size: 13px; color: #4b5563;">
                ✅ &nbsp;Suivre votre préparation morceau par morceau
              </li>
            </ul>
          </div>

          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${signupUrl}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 600; letter-spacing: 0.01em;">
              Créer mon compte gratuitement
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            Si vous n'êtes pas musicien ou ne souhaitez pas rejoindre Solaupiano, ignorez simplement cet email.
          </p>
        </div>
      </div>
    `,
  })
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

export async function sendNewUserNotification(adminEmail: string, newUser: { name: string; email: string }) {
  await resend.emails.send({
    from: 'Solaupiano <noreply@solaupiano.fr>',
    to: adminEmail,
    subject: `Nouvelle inscription — ${newUser.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; border-radius: 14px; margin-bottom: 12px;">
              <span style="font-size: 24px;">🎹</span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e1b4b;">Solaupiano</h1>
          </div>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #166534;">Nouvelle inscription 🎉</p>
            <p style="margin: 0; font-size: 13px; color: #15803d;">Un nouveau musicien vient de rejoindre la plateforme.</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 40%;">Nom</td>
              <td style="padding: 8px 0; color: #111827; font-weight: 500;">${newUser.name}</td>
            </tr>
            <tr style="border-top: 1px solid #f3f4f6;">
              <td style="padding: 8px 0; color: #6b7280;">Email</td>
              <td style="padding: 8px 0; color: #111827; font-weight: 500;">${newUser.email}</td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 24px;">
            <a href="https://solaupiano.fr/admin/utilisateurs" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 13px; font-weight: 600;">
              Voir les utilisateurs
            </a>
          </div>
        </div>
      </div>
    `,
  })
}

export async function sendAttendanceReminder(
  members: { email: string; name: string }[],
  groupName: string,
  rehearsal: {
    id: number
    groupId: number
    date: Date
    startTime: string
    endTime?: string | null
    location: string
  },
  baseUrl: string
) {
  const dateStr = new Date(rehearsal.date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const timeStr = rehearsal.endTime
    ? `${rehearsal.startTime} – ${rehearsal.endTime}`
    : rehearsal.startTime
  const rehearsalUrl = `${baseUrl}/groupes/${rehearsal.groupId}/repetitions/${rehearsal.id}`

  await Promise.all(
    members.map(({ email, name }) =>
      resend.emails.send({
        from: 'Solaupiano <noreply@solaupiano.fr>',
        to: email,
        subject: `Rappel — Indiquez votre présence · ${groupName}`,
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
                Vous n'avez pas encore indiqué votre présence pour la prochaine répétition du groupe <strong>${groupName}</strong>.
              </p>

              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #1e3a8a; text-transform: capitalize;">${dateStr}</p>
                <p style="margin: 0 0 4px; font-size: 13px; color: #1d4ed8;">🕐 ${timeStr}</p>
                <p style="margin: 0; font-size: 13px; color: #1d4ed8;">📍 ${rehearsal.location}</p>
              </div>

              <p style="color: #6b7280; font-size: 13px; margin-bottom: 20px;">
                Merci de prendre une minute pour indiquer si vous serez présent(e), absent(e) ou incertain(e).
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
