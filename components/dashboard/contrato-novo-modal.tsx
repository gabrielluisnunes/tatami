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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md mx-auto mt-24 relative shadow-2xl">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          type="button"
          disabled={loading}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Título do Modal */}
        <div className="mb-5">
          <h2 className="text-lg font-bold text-zinc-100">Criar Novo Contrato</h2>
          <p className="text-xs text-zinc-500 mt-1">Carregue um arquivo e defina as informações</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título do Contrato */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">Título *</label>
            <input
              type="text"
              required
              disabled={loading}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Contrato de Adesão - Plano Anual"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-55"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">Descrição (opcional)</label>
            <textarea
              disabled={loading}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva detalhes ou observações sobre o contrato..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-55 resize-none"
            />
          </div>

          {/* Input de Arquivo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">Arquivo do Contrato *</label>
            <div className="relative">
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
                className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-6 text-center cursor-pointer hover:border-zinc-700 transition-colors ${
                  loading ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <Upload className="h-6 w-6 text-zinc-500 mb-2" />
                <span className="text-xs text-zinc-300 font-medium">
                  {file ? file.name : 'Clique para selecionar o arquivo'}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1">
                  Suporta apenas arquivos .pdf ou .docx
                </span>
              </label>
            </div>
          </div>

          {/* Erro Inline */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-800/30 bg-red-950/30 px-4 py-3 text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {/* Rodapé do Form */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              type="button"
              disabled={loading}
              className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-55 min-w-[120px]"
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
