import { redirect } from 'next/navigation'

// Sol au piano est gratuit : il n'y a plus de tarifs à présenter, seulement des
// fonctionnalités. On garde l'adresse pour que les anciens liens continuent de marcher.
export default function TarifsPage() {
  redirect('/fonctionnalites')
}
