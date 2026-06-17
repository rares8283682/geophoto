import { http, HttpResponse } from 'msw'

// ---------------------------------------------------------------------------
// MSW Mock handlers matching the exact absolute backend URLs
// ---------------------------------------------------------------------------

const API_BASE = 'http://localhost:3001'

export const handlers = [
  // --- Auth Routes ---
  http.post(`${API_BASE}/auth/send-signup-code`, () => {
    return HttpResponse.json({ message: 'Verification code sent!', previewUrl: null })
  }),

  http.post(`${API_BASE}/auth/signup`, async ({ request }) => {
    const body = await request.json() as any
    if (body.code === 'wrongcode') {
      return HttpResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 })
    }
    return HttpResponse.json({
      token: 'mock-jwt-token',
      user: { id: 1, email: body.email.toLowerCase() }
    }, { status: 201 })
  }),

  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as any
    if (body.password === 'wrongpassword') {
      return HttpResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    return HttpResponse.json({
      token: 'mock-jwt-token',
      user: { id: 1, email: body.email.toLowerCase() }
    })
  }),

  // --- Photos Routes ---
  http.get(`${API_BASE}/photos`, () => {
    return HttpResponse.json([
      {
        id: 1,
        filename: 'test-123.jpg',
        original_name: 'Paris Eiffel.jpg',
        lat: 48.8584,
        lng: 2.2945,
        ai_description: 'A close-up view of the Eiffel Tower under a clear sky.',
        created_at: new Date().toISOString(),
        author_email: 'test@example.com'
      },
      {
        id: 2,
        filename: 'test-456.jpg',
        original_name: 'London Eye.jpg',
        lat: 51.5033,
        lng: -0.1195,
        ai_description: 'The giant ferris wheel on the South Bank of the River Thames.',
        created_at: new Date().toISOString(),
        author_email: 'user@example.com'
      }
    ])
  }),

  http.get(`${API_BASE}/photos/:id`, ({ params }) => {
    const id = Number(params.id)
    return HttpResponse.json({
      id,
      filename: `test-${id}.jpg`,
      original_name: id === 1 ? 'Paris Eiffel.jpg' : 'London Eye.jpg',
      lat: id === 1 ? 48.8584 : 51.5033,
      lng: id === 1 ? 2.2945 : -0.1195,
      ai_description: id === 1 ? 'A close-up view of the Eiffel Tower under a clear sky.' : 'The giant ferris wheel.',
      created_at: new Date().toISOString(),
      author_email: 'test@example.com',
      user_id: 1 // matching currentUser.id to let them delete
    })
  }),

  http.post(`${API_BASE}/photos`, () => {
    return HttpResponse.json({
      id: 3,
      user_id: 1,
      filename: 'uploaded-789.jpg',
      original_name: 'New Photo.jpg',
      lat: 48.8584,
      lng: 2.2945,
      ai_description: null,
      created_at: new Date().toISOString()
    }, { status: 201 })
  }),

  http.delete(`${API_BASE}/photos/:id`, () => {
    return HttpResponse.json({ message: 'Photo deleted' })
  }),

  http.post(`${API_BASE}/photos/estimate-location`, () => {
    return HttpResponse.json({
      lat: 48.8566,
      lng: 2.3522
    })
  }),

  http.post(`${API_BASE}/photos/:id/regenerate-description`, ({ params }) => {
    return HttpResponse.json({
      message: 'Description updated successfully',
      ai_description: 'Regenerated description for photo ' + params.id
    })
  }),

  // --- Comments Routes ---
  http.get(`${API_BASE}/comments/:photoId`, () => {
    return HttpResponse.json([
      {
        id: 1,
        body: 'Beautiful shot!',
        created_at: new Date().toISOString(),
        author_email: 'commenter@example.com'
      }
    ])
  }),

  http.post(`${API_BASE}/comments/:photoId`, async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      id: 2,
      body: body.body,
      created_at: new Date().toISOString(),
      author_email: 'test@example.com'
    }, { status: 201 })
  })
]
