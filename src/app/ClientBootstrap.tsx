// file: src/app/ClientBootstrap.tsx
'use client'
import { useEffect } from 'react'
import { openDatabase } from '@/lib/indexeddb'
import { seed as seedIdeas } from '@/lib/repos/idea-repo'
import { defaultSeed } from '@/mock/seed'

export default function ClientBootstrap() {
  useEffect(() => {
    openDatabase().then(async () => {
      await seedIdeas(defaultSeed.ideas)
    })
  }, [])
  return null
}
