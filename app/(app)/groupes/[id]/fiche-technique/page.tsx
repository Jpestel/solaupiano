'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

// ─── Types ───────────────────────────────────────────────────────────────────

interface StageMember { id: string; name: string; instrument: string; position: string; backline: string; gusoNumber: string }
interface SoundChannel { id: string; source: string; type: string; notes: string }

interface TechRiderContent {
  contactName: string; contactPhone: string; contactEmail: string; genre: string; generalNotes: string
  stage: { minWidth: string; minDepth: string; setupDuration: string; soundcheckDuration: string; powerNeeds: string; members: StageMember[]; notes: string }
  sound: { totalChannels: number; channels: SoundChannel[]; monitorsCount: number; inEar: boolean; diCount: number; subwoofer: boolean; notes: string }
  lights: { hasFrontLight: boolean; hasBackLight: boolean; hasFog: boolean; hasStrobe: boolean; customRequests: string; notes: string }
  hospitality: { totalPersons: number; meals: boolean; mealsDetails: string; drinks: string; accommodation: boolean; accommodationRooms: string; parkingSpots: string; notes: string }
}

interface GroupMember { userId: number; name: string; groupRole: string; gusoNumber: string; instruments: string[] }

const DEFAULT: TechRiderContent = {
  contactName: '', contactPhone: '', contactEmail: '', genre: '', generalNotes: '',
  stage: { minWidth: '', minDepth: '', setupDuration: '', soundcheckDuration: '', powerNeeds: '', members: [], notes: '' },
  sound: { totalChannels: 0, channels: [], monitorsCount: 2, inEar: false, diCount: 0, subwoofer: false, notes: '' },
  lights: { hasFrontLight: false, hasBackLight: false, hasFog: false, hasStrobe: false, customRequests: '', notes: '' },
  hospitality: { totalPersons: 0, meals: false, mealsDetails: '', drinks: '', accommodation: false, accommodationRooms: '', parkingSpots: '', notes: '' },
}

function uid() { return Math.random().toString(36).slice(2) }

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${active ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
      {children}
    </button>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{hint && <span className="ml-1.5 text-xs text-gray-400 font-normal">{hint}</span>}</label>
      {children}
    </div>
  )
}

const inp = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
const ta = `${inp} resize-none`

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FicheTechniquePage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const groupId = params.id

  const [groupName, setGroupName] = useState('')
  const [isChef, setIsChef] = useState(false)
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [content, setContent] = useState<TechRiderContent>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'scene' | 'son' | 'lights' | 'hosp'>('general')

  // Share
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Email modal
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // ─── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return
    fetch(`/api/groupes/${groupId}/fiche-technique`).then(r => r.json()).then(d => {
      setGroupName(d.groupName ?? '')
      setIsChef(d.role === 'CHEF')
      setGroupMembers(d.members ?? [])
      setShareToken(d.shareToken ?? null)
      if (d.rider?.content) {
        setContent({ ...DEFAULT, ...(d.rider.content as TechRiderContent) })
      }
      setLoading(false)
    })
  }, [session, groupId])

  // ─── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/groupes/${groupId}/fiche-technique`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  // ─── Pre-fill from members ─────────────────────────────────────────────────
  const prefillFromMembers = () => {
    const members: StageMember[] = groupMembers.map(m => ({
      id: uid(), name: m.name, instrument: m.instruments[0] ?? '', position: '', backline: '', gusoNumber: m.gusoNumber ?? '',
    }))
    setContent(c => ({ ...c, stage: { ...c.stage, members } }))
    const channels: SoundChannel[] = groupMembers.flatMap(m =>
      m.instruments.map(inst => ({ id: uid(), source: `${m.name} — ${inst}`, type: guessType(inst), notes: '' }))
    )
    setContent(c => ({ ...c, sound: { ...c.sound, channels, totalChannels: channels.length, totalPersons: groupMembers.length } }))
    setContent(c => ({ ...c, hospitality: { ...c.hospitality, totalPersons: groupMembers.length } }))
  }

  function guessType(inst: string) {
    const l = inst.toLowerCase()
    if (l.includes('voix') || l.includes('chant') || l.includes('vocal')) return 'Micro voix'
    if (l.includes('piano') || l.includes('clavier') || l.includes('synth')) return 'DI stéréo'
    if (l.includes('basse') || l.includes('bass')) return 'DI / ampli basse'
    if (l.includes('guitare') || l.includes('guitar')) return 'Micro ampli'
    if (l.includes('batterie') || l.includes('drums')) return 'Multi-micro kit'
    return 'Instrument'
  }

  // ─── Share ─────────────────────────────────────────────────────────────────
  const generateShareLink = async () => {
    setShareLoading(true)
    const r = await fetch(`/api/groupes/${groupId}/fiche-technique/share`, { method: 'POST' })
    const d = await r.json()
    setShareToken(d.shareToken)
    setShareLoading(false)
  }

  const revokeShareLink = async () => {
    await fetch(`/api/groupes/${groupId}/fiche-technique/share`, { method: 'DELETE' })
    setShareToken(null)
  }

  const copyShareLink = () => {
    if (!shareToken) return
    navigator.clipboard.writeText(`${window.location.origin}/fiche/${shareToken}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // ─── Email ─────────────────────────────────────────────────────────────────
  const sendEmail = async () => {
    setEmailSending(true)
    await fetch(`/api/groupes/${groupId}/fiche-technique/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: emailTo, subject: emailSubject || `Fiche technique — ${groupName}` }),
    })
    setEmailSending(false); setEmailSent(true); setTimeout(() => { setEmailSent(false); setEmailOpen(false) }, 2500)
  }

  // ─── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    if (shareToken) { window.open(`/fiche/${shareToken}`, '_blank') }
    else {
      const url = shareToken ? `/fiche/${shareToken}` : ''
      alert('Générez d\'abord un lien public pour accéder à la version imprimable.')
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const upd = useCallback(<K extends keyof TechRiderContent>(key: K, val: TechRiderContent[K]) => setContent(c => ({ ...c, [key]: val })), [])
  const updStage = (patch: Partial<TechRiderContent['stage']>) => setContent(c => ({ ...c, stage: { ...c.stage, ...patch } }))
  const updSound = (patch: Partial<TechRiderContent['sound']>) => setContent(c => ({ ...c, sound: { ...c.sound, ...patch } }))
  const updLights = (patch: Partial<TechRiderContent['lights']>) => setContent(c => ({ ...c, lights: { ...c.lights, ...patch } }))
  const updHosp = (patch: Partial<TechRiderContent['hospitality']>) => setContent(c => ({ ...c, hospitality: { ...c.hospitality, ...patch } }))

  const addStageMember = () => updStage({ members: [...content.stage.members, { id: uid(), name: '', instrument: '', position: '', backline: '', gusoNumber: '' }] })
  const updStageMember = (id: string, patch: Partial<StageMember>) => updStage({ members: content.stage.members.map(m => m.id === id ? { ...m, ...patch } : m) })
  const delStageMember = (id: string) => updStage({ members: content.stage.members.filter(m => m.id !== id) })

  const addChannel = () => updSound({ channels: [...content.sound.channels, { id: uid(), source: '', type: '', notes: '' }] })
  const updChannel = (id: string, patch: Partial<SoundChannel>) => updSound({ channels: content.sound.channels.map(c => c.id === id ? { ...c, ...patch } : c) })
  const delChannel = (id: string) => updSound({ channels: content.sound.channels.filter(c => c.id !== id) })

  if (loading) return <div className="text-gray-500 p-8">Chargement...</div>

  const shareUrl = shareToken ? `${typeof window !== 'undefined' ? window.location.origin : 'https://solaupiano.fr'}/fiche/${shareToken}` : null

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 flex-wrap">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupName}</Link>
        <span>/</span>
        <span className="text-gray-900">Fiche technique</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fiche technique</h1>
          <p className="text-sm text-gray-500 mt-0.5">Modèle réutilisable pour tous vos concerts</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Print */}
          <button onClick={handlePrint} className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 border border-gray-200 flex items-center gap-1.5 transition-colors">
            🖨️ Imprimer
          </button>
          {/* Share */}
          {isChef && !shareToken && (
            <button onClick={generateShareLink} disabled={shareLoading}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 border border-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-50">
              {shareLoading ? '⏳' : '🔗'} Créer un lien
            </button>
          )}
          {shareToken && (
            <div className="flex items-center gap-1">
              <button onClick={copyShareLink} className="text-sm text-indigo-600 hover:text-indigo-500 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 border border-indigo-200 flex items-center gap-1.5 transition-colors">
                {copied ? '✓ Copié !' : '🔗 Copier le lien'}
              </button>
              {isChef && (
                <button onClick={revokeShareLink} title="Révoquer le lien" className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">✕</button>
              )}
            </div>
          )}
          {/* Email */}
          {isChef && (
            <button onClick={() => setEmailOpen(true)} className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 border border-gray-200 flex items-center gap-1.5 transition-colors">
              ✉️ Envoyer
            </button>
          )}
          {isChef && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé !' : 'Sauvegarder'}
            </Button>
          )}
        </div>
      </div>

      {/* Pre-fill hint */}
      {isChef && content.stage.members.length === 0 && groupMembers.length > 0 && (
        <div className="mb-5 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-indigo-700">✨ Pré-remplir automatiquement à partir des membres du groupe ?</p>
          <button onClick={prefillFromMembers} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 whitespace-nowrap">
            Oui, pré-remplir →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')}>📋 Général</TabButton>
        <TabButton active={activeTab === 'scene'} onClick={() => setActiveTab('scene')}>🎸 Scène</TabButton>
        <TabButton active={activeTab === 'son'} onClick={() => setActiveTab('son')}>🔊 Son</TabButton>
        <TabButton active={activeTab === 'lights'} onClick={() => setActiveTab('lights')}>💡 Lumières</TabButton>
        <TabButton active={activeTab === 'hosp'} onClick={() => setActiveTab('hosp')}>🍺 Loges</TabButton>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        {/* ── Tab: Général ── */}
        {activeTab === 'general' && (
          <div className="space-y-5 max-w-xl">
            <h2 className="text-base font-semibold text-gray-900">Contact & informations générales</h2>
            <Field label="Nom du contact">
              <input disabled={!isChef} value={content.contactName} onChange={e => upd('contactName', e.target.value)} className={inp} placeholder="Jean Dupont" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Téléphone">
                <input disabled={!isChef} value={content.contactPhone} onChange={e => upd('contactPhone', e.target.value)} className={inp} placeholder="06 12 34 56 78" />
              </Field>
              <Field label="Email de contact">
                <input disabled={!isChef} type="email" value={content.contactEmail} onChange={e => upd('contactEmail', e.target.value)} className={inp} placeholder="contact@groupe.fr" />
              </Field>
            </div>
            <Field label="Genre musical" hint="(optionnel)">
              <input disabled={!isChef} value={content.genre} onChange={e => upd('genre', e.target.value)} className={inp} placeholder="Rock, Jazz, Chanson française…" />
            </Field>
            <Field label="Notes générales" hint="(visibles en bas de la fiche)">
              <textarea disabled={!isChef} rows={4} value={content.generalNotes} onChange={e => upd('generalNotes', e.target.value)} className={ta} placeholder="Informations complémentaires pour l'organisateur…" />
            </Field>
          </div>
        )}

        {/* ── Tab: Scène ── */}
        {activeTab === 'scene' && (
          <div className="space-y-6">
            <h2 className="text-base font-semibold text-gray-900">Scène & Backline</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Largeur min." hint="(m)">
                <input disabled={!isChef} value={content.stage.minWidth} onChange={e => updStage({ minWidth: e.target.value })} className={inp} placeholder="8" />
              </Field>
              <Field label="Profondeur min." hint="(m)">
                <input disabled={!isChef} value={content.stage.minDepth} onChange={e => updStage({ minDepth: e.target.value })} className={inp} placeholder="6" />
              </Field>
              <Field label="Montage" hint="(min)">
                <input disabled={!isChef} value={content.stage.setupDuration} onChange={e => updStage({ setupDuration: e.target.value })} className={inp} placeholder="60" />
              </Field>
              <Field label="Soundcheck" hint="(min)">
                <input disabled={!isChef} value={content.stage.soundcheckDuration} onChange={e => updStage({ soundcheckDuration: e.target.value })} className={inp} placeholder="60" />
              </Field>
            </div>
            <Field label="Alimentation électrique">
              <input disabled={!isChef} value={content.stage.powerNeeds} onChange={e => updStage({ powerNeeds: e.target.value })} className={inp} placeholder="2× 16A + 1× 32A" />
            </Field>

            {/* Membres sur scène */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Musiciens & backline</h3>
                {isChef && <button onClick={addStageMember} className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">+ Ajouter</button>}
              </div>
              {content.stage.members.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Aucun musicien ajouté.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                        <th className="text-left px-3 py-2">Musicien</th>
                        <th className="text-left px-3 py-2">Instrument</th>
                        <th className="text-left px-3 py-2">Position</th>
                        <th className="text-left px-3 py-2">Backline / Besoins</th>
                        <th className="text-left px-3 py-2">
                          <span className="flex items-center gap-1">
                            N° GUSO
                            <span className="relative group">
                              <span className="w-3.5 h-3.5 rounded-full bg-gray-300 text-gray-500 text-[9px] font-bold inline-flex items-center justify-center cursor-help hover:bg-indigo-200 hover:text-indigo-700 transition-colors select-none">?</span>
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-xl bg-gray-900 text-white text-xs p-3 shadow-xl
                                opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50
                                pointer-events-none group-hover:pointer-events-auto whitespace-normal font-normal normal-case tracking-normal leading-relaxed">
                                <span className="font-semibold">GUSO</span> — Guichet Unique du Spectacle Occasionnel. Identifiant officiel pour les artistes et techniciens du spectacle vivant en France.
                                <a href="https://www.guso.fr" target="_blank" rel="noreferrer"
                                  className="block mt-2 text-indigo-300 underline hover:text-indigo-200 transition-colors">
                                  En savoir plus sur guso.fr →
                                </a>
                              </span>
                            </span>
                          </span>
                        </th>
                        {isChef && <th className="w-8" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {content.stage.members.map(m => (
                        <tr key={m.id}>
                          <td className="px-3 py-2"><input disabled={!isChef} value={m.name} onChange={e => updStageMember(m.id, { name: e.target.value })} className={`${inp} py-1.5`} placeholder="Nom" /></td>
                          <td className="px-3 py-2"><input disabled={!isChef} value={m.instrument} onChange={e => updStageMember(m.id, { instrument: e.target.value })} className={`${inp} py-1.5`} placeholder="Guitare" /></td>
                          <td className="px-3 py-2"><input disabled={!isChef} value={m.position} onChange={e => updStageMember(m.id, { position: e.target.value })} className={`${inp} py-1.5`} placeholder="Jardin" /></td>
                          <td className="px-3 py-2"><input disabled={!isChef} value={m.backline} onChange={e => updStageMember(m.id, { backline: e.target.value })} className={`${inp} py-1.5`} placeholder="Ampli Fender Twin 65W" /></td>
                          <td className="px-3 py-2"><input disabled={!isChef} value={m.gusoNumber ?? ''} onChange={e => updStageMember(m.id, { gusoNumber: e.target.value })} className={`${inp} py-1.5`} placeholder="123456789" /></td>
                          {isChef && <td className="px-2 py-2"><button onClick={() => delStageMember(m.id)} className="text-gray-300 hover:text-red-500 text-lg leading-none">×</button></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <Field label="Notes scène" hint="(optionnel)">
              <textarea disabled={!isChef} rows={3} value={content.stage.notes} onChange={e => updStage({ notes: e.target.value })} className={ta} placeholder="Informations complémentaires sur la configuration de scène…" />
            </Field>
          </div>
        )}

        {/* ── Tab: Son ── */}
        {activeTab === 'son' && (
          <div className="space-y-6">
            <h2 className="text-base font-semibold text-gray-900">Son & Retours</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Canaux total">
                <input disabled={!isChef} type="number" min="0" value={content.sound.totalChannels || ''} onChange={e => updSound({ totalChannels: Number(e.target.value) })} className={inp} placeholder="12" />
              </Field>
              <Field label="Retours scène">
                <input disabled={!isChef} type="number" min="0" value={content.sound.monitorsCount || ''} onChange={e => updSound({ monitorsCount: Number(e.target.value) })} className={inp} placeholder="2" />
              </Field>
              <Field label="DI box">
                <input disabled={!isChef} type="number" min="0" value={content.sound.diCount || ''} onChange={e => updSound({ diCount: Number(e.target.value) })} className={inp} placeholder="3" />
              </Field>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input disabled={!isChef} type="checkbox" checked={content.sound.inEar} onChange={e => updSound({ inEar: e.target.checked })} className="w-4 h-4 rounded text-indigo-600 border-gray-300" />
                <span className="text-sm text-gray-700">Mix in-ear</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input disabled={!isChef} type="checkbox" checked={content.sound.subwoofer} onChange={e => updSound({ subwoofer: e.target.checked })} className="w-4 h-4 rounded text-indigo-600 border-gray-300" />
                <span className="text-sm text-gray-700">Subwoofer nécessaire</span>
              </label>
            </div>

            {/* Canaux */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Liste des canaux</h3>
                {isChef && <button onClick={addChannel} className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">+ Ajouter</button>}
              </div>
              {content.sound.channels.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Aucun canal défini.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                        <th className="text-center px-2 py-2 w-10">Ch.</th>
                        <th className="text-left px-3 py-2">Source</th>
                        <th className="text-left px-3 py-2">Type</th>
                        <th className="text-left px-3 py-2">Notes</th>
                        {isChef && <th className="w-8" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {content.sound.channels.map((ch, i) => (
                        <tr key={ch.id}>
                          <td className="px-2 py-2 text-center font-bold text-indigo-500 text-sm">{i + 1}</td>
                          <td className="px-3 py-2"><input disabled={!isChef} value={ch.source} onChange={e => updChannel(ch.id, { source: e.target.value })} className={`${inp} py-1.5`} placeholder="Chant principal" /></td>
                          <td className="px-3 py-2"><input disabled={!isChef} value={ch.type} onChange={e => updChannel(ch.id, { type: e.target.value })} className={`${inp} py-1.5`} placeholder="Micro voix" /></td>
                          <td className="px-3 py-2"><input disabled={!isChef} value={ch.notes} onChange={e => updChannel(ch.id, { notes: e.target.value })} className={`${inp} py-1.5`} placeholder="SM58, fond de scène" /></td>
                          {isChef && <td className="px-2 py-2"><button onClick={() => delChannel(ch.id)} className="text-gray-300 hover:text-red-500 text-lg leading-none">×</button></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <Field label="Notes son" hint="(optionnel)">
              <textarea disabled={!isChef} rows={3} value={content.sound.notes} onChange={e => updSound({ notes: e.target.value })} className={ta} placeholder="Préférences de mix, remarques techniques…" />
            </Field>
          </div>
        )}

        {/* ── Tab: Lumières ── */}
        {activeTab === 'lights' && (
          <div className="space-y-6 max-w-xl">
            <h2 className="text-base font-semibold text-gray-900">Lumières & effets</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { key: 'hasFrontLight', label: '☀️ Éclairage façade', desc: 'PAR, leds, fresnel' },
                { key: 'hasBackLight', label: '🌟 Contre-jour / backlight', desc: 'Leds arrière, halogènes' },
                { key: 'hasFog', label: '💨 Machine à fumée', desc: 'Brouillard ou haze' },
                { key: 'hasStrobe', label: '⚡ Stroboscope', desc: 'LED stroboscopique' },
              ] as const).map(opt => (
                <label key={opt.key} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${content.lights[opt.key] ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200 hover:border-gray-300'} ${!isChef ? 'cursor-default' : ''}`}>
                  <input disabled={!isChef} type="checkbox" checked={content.lights[opt.key]} onChange={e => updLights({ [opt.key]: e.target.checked } as any)} className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-gray-300 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <Field label="Besoins spécifiques">
              <textarea disabled={!isChef} rows={3} value={content.lights.customRequests} onChange={e => updLights({ customRequests: e.target.value })} className={ta} placeholder="Spot de face couleur, leds RGB pilotables en DMX…" />
            </Field>
            <Field label="Notes" hint="(optionnel)">
              <textarea disabled={!isChef} rows={2} value={content.lights.notes} onChange={e => updLights({ notes: e.target.value })} className={ta} />
            </Field>
          </div>
        )}

        {/* ── Tab: Loges ── */}
        {activeTab === 'hosp' && (
          <div className="space-y-5 max-w-xl">
            <h2 className="text-base font-semibold text-gray-900">Loges & Hospitalité</h2>
            <Field label="Nombre de personnes total" hint="(musiciens + crew)">
              <input disabled={!isChef} type="number" min="0" value={content.hospitality.totalPersons || ''} onChange={e => updHosp({ totalPersons: Number(e.target.value) })} className={inp} placeholder="5" />
            </Field>
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input disabled={!isChef} type="checkbox" checked={content.hospitality.meals} onChange={e => updHosp({ meals: e.target.checked })} className="w-4 h-4 rounded text-indigo-600 border-gray-300" />
                <span className="text-sm font-medium text-gray-700">Repas demandé</span>
              </label>
              {content.hospitality.meals && (
                <input disabled={!isChef} value={content.hospitality.mealsDetails} onChange={e => updHosp({ mealsDetails: e.target.value })} className={inp} placeholder="Repas chaud pour 5 personnes avant le concert" />
              )}
            </div>
            <Field label="Rider boissons">
              <textarea disabled={!isChef} rows={3} value={content.hospitality.drinks} onChange={e => updHosp({ drinks: e.target.value })} className={ta} placeholder="6 bouteilles d'eau 1,5L, 10 bières, 6 sodas, café…" />
            </Field>
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input disabled={!isChef} type="checkbox" checked={content.hospitality.accommodation} onChange={e => updHosp({ accommodation: e.target.checked })} className="w-4 h-4 rounded text-indigo-600 border-gray-300" />
                <span className="text-sm font-medium text-gray-700">Hébergement nécessaire</span>
              </label>
              {content.hospitality.accommodation && (
                <input disabled={!isChef} value={content.hospitality.accommodationRooms} onChange={e => updHosp({ accommodationRooms: e.target.value })} className={inp} placeholder="3 chambres doubles" />
              )}
            </div>
            <Field label="Parking" hint="(nb de véhicules)">
              <input disabled={!isChef} value={content.hospitality.parkingSpots} onChange={e => updHosp({ parkingSpots: e.target.value })} className={inp} placeholder="1 van + 2 voitures" />
            </Field>
            <Field label="Notes" hint="(optionnel)">
              <textarea disabled={!isChef} rows={3} value={content.hospitality.notes} onChange={e => updHosp({ notes: e.target.value })} className={ta} />
            </Field>
          </div>
        )}
      </div>

      {/* Share URL display */}
      {shareToken && (
        <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-indigo-700 font-medium">🔗 Lien public :</span>
          <a href={shareUrl!} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline truncate max-w-xs sm:max-w-none">
            {shareUrl}
          </a>
          <button onClick={copyShareLink} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 ml-auto">
            {copied ? '✓ Copié !' : 'Copier'}
          </button>
        </div>
      )}

      {/* Email modal */}
      {emailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setEmailOpen(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Envoyer la fiche technique</h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">Destinataire <span className="text-red-500">*</span></label>
                <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} className={inp} placeholder="organisateur@salle.fr" autoFocus />
              </div>
              <div>
                <label className="form-label">Objet</label>
                <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className={inp} placeholder={`Fiche technique — ${groupName}`} />
              </div>
              {emailSent && <p className="text-sm text-green-600 font-medium">✓ Email envoyé avec succès !</p>}
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setEmailOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">Annuler</button>
              <button onClick={sendEmail} disabled={emailSending || !emailTo} className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50">
                {emailSending ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
