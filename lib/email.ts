import { Resend } from 'resend'
import { getEmailTemplate } from './get-email-template'
import { signPresence, signConcertPresence } from './presence-token'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─── Wrapper HTML commun ──────────────────────────────────────────────────────

function emailWrapper(body: string) {
  return `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
      <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; border-radius: 14px; margin-bottom: 12px;">
            <span style="font-size: 24px;">🎹</span>
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e1b4b;">Sol au piano</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #818cf8; font-style: italic;">du solo à l'orchestre</p>
        </div>
        ${body}
      </div>
    </div>
  `
}

function ctaButton(href: string, label: string) {
  return `
    <div style="text-align: center; margin: 24px 0 8px;">
      <a href="${href}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600;">
        ${label}
      </a>
    </div>
  `
}

function dataBox(content: string, color: 'blue' | 'green' | 'red' | 'gray' = 'blue') {
  const colors = {
    blue:  { bg: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a', muted: '#1d4ed8' },
    green: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', muted: '#15803d' },
    red:   { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', muted: '#b91c1c' },
    gray:  { bg: '#f9fafb', border: '#e5e7eb', text: '#111827', muted: '#6b7280' },
  }
  const c = colors[color]
  return `
    <div style="background: ${c.bg}; border: 1px solid ${c.border}; border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
      ${content}
    </div>
  `
}

// ─── 1. Nouvelle répétition ───────────────────────────────────────────────────

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

  const tpl = await getEmailTemplate('rehearsal_notification')

  await Promise.all(
    members.map(({ email, name }) => {
      const { subject, introHtml, outroHtml } = tpl.render({
        memberName: name,
        groupName,
        date: dateStr,
        time: timeStr,
        location: rehearsal.location,
      })

      return resend.emails.send({
        from: 'Sol au piano <noreply@solaupiano.fr>',
        to: email,
        subject,
        html: emailWrapper(`
          ${introHtml}
          ${dataBox(`
            <p style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #1e3a8a; text-transform: capitalize;">${dateStr}</p>
            <p style="margin: 0 0 4px; font-size: 13px; color: #1d4ed8;">🕐 ${timeStr}</p>
            <p style="margin: 0; font-size: 13px; color: #1d4ed8;">📍 ${rehearsal.location}</p>
            ${rehearsal.notes ? `<p style="margin: 8px 0 0; font-size: 12px; color: #6b7280; font-style: italic;">${rehearsal.notes}</p>` : ''}
          `)}
          ${outroHtml}
          ${ctaButton(rehearsalUrl, 'Indiquer ma présence')}
        `),
      })
    })
  )
}

// ─── Nouveau concert : demande de présence ──────────────────────────────────
export async function sendConcertNotification(
  members: { email: string; name: string; userId: number }[],
  groupName: string,
  groupId: number,
  concert: {
    id: number
    name: string
    date: Date
    location: string
    address?: string | null
    postalCode?: string | null
    city?: string | null
    startTime?: string | null
    notes?: string | null
  },
  baseUrl: string
) {
  const dateStr = new Date(concert.date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const addr = [concert.address, [concert.postalCode, concert.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const concertUrl = `${baseUrl}/groupes/${groupId}/concerts`

  await Promise.all(
    members.map(({ email, name, userId }) => {
      const presentUrl = `${baseUrl}/presence?c=${concert.id}&u=${userId}&t=${signConcertPresence(concert.id, userId)}&a=present`
      const absentUrl = `${baseUrl}/presence?c=${concert.id}&u=${userId}&t=${signConcertPresence(concert.id, userId)}&a=absent`

      return resend.emails.send({
        from: 'Sol au piano <noreply@solaupiano.fr>',
        to: email,
        subject: `🎭 Nouveau concert : ${concert.name}`,
        html: emailWrapper(`
          <p style="margin:0 0 10px; font-size:15px; color:#111;">Bonjour ${name},</p>
          <p style="margin:0 0 14px; font-size:14px; color:#374151;"><strong>${groupName}</strong> a programmé un concert. Serez-vous présent(e) ?</p>
          ${dataBox(`
            <p style="margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #6d28d9;">🎭 ${concert.name}</p>
            <p style="margin: 0 0 4px; font-size: 13px; color: #6d28d9; text-transform: capitalize;">${dateStr}${concert.startTime ? ` · ${concert.startTime}` : ''}</p>
            <p style="margin: 0; font-size: 13px; color: #6d28d9;">📍 ${concert.location}${addr ? ` — ${addr}` : ''}</p>
            ${concert.notes ? `<p style="margin: 8px 0 0; font-size: 12px; color: #6b7280; font-style: italic;">${concert.notes}</p>` : ''}
          `)}
          <div style="text-align:center; margin: 16px 0 6px;">
            <a href="${presentUrl}" style="display:inline-block; background:#16a34a; color:#fff; text-decoration:none; padding:11px 18px; border-radius:8px; font-weight:700; font-size:14px; margin:4px;">✅ Je serai présent(e)</a>
            <a href="${absentUrl}" style="display:inline-block; background:#dc2626; color:#fff; text-decoration:none; padding:11px 18px; border-radius:8px; font-weight:700; font-size:14px; margin:4px;">❌ Absent(e)</a>
          </div>
          <p style="text-align:center; margin: 6px 0 0; font-size: 13px; color: #6b7280;">
            Pas encore sûr ? <a href="${concertUrl}" style="color:#6d28d9; text-decoration:underline;">Répondre « Peut-être » sur la page du concert</a>
          </p>
        `),
      })
    })
  )
}

// ─── Nouveau sondage ─────────────────────────────────────────────────────────

export async function sendPollCreatedEmail(
  members: { email: string; name: string }[],
  groupName: string,
  groupId: number,
  poll: { id: number; title: string; options: { date: Date; note: string | null }[] },
  baseUrl: string
) {
  const url = `${baseUrl}/groupes/${groupId}/sondages/${poll.id}`
  const tpl = await getEmailTemplate('poll_created')
  const datesHtml = poll.options
    .map((o) => {
      const d = new Date(o.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      return `<p style="margin: 0 0 4px; font-size: 13px; color: #5b21b6; text-transform: capitalize;">📅 ${d}${o.note ? ` — <span style="text-transform:none;">${o.note}</span>` : ''}</p>`
    })
    .join('')

  await Promise.all(
    members.map(({ email, name }) => {
      const { subject, introHtml, outroHtml } = tpl.render({ memberName: name, groupName, pollTitle: poll.title })
      return resend.emails.send({
        from: 'Sol au piano <noreply@solaupiano.fr>',
        to: email,
        subject,
        html: emailWrapper(`
          ${introHtml}
          ${dataBox(`
            <p style="margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #5b21b6;">📊 ${poll.title}</p>
            ${datesHtml}
          `)}
          ${outroHtml}
          ${ctaButton(url, 'Répondre au sondage →')}
        `),
      })
    })
  )
}

// ─── Rappel d'auto-évaluation (lendemain de répétition) ──────────────────────

export async function sendEvaluationReminder(
  to: string,
  memberName: string,
  groupName: string,
  groupId: number,
  rehearsalId: number,
  userId: number,
  rehearsal: { date: Date; startTime: string; endTime?: string | null; location: string },
  baseUrl: string
) {
  const dateStr = new Date(rehearsal.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const url = `${baseUrl}/groupes/${groupId}/repetitions`
  const absentUrl = `${baseUrl}/presence?r=${rehearsalId}&u=${userId}&t=${signPresence(rehearsalId, userId)}&a=absent`
  const tpl = await getEmailTemplate('evaluation_reminder')
  const { subject, introHtml, outroHtml } = tpl.render({ memberName, groupName, date: dateStr })

  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to,
    subject,
    html: emailWrapper(`
      ${introHtml}
      ${dataBox(`
        <p style="margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #b45309; text-transform: capitalize;">⭐ ${dateStr}</p>
        <p style="margin: 0; font-size: 13px; color: #b45309;">📍 ${rehearsal.location}</p>
      `)}
      ${outroHtml}
      ${ctaButton(url, 'Laisser mon évaluation →')}
      <p style="text-align:center; margin: 14px 0 0; font-size: 13px; color: #6b7280;">
        Vous n'étiez finalement pas là ?
        <a href="${absentUrl}" style="color:#b91c1c; text-decoration:underline;">Me marquer absent(e)</a>
        — vous n'aurez alors rien à évaluer.
      </p>
    `),
  })
}

// ─── Alerte performance serveur (admin) ──────────────────────────────────────

export async function sendPerfAlert(to: string, metric: string, detail: string, baseUrl: string) {
  const tpl = await getEmailTemplate('perf_alert')
  const { subject, introHtml, outroHtml } = tpl.render({ metric, detail })
  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to,
    subject,
    html: emailWrapper(`
      ${introHtml}
      ${dataBox(`<p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#991b1b;">⚠️ ${metric}</p><p style="margin:0;font-size:13px;color:#b91c1c;">${detail}</p>`, 'red')}
      ${outroHtml}
      ${ctaButton(`${baseUrl}/admin/performance`, 'Voir la performance →')}
    `),
  })
}

// ─── Rappel d'évaluation de concert (lendemain) ──────────────────────────────

export async function sendConcertEvaluationReminder(
  to: string,
  memberName: string,
  groupName: string,
  groupId: number,
  concertId: number,
  userId: number,
  concert: { name: string; date: Date; location: string },
  baseUrl: string
) {
  const dateStr = new Date(concert.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const url = `${baseUrl}/groupes/${groupId}/concerts`
  const absentUrl = `${baseUrl}/presence?c=${concertId}&u=${userId}&t=${signConcertPresence(concertId, userId)}&a=absent`
  const tpl = await getEmailTemplate('concert_evaluation_reminder')
  const { subject, introHtml, outroHtml } = tpl.render({ memberName, groupName, concertName: concert.name, date: dateStr })

  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to,
    subject,
    html: emailWrapper(`
      ${introHtml}
      ${dataBox(`
        <p style="margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #6d28d9;">🎭 ${concert.name}</p>
        <p style="margin: 0 0 4px; font-size: 13px; color: #6d28d9; text-transform: capitalize;">${dateStr}</p>
        <p style="margin: 0; font-size: 13px; color: #6d28d9;">📍 ${concert.location}</p>
      `)}
      ${outroHtml}
      ${ctaButton(url, 'Laisser mon évaluation →')}
      <p style="text-align:center; margin: 14px 0 0; font-size: 13px; color: #6b7280;">
        Vous n'étiez finalement pas là ?
        <a href="${absentUrl}" style="color:#b91c1c; text-decoration:underline;">Me marquer absent(e)</a>
        — vous n'aurez alors rien à évaluer.
      </p>
    `),
  })
}

// ─── 2. Rappel automatique répétition ────────────────────────────────────────

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

  const tpl = await getEmailTemplate('rehearsal_auto_reminder')
  const { subject, introHtml, outroHtml } = tpl.render({
    memberName: member.name,
    groupName,
    date: dateStr,
    time: timeStr,
    location: rehearsal.location,
  })

  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to: member.email,
    subject,
    html: emailWrapper(`
      <div style="display: inline-flex; align-items: center; gap: 6px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 6px 12px; margin-bottom: 20px;">
        <span style="font-size: 14px;">⏰</span>
        <span style="font-size: 12px; font-weight: 600; color: #92400e;">Rappel automatique — dans 5 jours</span>
      </div>
      ${introHtml}
      ${dataBox(`
        <p style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: #1e3a8a; text-transform: capitalize;">${dateStr}</p>
        <p style="margin: 0 0 4px; font-size: 13px; color: #1d4ed8;">🕐 ${timeStr}</p>
        <p style="margin: 0; font-size: 13px; color: #1d4ed8;">📍 ${rehearsal.location}</p>
        ${rehearsal.notes ? `<p style="margin: 8px 0 0; font-size: 12px; color: #6b7280; font-style: italic; border-top: 1px solid #bfdbfe; padding-top: 8px;">${rehearsal.notes}</p>` : ''}
      `)}
      ${outroHtml}
      ${ctaButton(rehearsalUrl, 'Indiquer ma présence')}
      <p style="color: #d1d5db; font-size: 11px; text-align: center; margin: 16px 0 0; border-top: 1px solid #f3f4f6; padding-top: 12px;">
        Vous recevez cet email automatiquement 5 jours avant chaque répétition.<br/>
        <a href="${profileUrl}" style="color: #6b7280; text-decoration: underline;">Se désabonner de ces rappels</a>
      </p>
    `),
  })
}

// ─── 3. Rappel de présence ────────────────────────────────────────────────────

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

  const tpl = await getEmailTemplate('attendance_reminder')

  await Promise.all(
    members.map(({ email, name }) => {
      const { subject, introHtml, outroHtml } = tpl.render({
        memberName: name,
        groupName,
        date: dateStr,
      })

      return resend.emails.send({
        from: 'Sol au piano <noreply@solaupiano.fr>',
        to: email,
        subject,
        html: emailWrapper(`
          ${introHtml}
          ${dataBox(`
            <p style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #1e3a8a; text-transform: capitalize;">${dateStr}</p>
            <p style="margin: 0 0 4px; font-size: 13px; color: #1d4ed8;">🕐 ${timeStr}</p>
            <p style="margin: 0; font-size: 13px; color: #1d4ed8;">📍 ${rehearsal.location}</p>
          `)}
          ${outroHtml}
          ${ctaButton(rehearsalUrl, 'Indiquer ma présence')}
        `),
      })
    })
  )
}

// ─── 4. Bienvenue dans le groupe ──────────────────────────────────────────────

export async function sendGroupWelcomeEmail(
  to: string,
  memberName: string,
  groupName: string,
  groupId: number,
  addedByName: string,
  baseUrl: string
) {
  const groupUrl = `${baseUrl}/groupes/${groupId}`
  const tpl = await getEmailTemplate('group_welcome')
  const { subject, introHtml, outroHtml } = tpl.render({ memberName, groupName })

  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to,
    subject,
    html: emailWrapper(`
      ${introHtml}
      ${dataBox(`
        <p style="margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #1e3a8a;">🎵 ${groupName}</p>
        <p style="margin: 0; font-size: 13px; color: #3b82f6;">Ajouté(e) par ${addedByName}</p>
      `)}
      ${outroHtml}
      ${ctaButton(groupUrl, 'Accéder au groupe →')}
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 12px 0 0;">
        Vous recevrez un résumé hebdomadaire des nouveautés du groupe chaque vendredi.
        Vous pouvez vous désabonner depuis votre <a href="${baseUrl}/profil" style="color: #6b7280;">profil</a>.
      </p>
    `),
  })
}

// ─── 5. Membre retiré du groupe ───────────────────────────────────────────────

export async function sendMemberRemovedEmail(
  to: string,
  memberName: string,
  groupName: string,
  removedByName: string,
  baseUrl: string
) {
  const tpl = await getEmailTemplate('member_removed')
  const { subject, introHtml, outroHtml } = tpl.render({ memberName, groupName })

  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to,
    subject,
    html: emailWrapper(`
      ${introHtml}
      ${dataBox(`
        <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #991b1b;">🚪 Retrait du groupe</p>
        <p style="margin: 0 0 4px; font-size: 13px; color: #b91c1c;">Groupe : <strong>${groupName}</strong></p>
        <p style="margin: 0; font-size: 13px; color: #b91c1c;">Retiré(e) par : ${removedByName}</p>
      `, 'red')}
      ${outroHtml}
      ${ctaButton(`${baseUrl}/groupes`, 'Voir mes groupes →')}
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 12px 0 0;">
        Sol au piano — La plateforme pour les musiciens en groupe
      </p>
    `),
  })
}

// ─── 6. Invitation ────────────────────────────────────────────────────────────

export async function sendInvitationEmail(to: string, fromName: string, personalMessage: string | null, signupUrl: string) {
  const tpl = await getEmailTemplate('invitation')
  const { subject, introHtml, outroHtml } = tpl.render({ fromName })

  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to,
    subject,
    html: emailWrapper(`
      ${introHtml}
      ${personalMessage ? `
      <div style="background: #f5f3ff; border-left: 4px solid #7c3aed; border-radius: 0 8px 8px 0; padding: 14px 18px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #4c1d95; font-style: italic;">"${personalMessage}"</p>
        <p style="margin: 8px 0 0; font-size: 12px; color: #7c3aed; font-weight: 600;">— ${fromName}</p>
      </div>
      ` : ''}
      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 12px; font-size: 13px; font-weight: 600; color: #374151;">Avec Sol au piano, vous pouvez :</p>
        <ul style="margin: 0; padding: 0; list-style: none;">
          <li style="font-size: 13px; color: #4b5563; margin-bottom: 8px;">🗓️ &nbsp;Organiser et planifier vos répétitions</li>
          <li style="font-size: 13px; color: #4b5563; margin-bottom: 8px;">🎵 &nbsp;Gérer le répertoire de vos morceaux</li>
          <li style="font-size: 13px; color: #4b5563; margin-bottom: 8px;">📁 &nbsp;Partager partitions, grilles et fichiers audio</li>
          <li style="font-size: 13px; color: #4b5563;">✅ &nbsp;Suivre votre préparation morceau par morceau</li>
        </ul>
      </div>
      ${outroHtml}
      ${ctaButton(signupUrl, 'Créer mon compte gratuitement')}
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 12px 0 0;">
        Si vous n'êtes pas musicien ou ne souhaitez pas rejoindre Sol au piano, ignorez simplement cet email.
      </p>
    `),
  })
}

// ─── 7. Vérification email ────────────────────────────────────────────────────

export async function sendEmailVerification(to: string, name: string, verifyUrl: string) {
  const tpl = await getEmailTemplate('email_verification')
  const { subject, introHtml, outroHtml } = tpl.render({ userName: name })

  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to,
    subject,
    html: emailWrapper(`
      ${introHtml}
      ${ctaButton(verifyUrl, 'Confirmer mon email')}
      ${outroHtml}
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 12px 0 0;">
        Si vous n'avez pas créé de compte sur Sol au piano, ignorez cet email.
      </p>
    `),
  })
}

// ─── 8. Réinitialisation mot de passe ─────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  const tpl = await getEmailTemplate('password_reset')
  const { subject, introHtml, outroHtml } = tpl.render({ userName: name })

  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to,
    subject,
    html: emailWrapper(`
      ${introHtml}
      ${ctaButton(resetUrl, 'Réinitialiser mon mot de passe')}
      ${outroHtml}
    `),
  })
}

// ─── 9. Nouvelle inscription (admin) ─────────────────────────────────────────

export async function sendNewUserNotification(adminEmail: string, newUser: { name: string; email: string }) {
  const tpl = await getEmailTemplate('new_user_admin')
  const { subject, introHtml, outroHtml } = tpl.render({
    userName: newUser.name,
    userEmail: newUser.email,
  })

  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to: adminEmail,
    subject,
    html: emailWrapper(`
      ${introHtml}
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 20px 0;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 40%;">Nom</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500;">${newUser.name}</td>
        </tr>
        <tr style="border-top: 1px solid #f3f4f6;">
          <td style="padding: 8px 0; color: #6b7280;">Email</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500;">${newUser.email}</td>
        </tr>
      </table>
      ${outroHtml}
      ${ctaButton('https://solaupiano.fr/admin/utilisateurs', 'Voir les utilisateurs')}
    `),
  })
}

// ─── 10. Résumé hebdomadaire ──────────────────────────────────────────────────

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
    PDF: '📄 PDF', AUDIO: '🎵 Audio', IMAGE: '🖼️ Image',
    GRILLE: '🎸 Grille', LIEN: '🔗 Lien', AUTRE: '📎 Fichier',
  }

  const weekStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const tpl = await getEmailTemplate('weekly_digest')
  const { subject, introHtml, outroHtml } = tpl.render({ memberName, week: weekStr })

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
    subject,
    html: emailWrapper(`
      ${introHtml}
      ${groupsHtml}
      ${outroHtml}
      ${ctaButton(`${baseUrl}/tableau-de-bord`, 'Accéder à la plateforme →')}
      <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 20px;">
        Vous recevez cet email car vous n'êtes pas connecté(e) depuis plus de 7 jours.<br/>
        <a href="${baseUrl}/profil" style="color: #6b7280;">Se désabonner du résumé hebdomadaire</a>
      </p>
    `),
  })
}

// ─── 11. Nouvelle annonce à valider (admin) ───────────────────────────────────

export async function sendAdminAnnonceNotification(annonce: {
  id: number
  title: string
  category: string
  location: string | null
  userName: string
  userEmail: string
}, adminEmail: string, baseUrl: string) {
  const tpl = await getEmailTemplate('annonce_admin')
  const { subject, introHtml, outroHtml } = tpl.render({
    annonceTitle: annonce.title,
    category: annonce.category,
    userName: annonce.userName,
    userEmail: annonce.userEmail,
  })

  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to: adminEmail,
    subject,
    html: emailWrapper(`
      ${introHtml}
      ${dataBox(`
        <p style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #111827;">${annonce.title}</p>
        <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280;">Catégorie : ${annonce.category}${annonce.location ? ' · ' + annonce.location : ''}</p>
        <p style="margin: 0; font-size: 13px; color: #6b7280;">Déposée par : <strong>${annonce.userName}</strong> (${annonce.userEmail})</p>
      `, 'gray')}
      ${outroHtml}
      ${ctaButton(`${baseUrl}/admin/annonces`, 'Valider l\'annonce →')}
    `),
  })
}

// ─── 12. Ticket de support (admin + confirmation utilisateur) ────────────────

const CATEGORY_LABELS: Record<string, string> = {
  BUG: '🐛 Bug / Problème technique',
  QUESTION: '❓ Question d\'utilisation',
  FEATURE: '💡 Suggestion de fonctionnalité',
  OTHER: '📩 Autre',
}

export async function sendSupportTicketToAdmin(
  adminEmail: string,
  ticket: {
    id: number
    userName: string
    userEmail: string
    subject: string
    message: string
    category: string
    isPriority: boolean
  },
  baseUrl: string
) {
  const priorityBadge = ticket.isPriority
    ? `<div style="display:inline-flex;align-items:center;gap:6px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:5px 12px;margin-bottom:16px;">
        <span style="font-size:13px;">⭐</span>
        <span style="font-size:12px;font-weight:600;color:#92400e;">Support prioritaire (plan payant)</span>
       </div>`
    : ''

  const tpl = await getEmailTemplate('support_ticket_admin')
  const { subject, introHtml, outroHtml } = tpl.render({
    ticketId: String(ticket.id),
    ticketSubject: ticket.subject,
    category: CATEGORY_LABELS[ticket.category] ?? ticket.category,
    userName: ticket.userName,
    userEmail: ticket.userEmail,
  })

  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to: adminEmail,
    subject,
    html: emailWrapper(`
      ${introHtml}
      <p style="font-size:13px;color:#6b7280;margin:0 0 20px;">${CATEGORY_LABELS[ticket.category] ?? ticket.category}</p>
      ${priorityBadge}
      ${dataBox(`
        <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#111827;">${ticket.subject}</p>
        <p style="margin:0 0 10px;font-size:13px;color:#374151;white-space:pre-wrap;">${ticket.message}</p>
        <p style="margin:0;font-size:12px;color:#6b7280;">De : <strong>${ticket.userName}</strong> &lt;${ticket.userEmail}&gt;</p>
      `, 'gray')}
      ${ctaButton(`${baseUrl}/admin/support`, 'Voir les tickets →')}
      ${outroHtml}
    `),
  })
}

export async function sendSupportConfirmationToUser(
  to: string,
  userName: string,
  ticket: { id: number; subject: string; isPriority: boolean },
  baseUrl: string
) {
  const delayText = ticket.isPriority
    ? 'En tant que membre d\'un plan avec support prioritaire, votre demande sera traitée en priorité.'
    : 'Nous traitons les demandes dans l\'ordre d\'arrivée, généralement sous 24–48h.'

  const tpl = await getEmailTemplate('support_confirmation')
  const { subject, introHtml, outroHtml } = tpl.render({
    userName,
    ticketId: String(ticket.id),
    ticketSubject: ticket.subject,
  })

  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to,
    subject,
    html: emailWrapper(`
      ${introHtml}
      ${dataBox(`
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Ticket <strong>#${ticket.id}</strong></p>
        <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${ticket.subject}</p>
      `)}
      <p style="font-size:13px;color:#374151;margin:16px 0;">${delayText}</p>
      ${ctaButton(`${baseUrl}/assistance`, 'Voir mes demandes →')}
      ${outroHtml}
    `),
  })
}

// ─── Réponse de l'admin à un ticket (→ membre) ────────────────────────────────
export async function sendSupportReply(
  to: string,
  userName: string,
  ticket: { id: number; subject: string; reply: string },
  baseUrl: string
) {
  const tpl = await getEmailTemplate('support_reply')
  const { subject, introHtml, outroHtml } = tpl.render({
    userName,
    ticketId: String(ticket.id),
    ticketSubject: ticket.subject,
    adminReply: ticket.reply,
  })
  const safeReply = ticket.reply.replace(/</g, '&lt;').replace(/>/g, '&gt;')

  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to,
    subject,
    html: emailWrapper(`
      ${introHtml}
      ${dataBox(`
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Votre demande #${ticket.id}</p>
        <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827;">${ticket.subject}</p>
        <p style="margin:0;font-size:13px;color:#374151;white-space:pre-wrap;border-top:1px solid #e5e7eb;padding-top:12px;">${safeReply}</p>
      `, 'blue')}
      ${ctaButton(`${baseUrl}/assistance`, 'Voir ma demande →')}
      ${outroHtml}
    `),
  })
}

// ─── 13. Annonce refusée / retirée (membre) ───────────────────────────────────

export async function sendMemberAnnonceRefused(to: { email: string; name: string }, annonce: {
  id: number
  title: string
  adminComment?: string | null
}, baseUrl: string) {
  const tpl = await getEmailTemplate('annonce_refused')
  const { subject, introHtml, outroHtml } = tpl.render({
    memberName: to.name,
    annonceTitle: annonce.title,
    adminComment: annonce.adminComment ?? '',
  })

  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to: to.email,
    subject,
    html: emailWrapper(`
      ${introHtml}
      ${annonce.adminComment ? `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px; margin: 16px 0;">
        <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #dc2626;">Message de l'administrateur :</p>
        <p style="margin: 0; font-size: 13px; color: #b91c1c; font-style: italic;">${annonce.adminComment}</p>
      </div>
      ` : ''}
      ${outroHtml}
      ${ctaButton(`${baseUrl}/annonces/mes-annonces`, 'Voir mes annonces →')}
    `),
  })
}
