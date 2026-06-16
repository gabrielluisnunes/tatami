import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import PizZip from 'pizzip'

function buildImageXml(rId: string, docPrId: number): string {
  const widthEmu = 2880000 // 8 cm
  const heightEmu = 2160000 // 6 cm (proporção 4:3)

  return `<w:p>
    <w:r>
      <w:rPr/>
      <w:drawing>
        <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
                   distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="${widthEmu}" cy="${heightEmu}"/>
          <wp:effectExtent l="0" t="0" r="0" b="0"/>
          <wp:docPr id="${docPrId}" name="image${docPrId}"/>
          <wp:cNvGraphicFramePr>
            <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                                 noChangeAspect="1"/>
          </wp:cNvGraphicFramePr>
          <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:nvPicPr>
                  <pic:cNvPr id="${docPrId}" name="image${docPrId}"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="${rId}"
                    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:avLst>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  </w:p>`
}

function buildComprovanteXml(data: {
  studentName: string
  contractTitle: string
  signedAt: string
  ipAddress: string
  sigBase64: string
  photoBase64: string
}): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const wParagraph = (text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) => {
    const bold = opts.bold ? '<w:b/><w:bCs/>' : ''
    const color = opts.color ? `<w:color w:val="${opts.color}"/>` : ''
    const size = opts.size ? `<w:sz w:val="${opts.size * 2}"/><w:szCs w:val="${opts.size * 2}"/>` : ''
    return `<w:p>
      <w:pPr>
        <w:rPr>${bold}${color}${size}</w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr>${bold}${color}${size}</w:rPr>
        <w:t>${esc(text)}</w:t>
      </w:r>
    </w:p>`
  }

  const wEmpty = () => `<w:p><w:r><w:t></w:t></w:r></w:p>`
  const wPageBreak = () => `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`
  const wHRule = () => `<w:p>
    <w:pPr>
      <w:pBdr>
        <w:bottom w:val="single" w:sz="6" w:space="1" w:color="E4E4E7"/>
      </w:pBdr>
    </w:pPr>
  </w:p>`

  return [
    wPageBreak(),
    wHRule(),
    wEmpty(),
    wParagraph('COMPROVANTE DE ASSINATURA ELETRÔNICA', { bold: true, size: 14, color: '4F46E5' }),
    wEmpty(),
    wParagraph(`Contrato: ${data.contractTitle}`, { bold: true }),
    wParagraph(`Assinante: ${data.studentName}`),
    wParagraph(`Data e hora: ${data.signedAt}`),
    wParagraph(`IP registrado: ${data.ipAddress}`),
    wEmpty(),
    wHRule(),
    wEmpty(),
    wParagraph('Assinatura digital:', { bold: true }),
    wEmpty(),
    buildImageXml('rId_sig', 101),
    wEmpty(),
    wParagraph('Foto de confirmação:', { bold: true }),
    wEmpty(),
    buildImageXml('rId_photo', 102),
    wEmpty(),
    wHRule(),
    wParagraph(
      'Este documento foi assinado eletronicamente pela plataforma Tatami. ' +
      'A autenticidade pode ser verificada pelos dados acima.',
      { color: '71717A', size: 9 }
    ),
  ].join('')
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  try {
    // 1. Validar sessão
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, academy_id, full_name')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.academy_id) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
    }

    // 2. Determinar qual student_id usar
    const url = new URL(request.url)
    const queryStudentId = url.searchParams.get('student_id')
    let targetStudentId: string

    if (profile.role === 'admin' || profile.role === 'professor') {
      if (!queryStudentId) {
        return NextResponse.json(
          { error: 'Parâmetro student_id é obrigatório para admin' },
          { status: 400 }
        )
      }
      targetStudentId = queryStudentId
    } else if (profile.role === 'aluno') {
      if (queryStudentId && queryStudentId !== user.id) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }
      targetStudentId = user.id
    } else {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // 3. Buscar o contrato
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, title, file_url, file_type, academy_id')
      .eq('id', params.id)
      .eq('academy_id', profile.academy_id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    // 4. Buscar a assinatura
    const { data: signature } = await supabase
      .from('contract_signatures')
      .select('id, signature_url, photo_url, signed_at, ip_address')
      .eq('contract_id', params.id)
      .eq('student_id', targetStudentId)
      .maybeSingle()

    if (!signature) {
      return NextResponse.json(
        { error: 'Assinatura não encontrada para este aluno' },
        { status: 404 }
      )
    }

    // Buscar nome do aluno que assinou (se diferente do logado)
    let studentName = profile.full_name
    if (targetStudentId !== user.id) {
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', targetStudentId)
        .single()
      studentName = studentProfile?.full_name ?? 'Aluno'
    }

    // 5. Baixar o arquivo DOCX original do storage
    const adminSupabase = createStorageAdminClient()
    const { data: docxBlob, error: docxError } = await adminSupabase.storage
      .from('contracts')
      .download(contract.file_url)

    if (docxError || !docxBlob) {
      console.error('Erro ao baixar DOCX do storage:', docxError)
      return NextResponse.json({ error: 'Erro ao acessar arquivo do contrato' }, { status: 500 })
    }

    const docxArrayBuffer = await docxBlob.arrayBuffer()
    const docxBuffer = Buffer.from(docxArrayBuffer)

    // 6. Baixar imagem da assinatura do storage
    const { data: sigBlob, error: sigError } = await adminSupabase.storage
      .from('signatures')
      .download(signature.signature_url)

    if (sigError || !sigBlob) {
      console.error('Erro ao baixar assinatura:', sigError)
      return NextResponse.json({ error: 'Erro ao acessar imagem da assinatura' }, { status: 500 })
    }

    const sigArrayBuffer = await sigBlob.arrayBuffer()
    const sigBase64 = Buffer.from(sigArrayBuffer).toString('base64')

    // 7. Baixar foto do aluno do storage
    const { data: photoBlob, error: photoError } = await adminSupabase.storage
      .from('signatures')
      .download(signature.photo_url)

    if (photoError || !photoBlob) {
      console.error('Erro ao baixar foto:', photoError)
      return NextResponse.json({ error: 'Erro ao acessar foto do aluno' }, { status: 500 })
    }

    const photoArrayBuffer = await photoBlob.arrayBuffer()
    const photoBase64 = Buffer.from(photoArrayBuffer).toString('base64')

    // 8. Formatar data da assinatura em pt-BR
    const signedAtFormatted = new Date(signature.signed_at).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    let modifiedBuffer: Buffer = docxBuffer

    // 9. Modificar o ZIP e injetar o comprovante no XML
    try {
      const zip = new PizZip(docxBuffer)

      // Ler o document.xml atual
      const docXmlFile = zip.files['word/document.xml']
      if (!docXmlFile) {
        throw new Error('Estrutura DOCX inválida: word/document.xml não encontrado')
      }

      let docXml = docXmlFile.asText()

      // Construir o XML do comprovante contendo OOXML
      const comprovanteXml = buildComprovanteXml({
        studentName: studentName ?? 'Aluno',
        contractTitle: contract.title,
        signedAt: signedAtFormatted,
        ipAddress: signature.ip_address ?? 'não registrado',
        sigBase64,
        photoBase64,
      })

      // Injetar imediatamente antes de </w:body>
      docXml = docXml.replace('</w:body>', `${comprovanteXml}</w:body>`)

      // Atualizar no ZIP
      zip.file('word/document.xml', docXml)

      // 11. Inserir imagens no ZIP (mídia + relationships)
      zip.file('word/media/sig.png', Buffer.from(sigBase64, 'base64'), { binary: true })
      zip.file('word/media/photo.jpg', Buffer.from(photoBase64, 'base64'), { binary: true })

      // Atualizar word/_rels/document.xml.rels
      const relsFile = zip.files['word/_rels/document.xml.rels']
      let relsXml = relsFile
        ? relsFile.asText()
        : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>'

      const sigRel = `<Relationship Id="rId_sig" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/sig.png"/>`
      const photoRel = `<Relationship Id="rId_photo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/photo.jpg"/>`

      if (!relsXml.includes('Id="rId_sig"')) {
        relsXml = relsXml.replace('</Relationships>', `${sigRel}</Relationships>`)
      }
      if (!relsXml.includes('Id="rId_photo"')) {
        relsXml = relsXml.replace('</Relationships>', `${photoRel}</Relationships>`)
      }
      zip.file('word/_rels/document.xml.rels', relsXml)

      // Atualizar [Content_Types].xml
      const ctFile = zip.files['[Content_Types].xml']
      if (ctFile) {
        let ctXml = ctFile.asText()
        if (!ctXml.includes('Extension="png"')) {
          ctXml = ctXml.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>')
        }
        if (!ctXml.includes('Extension="jpg"')) {
          ctXml = ctXml.replace('</Types>', '<Default Extension="jpg" ContentType="image/jpeg"/></Types>')
        }
        if (!ctXml.includes('Extension="jpeg"')) {
          ctXml = ctXml.replace('</Types>', '<Default Extension="jpeg" ContentType="image/jpeg"/></Types>')
        }
        zip.file('[Content_Types].xml', ctXml)
      }

      // Gerar o buffer final do DOCX modificado
      modifiedBuffer = Buffer.from(zip.generate({ type: 'nodebuffer' }))
    } catch (err) {
      console.error('Erro ao modificar DOCX, usando fallback do original:', err)
      // Se a injeção quebrar, retorna o documento original do contrato sem o comprovante
      modifiedBuffer = docxBuffer
    }

    const filename = encodeURIComponent(
      `contrato-assinado-${contract.title.replace(/[^a-zA-Z0-9]/g, '-')}.docx`
    )

    return new NextResponse(new Uint8Array(modifiedBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(modifiedBuffer.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Erro inesperado no download de documento assinado:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
