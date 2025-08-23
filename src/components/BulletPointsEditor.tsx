// file: src/components/BulletPointsEditor.tsx
'use client'
import { BULLET_MAX, BULLET_LEN_MAX } from '@/utils/validation'

export default function BulletPointsEditor({
  points,
  onChange,
}: {
  points: string[]
  onChange: (next: string[]) => void
}) {
  function update(index: number, value: string) {
    const next = [...points]
    next[index] = value
    onChange(next)
  }
  function add() {
    if (points.length >= BULLET_MAX) return
    onChange([...points, ''])
  }
  function remove(index: number) {
    const next = points.filter((_, i) => i !== index)
    onChange(next)
  }
  function move(index: number, dir: -1 | 1) {
    const i2 = index + dir
    if (i2 < 0 || i2 >= points.length) return
    const next = [...points]
    const t = next[index]
    next[index] = next[i2]
    next[i2] = t
    onChange(next)
  }
  return (
    <div className="space-y-2">
      {points.map((p, i) => (
        <div key={i} className="flex items-start gap-2">
          <textarea
            aria-label={`要点 ${i + 1}`}
            className="flex-1 border rounded p-2 text-sm"
            rows={2}
            maxLength={BULLET_LEN_MAX}
            value={p}
            onChange={(e) => update(i, e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <button className="px-2 py-1 text-xs bg-gray-100 rounded" onClick={() => move(i, -1)} aria-label="上移">↑</button>
            <button className="px-2 py-1 text-xs bg-gray-100 rounded" onClick={() => move(i, 1)} aria-label="下移">↓</button>
            <button className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded" onClick={() => remove(i)} aria-label="删除">删</button>
          </div>
        </div>
      ))}
      <button
        className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
        onClick={add}
        disabled={points.length >= BULLET_MAX}
        aria-label="新增要点"
      >新增要点</button>
    </div>
  )
}
