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
        from: 'Sol au piano <noreply@solaupiano.fr>',
        to: email,
        subject: `Nouvelle répétition — ${groupName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; border-radius: 14px; margin-bottom: 12px;">
                  <span style="font-size: 24px;">🎹</span>
                </div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e1b4b;">Sol au piano</h1>
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
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to,
    subject: `${fromName} vous invite à rejoindre Sol au piano 🎶`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 60px; height: 60px; background: #4f46e5; border-radius: 16px; margin-bottom: 14px;">
              <span style="font-size: 28px;">🎶</span>
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1e1b4b;">Sol au piano</h1>
            <p style="margin: 6px 0 0; font-size: 14px; color: #6b7280;">La plateforme pour les musiciens en groupe</p>
          </div>

          <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 12px;">
            ${fromName} vous invite à rejoindre Sol au piano !
          </h2>

          <p style="color: #4b5563; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
            Bonjour,<br/><br/>
            <strong>${fromName}</strong> vous invite à découvrir <strong>Sol au piano</strong>, la plateforme pensée pour les musiciens qui répètent en groupe.
          </p>

          ${personalMessage ? `
          <div style="background: #f5f3ff; border-left: 4px solid #7c3aed; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #4c1d95; font-style: italic;">"${personalMessage}"</p>
            <p style="margin: 8px 0 0; font-size: 12px; color: #7c3aed; font-weight: 600;">— ${fromName}</p>
          </div>
          ` : ''}

          <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px; font-size: 13px; font-weight: 600; color: #374151;">Avec Sol au piano, vous pouvez :</p>
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
            Si vous n'êtes pas musicien ou ne souhaitez pas rejoindre Sol au piano, ignorez simplement cet email.
          </p>
        </div>
      </div>
    `,
  })
}

export async function sendEmailVerification(to: string, name: string, verifyUrl: string) {
  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to,
    subject: 'Confirmez votre adresse email',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; border-radius: 14px; margin-bottom: 12px;">
              <span style="font-size: 24px;">🎶</span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e1b4b;">Sol au piano</h1>
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
            Si vous n'avez pas créé de compte sur Sol au piano, ignorez cet email.
          </p>
        </div>
      </div>
    `,
  })
}

export async function sendNewUserNotification(adminEmail: string, newUser: { name: string; email: string }) {
  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to: adminEmail,
    subject: `Nouvelle inscription — ${newUser.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; border-radius: 14px; margin-bottom: 12px;">
              <span style="font-size: 24px;">🎹</span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e1b4b;">Sol au piano</h1>
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
        from: 'Sol au piano <noreply@solaupiano.fr>',
        to: email,
        subject: `Rappel — Indiquez votre présence · ${groupName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; border-radius: 14px; margin-bottom: 12px;">
                  <span style="font-size: 24px;">🎹</span>
                </div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e1b4b;">Sol au piano</h1>
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

export async function sendGroupWelcomeEmail(
  to: string,
  memberName: string,
  groupName: string,
  groupId: number,
  addedByName: string,
  baseUrl: string
) {
  const groupUrl = `${baseUrl}/groupes/${groupId}`
  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to,
    subject: `Bienvenue dans le groupe "${groupName}" 🎶`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; border-radius: 14px; margin-bottom: 12px;">
              <span style="font-size: 24px;">🎹</span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e1b4b;">Sol au piano</h1>
          </div>

          <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 4px;">Bonjour ${memberName} !</h2>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            <strong>${addedByName}</strong> vous a ajouté(e) au groupe <strong>${groupName}</strong> sur Sol au piano.
            Vous avez maintenant accès au répertoire, aux répétitions, aux setlists et aux grilles d'accords du groupe.
          </p>

          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #1e3a8a;">🎵 ${groupName}</p>
            <p style="margin: 0; font-size: 13px; color: #3b82f6;">Ajouté(e) par ${addedByName}</p>
          </div>

          <div style="text-align: center; margin-bottom: 20px;">
            <a href="${groupUrl}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
              Accéder au groupe →
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            Vous recevrez un résumé hebdomadaire des nouveautés du groupe chaque vendredi.
            Vous pouvez vous désabonner depuis votre <a href="${baseUrl}/profil" style="color: #6b7280;">profil</a>.
          </p>
        </div>
      </div>
    `,
  })
}

export interface DigestGroup {
  id: number
  name: string
  newGrilles: { id: number; title: string }[]
  newResources: { id: number; name: string; type: string; songTitle: string }[]
  newSongs: { id: number; title: string; artist?: string | null }[]
  upcomingRehearsals: { id: number; date: Date; location: string; startTime: string }[]
}

export async function sendWeeklyDigestEmail(
  to: string,
  memberName: string,
  groups: DigestGroup[],
  baseUrl: string
) {
  const groupsWithActivity = groups.filter(
    (g) => g.newGrilles.length > 0 || g.newResources.length > 0 || g.newSongs.length > 0 || g.upcomingRehearsals.length > 0
  )
  if (groupsWithActivity.length === 0) return

  const typeLabel: Record<string, string> = {
    PDF: '📄 PDF',
    AUDIO: '🎵 Audio',
    IMAGE: '🖼️ Image',
    GRILLE: '🎸 Grille',
    LIEN: '🔗 Lien',
    AUTRE: '📎 Fichier',
  }

  const groupsHtml = groupsWithActivity.map((g) => {
    const sections: string[] = []

    if (g.newGrilles.length > 0) {
      sections.push(`
        <p style="margin: 12px 0 6px; font-size: 12px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.05em;">🎸 Nouvelles grilles</p>
        ${g.newGrilles.map((gr) => `
          <p style="margin: 0 0 4px; font-size: 13px; color: #374151;">
            <a href="${baseUrl}/groupes/${g.id}/grilles/${gr.id}" style="color: #4f46e5; text-decoration: none;">${gr.title}</a>
          </p>
        `).join('')}
      `)
    }

    if (g.newResources.length > 0) {
      sections.push(`
        <p style="margin: 12px 0 6px; font-size: 12px; font-weight: 600; color: #1e40af; text-transform: uppercase; letter-spacing: 0.05em;">📁 Nouveaux fichiers & liens</p>
        ${g.newResources.map((r) => `
          <p style="margin: 0 0 4px; font-size: 13px; color: #374151;">
            ${typeLabel[r.type] || '📎'} <strong>${r.name}</strong>
            <span style="color: #9ca3af;"> — ${r.songTitle}</span>
          </p>
        `).join('')}
      `)
    }

    if (g.newSongs.length > 0) {
      sections.push(`
        <p style="margin: 12px 0 6px; font-size: 12px; font-weight: 600; color: #065f46; text-transform: uppercase; letter-spacing: 0.05em;">🎼 Nouveaux morceaux au répertoire</p>
        ${g.newSongs.map((s) => `
          <p style="margin: 0 0 4px; font-size: 13px; color: #374151;">
            ${s.title}${s.artist ? ` <span style="color: #9ca3af;">— ${s.artist}</span>` : ''}
          </p>
        `).join('')}
      `)
    }

    if (g.upcomingRehearsals.length > 0) {
      sections.push(`
        <p style="margin: 12px 0 6px; font-size: 12px; font-weight: 600; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.05em;">🗓️ Prochaines répétitions</p>
        ${g.upcomingRehearsals.map((r) => {
          const d = new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
          return `<p style="margin: 0 0 4px; font-size: 13px; color: #374151; text-transform: capitalize;">
            <a href="${baseUrl}/groupes/${g.id}/repetitions/${r.id}" style="color: #4f46e5; text-decoration: none;">${d}</a>
            à ${r.startTime} · ${r.location}
          </p>`
        }).join('')}
      `)
    }

    return `
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px;">
        <a href="${baseUrl}/groupes/${g.id}" style="text-decoration: none;">
          <p style="margin: 0 0 2px; font-size: 16px; font-weight: 700; color: #1e1b4b;">🎵 ${g.name}</p>
        </a>
        ${sections.join('')}
      </div>
    `
  }).join('')

  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to,
    subject: `Résumé de la semaine — Sol au piano 🎹`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; border-radius: 14px; margin-bottom: 12px;">
              <span style="font-size: 24px;">🎹</span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e1b4b;">Sol au piano</h1>
            <p style="margin: 6px 0 0; font-size: 13px; color: #6b7280;">Résumé de la semaine</p>
          </div>

          <h2 style="font-size: 17px; font-weight: 600; color: #111827; margin-bottom: 4px;">Bonjour ${memberName},</h2>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Voici ce qui s'est passé cette semaine dans vos groupes :
          </p>

          ${groupsHtml}

          <div style="text-align: center; margin-top: 24px; margin-bottom: 8px;">
            <a href="${baseUrl}/tableau-de-bord" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
              Accéder à la plateforme →
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 20px;">
            Vous recevez cet email car vous n'êtes pas connecté(e) depuis plus de 7 jours.<br/>
            <a href="${baseUrl}/profil" style="color: #6b7280;">Se désabonner du résumé hebdomadaire</a>
          </p>
        </div>
      </div>
    `,
  })
}

export async function sendMemberRemovedEmail(
  to: string,
  memberName: string,
  groupName: string,
  removedByName: string,
  baseUrl: string
) {
  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to,
    subject: `Vous avez été retiré(e) du groupe "${groupName}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; border-radius: 14px; margin-bottom: 12px;">
              <span style="font-size: 24px;">🎹</span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e1b4b;">Sol au piano</h1>
          </div>

          <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 4px;">Bonjour ${memberName},</h2>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            <strong>${removedByName}</strong> vous a retiré(e) du groupe <strong>${groupName}</strong> sur Sol au piano.
            Vous n'avez plus accès au contenu de ce groupe.
          </p>

          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #991b1b;">🚪 Retrait du groupe</p>
            <p style="margin: 0; font-size: 13px; color: #b91c1c;">Groupe : <strong>${groupName}</strong></p>
          </div>

          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin-bottom: 24px;">
            Si vous pensez qu'il s'agit d'une erreur, contactez directement le chef de votre groupe.
            Vous pouvez également rejoindre d'autres groupes ou en créer un nouveau depuis la plateforme.
          </p>

          <div style="text-align: center; margin-bottom: 20px;">
            <a href="${baseUrl}/groupes" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
              Voir mes groupes →
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            Sol au piano — La plateforme pour les musiciens en groupe
          </p>
        </div>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to,
    subject: 'Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; border-radius: 14px; margin-bottom: 12px;">
              <span style="font-size: 24px;">🎹</span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e1b4b;">Sol au piano</h1>
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

export async function sendRehearsalAutoReminderEmail(
  member: { email: string; name: string },
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
  const profileUrl = `${baseUrl}/profil`

  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to: member.email,
    subject: `Rappel — Répétition dans 5 jours · ${groupName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; border-radius: 14px; margin-bottom: 12px;">
              <span style="font-size: 24px;">🎹</span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e1b4b;">Sol au piano</h1>
          </div>

          <div style="display: inline-flex; align-items: center; gap: 6px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 6px 12px; margin-bottom: 20px;">
            <span style="font-size: 14px;">⏰</span>
            <span style="font-size: 12px; font-weight: 600; color: #92400e;">Rappel automatique — dans 5 jours</span>
          </div>

          <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 4px;">Bonjour ${member.name},</h2>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            Vous avez une répétition avec <strong>${groupName}</strong> dans <strong>5 jours</strong>. Pensez à confirmer votre présence !
          </p>

          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: #1e3a8a; text-transform: capitalize;">${dateStr}</p>
            <p style="margin: 0 0 4px; font-size: 13px; color: #1d4ed8;">🕐 ${timeStr}</p>
            <p style="margin: 0; font-size: 13px; color: #1d4ed8;">📍 ${rehearsal.location}</p>
            ${rehearsal.notes ? `<p style="margin: 8px 0 0; font-size: 12px; color: #6b7280; font-style: italic; border-top: 1px solid #bfdbfe; padding-top: 8px;">${rehearsal.notes}</p>` : ''}
          </div>

          <div style="text-align: center; margin-bottom: 20px;">
            <a href="${rehearsalUrl}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
              Indiquer ma présence
            </a>
          </div>

          <p style="color: #d1d5db; font-size: 11px; text-align: center; margin: 16px 0 0; border-top: 1px solid #f3f4f6; padding-top: 12px;">
            Vous recevez cet email automatiquement 5 jours avant chaque répétition.<br/>
            <a href="${profileUrl}" style="color: #6b7280; text-decoration: underline;">Se désabonner de ces rappels</a>
          </p>
        </div>
      </div>
    `,
  })
}

export async function sendAdminAnnonceNotification(annonce: {
  id: number
  title: string
  category: string
  location: string | null
  userName: string
  userEmail: string
}, adminEmail: string, baseUrl: string) {
  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to: adminEmail,
    subject: `🔔 Nouvelle annonce en attente de validation — ${annonce.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; border-radius: 14px; margin-bottom: 12px;">
              <span style="font-size: 24px;">🎹</span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e1b4b;">Sol au piano</h1>
            <p style="margin: 4px 0 0; font-size: 12px; color: #818cf8; font-style: italic;">du solo à l'orchestre</p>
          </div>
          <h2 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 8px;">Nouvelle annonce à valider</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px;">Une annonce vient d'être déposée et attend votre validation avant d'être publiée.</p>
          <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #111827;">${annonce.title}</p>
            <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280;">Catégorie : ${annonce.category}${annonce.location ? ' · ' + annonce.location : ''}</p>
            <p style="margin: 0; font-size: 13px; color: #6b7280;">Déposée par : <strong>${annonce.userName}</strong> (${annonce.userEmail})</p>
          </div>
          <a href="${baseUrl}/admin/annonces" style="display: inline-block; background: #4f46e5; color: white; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 10px; text-decoration: none;">
            Valider l'annonce →
          </a>
        </div>
      </div>
    `,
  })
}

export async function sendMemberAnnonceRefused(to: { email: string; name: string }, annonce: {
  id: number
  title: string
  adminComment?: string | null
}, baseUrl: string) {
  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to: to.email,
    subject: `Votre annonce "${annonce.title}" a été retirée`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; border-radius: 14px; margin-bottom: 12px;">
              <span style="font-size: 24px;">🎹</span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e1b4b;">Sol au piano</h1>
            <p style="margin: 4px 0 0; font-size: 12px; color: #818cf8; font-style: italic;">du solo à l'orchestre</p>
          </div>
          <h2 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 8px;">Annonce retirée</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">Bonjour ${to.name},</p>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">Votre annonce <strong>"${annonce.title}"</strong> a été retirée de la publication par l'administrateur.</p>
          ${annonce.adminComment ? `
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px; margin-bottom: 20px;">
            <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #dc2626;">Message de l'administrateur :</p>
            <p style="margin: 0; font-size: 13px; color: #b91c1c; font-style: italic;">${annonce.adminComment}</p>
          </div>` : ''}
          <p style="color: #6b7280; font-size: 13px; margin: 0 0 20px;">Vous pouvez modifier votre annonce et la soumettre à nouveau.</p>
          <a href="${baseUrl}/annonces/mes-annonces" style="display: inline-block; background: #4f46e5; color: white; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 10px; text-decoration: none;">
            Voir mes annonces →
          </a>
        </div>
      </div>
    `,
  })
}
