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
      <p className="py-8 text-center text-sm text-gray-500">
        Nenhum check-in registrado ainda.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/75">
            <th className="w-8 px-4 py-3" />
            <th className="px-4 py-3 text-left font-medium text-gray-500">Data / Hora</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Turma</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Professor</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Presentes</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {checkins.map(checkin => {
            const isExpanded = expandedId === checkin.id
            return (
              <React.Fragment key={checkin.id}>
                <tr
                  onClick={() => toggle(checkin.id)}
                  className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-400">
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4" />
                      : <ChevronRight className="h-4 w-4" />}
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    {new Date(checkin.checked_in_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{checkin.class_name}</td>
                  <td className="px-4 py-3 text-gray-600">{checkin.professor_name}</td>
                  <td className="px-4 py-3 text-gray-800 font-semibold">{checkin.attendance.length}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      checkin.status === 'confirmed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {checkin.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                    </span>
                  </td>
                </tr>

                {/* Linha expandida */}
                {isExpanded && (
                  <tr className="border-b border-gray-100 bg-gray-50/30">
                    <td colSpan={6} className="px-8 py-4">
                      {checkin.attendance.length === 0 ? (
                        <p className="text-xs text-gray-500">Nenhum aluno registrado neste check-in.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {checkin.attendance.map(a => (
                            <span
                              key={a.student_id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 shadow-sm"
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                a.source === 'ai' ? 'bg-indigo-500' : 'bg-gray-400'
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
