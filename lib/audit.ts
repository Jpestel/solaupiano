/**
 * Journal d'activité des groupes : qui a fait quoi, quand.
 *
 * Principe : le journal est branché UNE FOIS sur le client de base de données
 * partagé (voir lib/prisma.ts), et non ajouté route par route. Toute écriture
 * (création, modification, suppression) sur un élément de groupe passe par
 * `$use` ci-dessous et laisse une ligne dans GroupActivity. Une nouvelle route ou
 * un nouvel écran qui écrit sur un de ces modèles est donc tracé sans qu'on ait
 * à y penser — l'oubli d'une instrumentation manuelle n'est pas possible.
 *
 * Ce qui n'est PAS tracé : les lectures, les actions système (rappels, tâches
 * planifiées : pas d'auteur), les messages du tchat (volume et vie privée), la
 * progression personnelle d'un musicien sur un morceau.
 *
 * L'auteur est lu dans la session de la requête en cours. Hors requête, ou sans
 * session, on ne journalise rien plutôt que d'inventer un auteur.
 */
import type { PrismaClient } from '@prisma/client'
import { AsyncLocalStorage } from 'async_hooks'
import { AUDIT_ENTITIES, ATTENDANCE_LABELS, FIELD_LABELS, IGNORED_KEYS, type AuditEntity } from './audit-labels'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'
export interface Actor { id: number; name: string }

const BY_MODEL = new Map<string, AuditEntity>(AUDIT_ENTITIES.map((e) => [e.model, e]))

const WRITE_ACTIONS: Record<string, AuditAction> = {
  create: 'CREATE', createMany: 'CREATE',
  update: 'UPDATE', updateMany: 'UPDATE', upsert: 'UPDATE',
  delete: 'DELETE', deleteMany: 'DELETE',
}

/** Une même personne qui modifie plusieurs fois le même élément en moins de 10 min = une seule ligne. */
const COALESCE_MS = 10 * 60 * 1000
/** Durée de conservation du journal. */
export const AUDIT_RETENTION_DAYS = 365
/** Délai avant d'écrire le journal d'une action faite dans une transaction. */
const TRANSACTION_DELAY_MS = 1500

// ─── Auteur ──────────────────────────────────────────────────────────────────

const actorStore = new AsyncLocalStorage<Actor>()

/**
 * Désigne explicitement l'auteur le temps d'un traitement : pour les flux sans
 * session, comme la réponse de présence depuis un lien signé reçu par e-mail.
 */
export function runAsActor<T>(actor: Actor, fn: () => PromiseLike<T>): Promise<T> {
  // `await` DANS le contexte : une requête Prisma ne part qu'au moment où on l'attend,
  // donc sans cela elle s'exécuterait après la sortie du contexte, sans auteur.
  return actorStore.run(actor, async () => await fn())
}

async function sessionActor(): Promise<Actor | null> {
  const forced = actorStore.getStore()
  if (forced) return forced
  try {
    // Import dynamique : lib/auth dépend de prisma, qui dépend de ce fichier.
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('./auth')
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return null
    return { id: Number(session.user.id), name: session.user.name ?? 'Un membre' }
  } catch {
    return null // hors requête (cron, script) : pas d'auteur, pas de trace
  }
}

let actorResolver: () => Promise<Actor | null> = sessionActor
/** Pour les tests : remplace la lecture de la session. */
export function setActorResolver(fn: (() => Promise<Actor | null>) | null) {
  actorResolver = fn ?? sessionActor
}

// ─── Briques pures (testables sans base) ─────────────────────────────────────

const fmtDate = (d: unknown): string => {
  const dt = new Date(d as string)
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })
}

/** Premier libellé lisible d'un enregistrement (titre, nom, légende…). */
export function recordName(rec: unknown): string {
  const r = rec as Record<string, unknown> | null
  for (const k of ['title', 'name', 'caption', 'label']) {
    const v = r?.[k]
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 80)
  }
  return ''
}

/** Champs réellement modifiés, hors bruit (dates de mise à jour, quotas, ordre d'affichage…). */
export function changedKeys(data: unknown): string[] {
  if (!data || typeof data !== 'object') return []
  return Object.keys(data as object).filter((k) => !IGNORED_KEYS.has(k))
}

/** « date, lieu » : traduit, sans doublon, en omettant les champs sans libellé. */
export function changedLabels(keys: string[]): string[] {
  return Array.from(new Set(keys.map((k) => FIELD_LABELS[k]).filter(Boolean)))
}

const VERBS: Record<AuditAction, string> = { CREATE: 'a ajouté', UPDATE: 'a modifié', DELETE: 'a supprimé' }

/** Phrase générique : « a modifié le morceau « Titre » (titre, artiste) ». */
export function genericSummary(spec: AuditEntity, action: AuditAction, rec: unknown, keys: string[]): string {
  const name = recordName(rec)
  let s = `${VERBS[action]} ${spec.label}${name ? ` « ${name} »` : ''}`
  if (action === 'UPDATE') {
    const labels = changedLabels(keys)
    if (labels.length) s += ` (${labels.join(', ')})`
  }
  return s
}

// ─── Recherche du groupe et de la phrase, selon le modèle ────────────────────

type Db = PrismaClient

interface Resolved { groupId: number | null; /** « la répétition du 20/10/2026 », « le concert « Fête » »… */ subject?: string }

async function resolveGroup(db: Db, model: string, rec: any, args: any): Promise<Resolved> {
  const where = args?.where
  if (model === 'Group') return { groupId: rec?.id ?? where?.id ?? null }
  if (typeof rec?.groupId === 'number') return { groupId: rec.groupId }
  if (typeof where?.groupId === 'number') return { groupId: where.groupId }

  if (model === 'Attendance' || model === 'RehearsalSong') {
    const rid = rec?.rehearsalId ?? where?.rehearsalId ?? where?.userId_rehearsalId?.rehearsalId ?? where?.rehearsalId_songId?.rehearsalId
    if (typeof rid === 'number') {
      const r = await db.rehearsal.findUnique({ where: { id: rid }, select: { groupId: true, date: true } })
      if (r) return { groupId: r.groupId, subject: `la répétition du ${fmtDate(r.date)}` }
    }
  }
  if (model === 'ConcertAttendance') {
    const cid = rec?.concertId ?? where?.concertId ?? where?.userId_concertId?.concertId
    if (typeof cid === 'number') {
      const c = await db.concert.findUnique({ where: { id: cid }, select: { groupId: true, name: true } })
      if (c) return { groupId: c.groupId, subject: `le concert « ${c.name} »` }
    }
  }
  if (model === 'SetlistSong') {
    const sid = rec?.setlistId ?? where?.setlistId ?? where?.setlistId_songId?.setlistId
    if (typeof sid === 'number') {
      const l = await db.setlist.findUnique({ where: { id: sid }, select: { groupId: true, name: true } })
      if (l) return { groupId: l.groupId, subject: `la setlist « ${l.name} »` }
    }
  }
  if (model === 'PollVote') {
    const oid = rec?.optionId ?? where?.optionId
    if (typeof oid === 'number') {
      const o = await db.pollOption.findUnique({ where: { id: oid }, select: { poll: { select: { groupId: true, title: true } } } })
      if (o?.poll) return { groupId: o.poll.groupId, subject: `le sondage « ${o.poll.title} »` }
    }
  }
  if (model === 'Task') {
    const lid = rec?.taskListId ?? where?.taskListId
    if (typeof lid === 'number') {
      const l = await db.taskList.findUnique({ where: { id: lid }, select: { groupId: true, title: true } })
      if (l) return { groupId: l.groupId, subject: `la liste « ${l.title} »` }
    }
  }
  if (model === 'Resource') {
    const sid = rec?.songId ?? where?.songId
    if (typeof sid === 'number') {
      const s = await db.song.findUnique({ where: { id: sid }, select: { groupId: true } })
      if (s) return { groupId: s.groupId }
    }
  }
  return { groupId: null }
}

const userName = async (db: Db, id: unknown): Promise<string> => {
  if (typeof id !== 'number') return 'un membre'
  const u = await db.user.findUnique({ where: { id }, select: { name: true } })
  return (u?.name ?? '').trim() || 'un membre'
}

async function summarize(
  db: Db, spec: AuditEntity, action: AuditAction, rec: any, args: any, actor: Actor, resolved: Resolved, many: boolean, count: number, isUpsert: boolean,
): Promise<string | null> {
  const data = args?.data ?? args?.update
  const keys = changedKeys(data)

  // Une modification qui ne touche que du bruit n'est pas une action à tracer. Sauf pour
  // un `upsert` : sa partie « mise à jour » peut être vide alors que la ligne vient
  // d'être CRÉÉE (c'est ainsi que se fait un vote de sondage).
  if (action === 'UPDATE' && !isUpsert && data && typeof data === 'object' && keys.length === 0) return null

  if (many) {
    if (count <= 0) return null
    return `${VERBS[action]} ${count} élément${count > 1 ? 's' : ''} (${spec.filter})`
  }

  const rehearsalPart = resolved.subject ?? 'une répétition'

  switch (spec.key) {
    case 'rehearsal': {
      const d = fmtDate(rec?.date)
      const base = `${VERBS[action]} la répétition${d ? ` du ${d}` : ''}`
      const labels = action === 'UPDATE' ? changedLabels(keys) : []
      return labels.length ? `${base} (${labels.join(', ')})` : base
    }
    case 'attendance': {
      const status = rec?.status ?? data?.status
      const label = ATTENDANCE_LABELS[status as string] ?? ''
      const own = rec?.userId === actor.id
      if (action === 'DELETE') return `a retiré ${own ? 'sa présence' : await userName(db, rec?.userId)} de ${rehearsalPart}`
      if (own) return `a répondu « ${label || 'présence'} » pour ${rehearsalPart}`
      const who = await userName(db, rec?.userId)
      return action === 'CREATE'
        ? `a ajouté ${who} à ${rehearsalPart}${label ? ` (« ${label} »)` : ''}`
        : `a défini « ${label || 'présence'} » pour ${who} (${rehearsalPart})`
    }
    case 'concert_attendance': {
      const label = ATTENDANCE_LABELS[(rec?.status ?? data?.status) as string] ?? ''
      const subject = resolved.subject ?? 'un concert'
      const own = rec?.userId === actor.id
      if (action === 'DELETE') return `a retiré ${own ? 'sa présence' : await userName(db, rec?.userId)} de ${subject}`
      if (own) return `a répondu « ${label || 'présence'} » pour ${subject}`
      const who = await userName(db, rec?.userId)
      return action === 'CREATE'
        ? `a ajouté ${who} à ${subject}${label ? ` (« ${label} »)` : ''}`
        : `a défini « ${label || 'présence'} » pour ${who} (${subject})`
    }
    case 'setlist_song': {
      const song = typeof rec?.songId === 'number' ? await db.song.findUnique({ where: { id: rec.songId }, select: { title: true } }) : null
      const t = song?.title ? ` « ${song.title} »` : ''
      const subject = resolved.subject ?? 'une setlist'
      if (action === 'CREATE') return `a ajouté le morceau${t} à ${subject}`
      if (action === 'DELETE') return `a retiré le morceau${t} de ${subject}`
      return `a réorganisé ${subject}`
    }
    case 'poll_vote': {
      const subject = resolved.subject ?? 'un sondage'
      return action === 'DELETE' ? `a retiré son vote de ${subject}` : `a voté pour ${subject}`
    }
    case 'task': {
      const name = recordName({ title: rec?.label })
      const t = name ? ` « ${name} »` : ''
      const subject = resolved.subject ? ` (${resolved.subject})` : ''
      if (action === 'CREATE') return `a ajouté la tâche${t}${subject}`
      if (action === 'DELETE') return `a supprimé la tâche${t}${subject}`
      if (typeof data?.done === 'boolean') return `a marqué la tâche${t} comme ${data.done ? 'faite' : 'à faire'}${subject}`
      return `a modifié la tâche${t}${subject}`
    }
    case 'rehearsal_song': {
      const song = typeof rec?.songId === 'number' ? await db.song.findUnique({ where: { id: rec.songId }, select: { title: true } }) : null
      const t = song?.title ? ` « ${song.title} »` : ''
      if (action === 'CREATE') return `a ajouté le morceau${t} au programme de ${rehearsalPart}`
      if (action === 'DELETE') return `a retiré le morceau${t} du programme de ${rehearsalPart}`
      return `a réorganisé le programme de ${rehearsalPart}`
    }
    case 'member': {
      const own = rec?.userId === actor.id
      const who = own ? '' : await userName(db, rec?.userId)
      if (action === 'CREATE') return own ? 'a rejoint le groupe' : `a ajouté ${who} au groupe`
      if (action === 'DELETE') return own ? 'a quitté le groupe' : `a retiré ${who} du groupe`
      const role = data?.groupRole
      if (role) return `a changé le rôle de ${own ? 'son compte' : who} : ${role === 'CHEF' ? 'chef' : 'membre'}`
      return `a modifié ${own ? 'ses préférences de membre' : `le membre ${who}`}`
    }
    case 'group': {
      if (action === 'CREATE') return 'a créé le groupe'
      if (action === 'DELETE') return null // le groupe disparaît avec son journal
      if (keys.includes('inviteToken')) return "a régénéré le lien d'invitation"
      const labels = changedLabels(keys)
      return `a modifié les paramètres du groupe${labels.length ? ` (${labels.join(', ')})` : ''}`
    }
    default:
      return genericSummary(spec, action, rec, keys)
  }
}

// ─── Écriture du journal ─────────────────────────────────────────────────────

async function record(db: Db, spec: AuditEntity, params: any, result: any, actor: Actor, afterTransaction: boolean): Promise<void> {
  const action = WRITE_ACTIONS[params.action]
  const many = params.action.endsWith('Many')
  // La liste des présences créées en bloc avec la répétition est déjà couverte par
  // « a ajouté la répétition » : on ne la détaille pas.
  if ((spec.key === 'attendance' || spec.key === 'concert_attendance') && params.action === 'createMany') return
  if (spec.key === 'group' && action === 'DELETE') return

  const rec = many ? null : result
  const resolved = await resolveGroup(db, params.model, rec, params.args)
  if (typeof resolved.groupId !== 'number') return

  const count = many ? Number(result?.count ?? 0) : 1
  const summary = await summarize(db, spec, action, rec, params.args, actor, resolved, many, count, params.action === 'upsert')
  if (!summary) return

  const entityId = !many && typeof rec?.id === 'number' ? (rec.id as number) : null

  // Écrit après une transaction : si elle a été annulée, l'élément n'existe pas et
  // il ne faut rien tracer. (Pour une suppression, il n'y a rien à vérifier.)
  if (afterTransaction && action !== 'DELETE' && entityId !== null) {
    const delegate = params.model.charAt(0).toLowerCase() + params.model.slice(1)
    const still = await (db as any)[delegate].findUnique({ where: { id: entityId }, select: { id: true } })
    if (!still) return
  }

  const base = {
    groupId: resolved.groupId, userId: actor.id, actorName: actor.name.trim().slice(0, 120) || 'Un membre',
    action, entityType: spec.key, entityId, summary: summary.slice(0, 400),
  }

  // Modifications répétées du même élément par la même personne : une seule ligne,
  // remise à l'heure (sinon l'enregistrement automatique d'une grille en créerait des centaines).
  // On ne fusionne que des phrases IDENTIQUES : changer le titre puis le contenu, ou
  // régénérer le lien d'invitation puis modifier les paramètres, ce sont deux actions.
  // Vaut aussi pour les éléments sans identifiant simple (programme d'une répétition :
  // trois réorganisations de suite ne font pas trois lignes). Pour une présence, deux
  // réponses identiques de suite n'en font qu'une ; une réponse différente est une autre ligne.
  if (action === 'UPDATE') {
    const recent = await db.groupActivity.findFirst({
      where: { groupId: base.groupId, userId: base.userId, entityType: base.entityType, entityId, action: 'UPDATE',
               summary: base.summary, createdAt: { gt: new Date(Date.now() - COALESCE_MS) } },
      orderBy: { createdAt: 'desc' }, select: { id: true },
    })
    if (recent) {
      await db.groupActivity.update({ where: { id: recent.id }, data: { createdAt: new Date() } })
      return
    }
  }
  await db.groupActivity.create({ data: base })

  // Purge opportuniste : pas de tâche planifiée à tenir côté serveur.
  if (Math.random() < 0.01) {
    await db.groupActivity.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - AUDIT_RETENTION_DAYS * 86400000) } } })
  }
}

/** Branche le journal sur un client Prisma (une seule fois par client). */
export function attachAudit(client: PrismaClient): void {
  const c = client as unknown as { __auditAttached?: boolean }
  if (c.__auditAttached) return
  c.__auditAttached = true

  client.$use(async (params, next) => {
    const spec = params.model ? BY_MODEL.get(params.model) : undefined
    if (!spec || !(params.action in WRITE_ACTIONS)) return next(params)

    const result = await next(params)
    try {
      // L'auteur se lit dans la session de la requête en cours : on le résout ICI,
      // pendant qu'on est encore dans la requête, même si l'écriture du journal
      // est différée.
      const actor = await actorResolver()
      if (!actor) return result

      if (params.runInTransaction) {
        // Dans une transaction, l'écriture n'est peut-être pas encore validée et la
        // transaction peut tenir des verrous : écrire le journal tout de suite
        // risquerait de l'attendre, donc de la bloquer. On l'écrit juste après,
        // sans faire attendre l'action de l'utilisateur.
        setTimeout(() => {
          record(client, spec, params, result, actor, true).catch((e) => console.error('[audit] journalisation impossible :', e))
        }, TRANSACTION_DELAY_MS)
      } else {
        await record(client, spec, params, result, actor, false)
      }
    } catch (e) {
      // Le journal ne doit JAMAIS faire échouer l'action d'un utilisateur.
      console.error('[audit] journalisation impossible :', e)
    }
    return result
  })
}
