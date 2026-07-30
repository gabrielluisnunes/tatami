'use client'

import React, { useState, useRef } from 'react'
import { Upload, X, Loader2, AlertCircle } from 'lucide-react'

interface ContratoNovoModalProps {
  onCreated: () => void
  onClose: () => void
}

export function ContratoNovoModal({ onCreated, onClose }: ContratoNovoModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const selectedFile = e.target.files?.[0] || null
    if (selectedFile) {
      const name = selectedFile.name.toLowerCase()
      if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
        setError('Apenas arquivos PDF ou DOCX são permitidos.')
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
      setFile(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('O título é obrigatório.')
      return
    }

    if (!file) {
      setError('Por favor, selecione um arquivo.')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('file', file)

      const response = await fetch('/api/contracts', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar contrato')
      }

      onCreated()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Erro ao salvar o contrato. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'border border-zinc-200 rounded-lg px-3.5 py-2 text-sm text-zinc-900 bg-white placeholder-zinc-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-full disabled:opacity-60'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => !loading && onClose()} />

      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-zinc-200 shadow-xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Criar Novo Contrato</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Carregue um arquivo e defina as informações</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            disabled={loading}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Título *</label>
              <input
                type="text"
                required
                disabled={loading}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Contrato de Adesão - Plano Anual"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Descrição (opcional)</label>
              <textarea
                disabled={loading}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva detalhes ou observações sobre o contrato..."
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Arquivo do Contrato *</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                disabled={loading}
                className="hidden"
                id="contract-file-input"
              />
              <label
                htmlFor="contract-file-input"
                className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center cursor-pointer hover:border-zinc-300 hover:bg-zinc-100 transition-colors ${
                  loading ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <Upload className="h-5 w-5 text-zinc-400 mb-2" />
                <span className="text-xs text-zinc-700 font-medium">
                  {file ? file.name : 'Clique para selecionar o arquivo'}
                </span>
                <span className="text-[10px] text-zinc-400 mt-1">
                  Suporta apenas arquivos .pdf ou .docx
                </span>
              </label>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                <p className="text-xs">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-5 border-t border-zinc-100">
            <button
              onClick={onClose}
              type="button"
              disabled={loading}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-60 min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar contrato'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
