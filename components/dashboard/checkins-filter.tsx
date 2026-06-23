'use client'

import React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from 'lucide-react'

export function CheckinsFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedMonth = searchParams.get('month') || 'all'

  // Gera dinamicamente os últimos 12 meses
  const months = []
  const date = new Date()
  
  // Adiciona a opção de todos os meses no início
  months.push({ value: 'all', label: 'Todos os meses' })

  for (let i = 0; i < 12; i++) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    months.push({ 
      value: `${y}-${m}`, 
      label: label.charAt(0).toUpperCase() + label.slice(1) 
    })
    date.setMonth(date.getMonth() - 1)
  }

  const handleMonthChange = (val: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (val && val !== 'all') {
      params.set('month', val)
    } else {
      params.delete('month')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium shrink-0">
        <Calendar className="h-4 w-4 text-indigo-500" />
        <span>Filtrar por mês:</span>
      </div>
      <div className="w-56">
        <Select value={selectedMonth} onValueChange={handleMonthChange}>
          <SelectTrigger className="bg-white border-gray-200 text-gray-900 rounded-xl h-10 shadow-sm focus:ring-indigo-500">
            <SelectValue placeholder="Selecione o mês" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200 text-gray-900 max-h-64">
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
