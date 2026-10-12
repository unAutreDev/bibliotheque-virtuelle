import { useState } from 'react'
import { TYPE_LABELS, type ReadingType } from '../lib/db'

const DEFAULT_STYLES: Record<ReadingType, { bg: string; icon: string }> = {
  livre: { bg: 'from-amber-700 to-orange-900', icon: '📖' },
  bd: { bg: 'from-sky-600 to-indigo-800', icon: '💬' },
  manga: { bg: 'from-rose-600 to-fuchsia-900', icon: '🌸' },
}

interface CoverProps {
  url?: string
  title: string
  type: ReadingType
  className?: string
}

/** Couverture du livre, ou une couverture par défaut selon le type si l'image manque ou ne charge pas. */
export function Cover({ url, title, type, className = '' }: CoverProps) {
  const [failedUrl, setFailedUrl] = useState<string>()
  const showImage = url && failedUrl !== url

  if (showImage) {
    return (
      <img
        src={url}
        alt={`Couverture de ${title}`}
        loading="lazy"
        onError={() => setFailedUrl(url)}
        className={`aspect-[2/3] w-full rounded-md object-cover shadow-md ${className}`}
      />
    )
  }

  const style = DEFAULT_STYLES[type]
  return (
    <div
      role="img"
      aria-label={`Couverture par défaut de ${title}`}
      className={`flex aspect-[2/3] w-full flex-col justify-between rounded-md bg-gradient-to-br p-2 text-white shadow-md ${style.bg} ${className}`}
    >
      <span className="text-[0.6rem] font-semibold tracking-widest uppercase opacity-80">{TYPE_LABELS[type]}</span>
      <span className="line-clamp-4 text-center font-serif text-sm leading-tight font-semibold">{title}</span>
      <span className="text-center text-xl" aria-hidden>
        {style.icon}
      </span>
    </div>
  )
}
