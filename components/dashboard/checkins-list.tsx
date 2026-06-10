'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface AttendanceRecord {
  student_id: string
  full_name: string
  source: 'ai' | 'manual'
}

interface CheckinRow {
  id: string
  checked_in_at: string
  class_name: string
  professor_name: string
  status: 'pending' | 'confirmed'
  attendance: AttendanceRecord[]
}

interface CheckinsListProps {
  checkins: CheckinRow[]
}

export function CheckinsList({ checkins }: CheckinsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggle = (id: string) =>
    setExpandedId(prev => (prev === id ? null : id))

  if (checkins.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-600">
        Nenhum check-in registrado ainda.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800/80">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800/80 bg-zinc-900/40">
            <th className="w-8 px-4 py-3" />
            <th className="px-4 py-3 text-left font-medium text-zinc-400">Data / Hora</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-400">Turma</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-400">Professor</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-400">Presentes</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-400">Status</th>
          </tr>
        </thead>
        <tbody>
          {checkins.map(checkin => {
            const isExpanded = expandedId === checkin.id
            return (
              <React.Fragment key={checkin.id}>
                <tr
                  onClick={() => toggle(checkin.id)}
                  className="cursor-pointer border-b border-zinc-800/40 last:border-0 hover:bg-zinc-900/40 transition-colors"
                >
                  <td className="px-4 py-3 text-zinc-600">
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4" />
                      : <ChevronRight className="h-4 w-4" />}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {new Date(checkin.checked_in_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{checkin.class_name}</td>
                  <td className="px-4 py-3 text-zinc-400">{checkin.professor_name}</td>
                  <td className="px-4 py-3 text-zinc-300">{checkin.attendance.length}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      checkin.status === 'confirmed'
                        ? 'bg-emerald-950/50 text-emerald-400'
                        : 'bg-amber-950/50 text-amber-400'
                    }`}>
                      {checkin.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                    </span>
                  </td>
                </tr>

                {/* Linha expandida */}
                {isExpanded && (
                  <tr className="border-b border-zinc-800/40 bg-zinc-950/40">
                    <td colSpan={6} className="px-8 py-3">
                      {checkin.attendance.length === 0 ? (
                        <p className="text-xs text-zinc-600">Nenhum aluno registrado neste check-in.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {checkin.attendance.map(a => (
                            <span
                              key={a.student_id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300"
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                a.source === 'ai' ? 'bg-indigo-400' : 'bg-zinc-500'
                              }`} />
                              {a.full_name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
