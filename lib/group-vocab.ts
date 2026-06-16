// Vocabulaire adaptatif selon le type d'espace : groupe de musique (BAND) ou
// classe / école de musique (SCHOOL). Permet de réutiliser le même moteur en
// renommant les libellés visibles.
export type GroupType = 'BAND' | 'SCHOOL'

export type GroupVocab = {
  spaceType: string     // « groupe » / « classe »
  spaceTypeCap: string  // « Groupe » / « Classe / école »
  chef: string          // « Chef d'orchestre » / « Professeur »
  member: string        // « Membre » / « Élève »
  members: string       // « Membres » / « Élèves »
  rehearsal: string     // « Répétition » / « Cours »
  rehearsals: string    // « Répétitions » / « Cours »
  emoji: string
}

export function groupVocab(type: GroupType | string | null | undefined): GroupVocab {
  if (type === 'SCHOOL') {
    return {
      spaceType: 'classe',
      spaceTypeCap: 'Classe / école',
      chef: 'Professeur',
      member: 'Élève',
      members: 'Élèves',
      rehearsal: 'Cours',
      rehearsals: 'Cours',
      emoji: '🎓',
    }
  }
  return {
    spaceType: 'groupe',
    spaceTypeCap: 'Groupe',
    chef: "Chef d'orchestre",
    member: 'Membre',
    members: 'Membres',
    rehearsal: 'Répétition',
    rehearsals: 'Répétitions',
    emoji: '🎵',
  }
}
