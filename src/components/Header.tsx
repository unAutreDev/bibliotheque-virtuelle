import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface HeaderProps {
  title: string
  back?: string
  action?: ReactNode
}

export function Header({ title, back, action }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 bg-accent px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 text-white shadow">
      {back && (
        <Link to={back} className="-ml-2 rounded-full px-2 text-2xl leading-none" aria-label="Retour">
          ‹
        </Link>
      )}
      <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>
      {action}
    </header>
  )
}
