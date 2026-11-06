'use client'

import { ScoreViewer, type ViewerScore } from '@/components/ScoreViewer'
import type { PublicScore } from '@/lib/reprises-partage'

/** Adresse d'une page partagée : le fichier passe par le jeton, jamais par son chemin réel. */
export const toViewerScores = (token: string, scores: PublicScore[]): ViewerScore[] =>
  scores.map((s) => ({
    id: s.id, title: s.title, performer: s.performer, composer: s.composer,
    pages: s.pages.map((p) => ({ id: p.id, fileType: p.fileType, src: `/api/partage/${token}?s=${s.id}&p=${p.id}` })),
  }))

export function PartitionPartagee({ token, scores, start, onClose }: { token: string; scores: PublicScore[]; start?: number; onClose?: () => void }) {
  return <ScoreViewer scores={toViewerScores(token, scores)} start={start} onClose={onClose} />
}
