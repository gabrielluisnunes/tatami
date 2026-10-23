/**
 * @jest-environment node
 */
import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { IDS } from '../helpers/mocks'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createStorageAdminClient: jest.fn(),
}))

const createClientMock = createClient as jest.MockedFunction<typeof createClient>
const createStorageAdminClientMock = createStorageAdminClient as jest.MockedFunction<
  typeof createStorageAdminClient
>

const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w=='

function descriptor() {
  return Array.from({ length: 128 }, (_, i) => i / 128)
}

let update: jest.Mock
let upload: jest.Mock

function mockAluno() {
  update = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  })
  upload = jest.fn().mockResolvedValue({ error: null })

  createClientMock.mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: IDS.student } },
      }),
    },
  } as never)

  createStorageAdminClientMock.mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { role: 'aluno', academy_id: IDS.academy },
            error: null,
          }),
        }),
      }),
      update,
    }),
    storage: {
      from: jest.fn().mockReturnValue({
        upload,
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://signed.example/photo.jpg' },
        }),
      }),
    },
  } as never)
}

function patchJson(body: Record<string, unknown>) {
  return new Request('http://localhost/api/students/profile/photo', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function patchForm(fields: { descriptor?: number[]; day?: string }) {
  const form = new FormData()
  form.append('photo', new File([new Uint8Array([1, 2, 3])], 'photo.jpg', { type: 'image/jpeg' }))
  if (fields.descriptor) {
    form.append('face_descriptor', JSON.stringify(fields.descriptor))
  }
  if (fields.day !== undefined) {
    form.append('payment_due_day', fields.day)
  }
  return new Request('http://localhost/api/students/profile/photo', {
    method: 'PATCH',
    body: form,
  })
}

describe('PATCH /api/students/profile/photo', () => {
  let PATCH: typeof import('@/app/api/students/profile/photo/route').PATCH

  beforeAll(async () => {
    ;({ PATCH } = await import('@/app/api/students/profile/photo/route'))
  })

  beforeEach(() => {
    mockAluno()
  })

  it('JSON sem dia grava o descriptor e não mexe no vencimento', async () => {
    const face = descriptor()
    const res = await PATCH(patchJson({
      photo_base64: PHOTO,
      face_descriptor: face,
    }))

    expect(res.status).toBe(200)
    expect(upload).toHaveBeenCalled()
    const payload = update.mock.calls[0][0]
    expect(payload.face_descriptor).toEqual(face)
    expect(payload.photo_url).toBe(`${IDS.academy}/${IDS.student}.jpeg`)
    expect(payload).not.toHaveProperty('payment_due_day')
  })

  it('JSON com dia válido inclui o vencimento no update', async () => {
    const res = await PATCH(patchJson({
      photo_base64: PHOTO,
      face_descriptor: descriptor(),
      payment_due_day: 15,
    }))

    expect(res.status).toBe(200)
    expect(update.mock.calls[0][0].payment_due_day).toBe(15)
  })

  it('multipart só com arquivo responde 400 e não grava', async () => {
    const res = await PATCH(patchForm({}))

    expect(res.status).toBe(400)
    expect(upload).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('multipart com descriptor e sem dia não grava vencimento 1', async () => {
    const face = descriptor()
    const res = await PATCH(patchForm({ descriptor: face }))

    expect(res.status).toBe(200)
    const payload = update.mock.calls[0][0]
    expect(payload.face_descriptor).toEqual(face)
    expect(payload).not.toHaveProperty('payment_due_day')
  })

  it('JSON com dia inválido responde 400 e não grava', async () => {
    const res = await PATCH(patchJson({
      photo_base64: PHOTO,
      face_descriptor: descriptor(),
      payment_due_day: 0,
    }))

    expect(res.status).toBe(400)
    expect(upload).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
})
