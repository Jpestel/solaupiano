// Styles / genres musicaux proposés à la création d'un groupe.
// Liste riche, organisée par familles (optgroups).

export const UNSPECIFIED_GENRE = 'Non renseigné'

export const MUSIC_GENRES: { group: string; items: string[] }[] = [
  {
    group: 'Rock',
    items: ['Rock', 'Rock classique', 'Rock alternatif', 'Indie rock', 'Hard rock', 'Punk', 'Grunge', 'Rockabilly', 'Garage', 'Post-rock'],
  },
  {
    group: 'Métal',
    items: ['Metal', 'Heavy metal', 'Metal symphonique', 'Death metal', 'Black metal', 'Metalcore', 'Thrash metal'],
  },
  {
    group: 'Pop',
    items: ['Pop', 'Pop rock', 'Variété française', 'Variété internationale', 'Synthpop', 'Électro-pop', 'Dream pop'],
  },
  {
    group: 'Jazz / Soul / Funk',
    items: ['Jazz', 'Jazz manouche', 'Swing', 'Bossa nova', 'Soul', 'Funk', 'Disco', 'Gospel', 'Acid jazz'],
  },
  {
    group: 'Blues / Folk / Country',
    items: ['Blues', 'Rhythm and blues', 'Folk', 'Country', 'Bluegrass', 'Americana', 'Celtique'],
  },
  {
    group: 'Électronique / Urbain',
    items: ['Électro', 'House', 'Techno', 'Drum and bass', 'Dubstep', 'Trap', 'Lo-fi', 'Hip-hop', 'Rap', 'R&B', 'Trip-hop'],
  },
  {
    group: 'Musiques du monde',
    items: ['Reggae', 'Ska', 'Dub', 'Latino', 'Salsa', 'Bossa', 'Afrobeat', 'Flamenco', 'Musique du monde', 'Musique traditionnelle'],
  },
  {
    group: 'Chanson',
    items: ['Chanson française', 'Chanson à texte', 'Slam', 'Comédie musicale'],
  },
  {
    group: 'Classique',
    items: ['Classique', 'Baroque', 'Opéra', 'Musique de chambre', 'Contemporain', 'Bande originale (BO)'],
  },
  {
    group: 'Ensembles',
    items: ['Fanfare', 'Brass band', 'Chorale', 'Big band', 'Harmonie'],
  },
  {
    group: 'Autres',
    items: ['Fusion', 'Expérimental', 'Ambient', 'Cover / Reprises', 'Compositions originales', 'Multi-styles', 'Autre'],
  },
]

// Liste plate (utile pour validation / recherche).
export const ALL_GENRES: string[] = MUSIC_GENRES.flatMap((g) => g.items)
