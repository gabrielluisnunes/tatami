'use client'

import { Download } from 'lucide-react'

interface DownloadButtonProps {
  href: string
}

export function DownloadButton({ href }: DownloadButtonProps) {
  return (
    <a
      href={href}
      download
      className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
    >
      <Download className="h-4 w-4" />
      Baixar DOCX
    </a>
  )
}
