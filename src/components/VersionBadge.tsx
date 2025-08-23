// file: src/components/VersionBadge.tsx
'use client'
import Link from 'next/link'

export default function VersionBadge({ finalScriptId, versionNumber, updatedAt }: { finalScriptId: string; versionNumber: number; updatedAt?: string }) {
  return (
    <Link href={`/finals/${finalScriptId}`} className="inline-flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100">
      <span>最新定稿：v{versionNumber}</span>
      {updatedAt && <span className="text-blue-500">{new Date(updatedAt).toLocaleString()}</span>}
    </Link>
  )
}
