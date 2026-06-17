import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PhotoModal from '../../components/PhotoModal/PhotoModal'
import { api } from '../../api'

// Mock the API client
vi.mock('../../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  }
}))

describe('PhotoModal', () => {
  const mockPhoto = {
    id: 1,
    user_id: 10,
    filename: 'test-photo.jpg',
    original_name: 'Beautiful Mountains',
    lat: 45.1234,
    lng: -122.5678,
    ai_description: 'A beautiful vista of high mountains covered with snow under a blue sky.',
    author_email: 'owner@example.com',
    created_at: '2026-06-17T12:00:00.000Z'
  }

  const mockComments = [
    { id: 101, photo_id: 1, user_id: 11, author_email: 'user1@example.com', body: 'Amazing shot!', created_at: '2026-06-17T13:00:00.000Z' },
    { id: 102, photo_id: 1, user_id: 12, author_email: 'user2@example.com', body: 'Love the lighting.', created_at: '2026-06-17T14:00:00.000Z' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn().mockReturnValue(true)
    window.alert = vi.fn()
    
    // Default mock responses
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/photos/1')) {
        return Promise.resolve({ data: mockPhoto })
      }
      if (url.includes('/comments/1')) {
        return Promise.resolve({ data: mockComments })
      }
      return Promise.reject(new Error('Not found'))
    })
  })

  it('renders loading spinner initially and then displays photo details', async () => {
    render(<PhotoModal photoId={1} onClose={vi.fn()} currentUser={{ id: 5 }} onDeleted={vi.fn()} />)
    
    expect(screen.getByText(/Loading…/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Beautiful Mountains')).toBeInTheDocument()
      expect(screen.getByText('📷 owner@example.com')).toBeInTheDocument()
      expect(screen.getByText(mockPhoto.ai_description)).toBeInTheDocument()
      expect(screen.getByText('Amazing shot!')).toBeInTheDocument()
      expect(screen.getByText('Love the lighting.')).toBeInTheDocument()
    })
  })

  it('renders delete button for the photo owner and triggers deletion API', async () => {
    const user = userEvent.setup()
    const handleDeleted = vi.fn()
    
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } })

    const { container } = render(
      <PhotoModal 
        photoId={1} 
        onClose={vi.fn()} 
        currentUser={{ id: 10 }} // Matches mockPhoto.user_id
        onDeleted={handleDeleted} 
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Beautiful Mountains')).toBeInTheDocument()
    })

    const deleteBtn = container.querySelector('button[style*="color: rgb(239, 68, 68)"]') || screen.getByText(/Delete Photo/i)
    expect(deleteBtn).toBeInTheDocument()

    await user.click(deleteBtn)

    expect(window.confirm).toHaveBeenCalled()
    expect(api.delete).toHaveBeenCalledWith('/photos/1')
    await waitFor(() => {
      expect(handleDeleted).toHaveBeenCalledWith(1)
    })
  })

  it('does not render delete button for non-owners', async () => {
    render(
      <PhotoModal 
        photoId={1} 
        onClose={vi.fn()} 
        currentUser={{ id: 5 }} // Does NOT match mockPhoto.user_id
        onDeleted={vi.fn()} 
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Beautiful Mountains')).toBeInTheDocument()
    })

    expect(screen.queryByText(/Delete Photo/i)).not.toBeInTheDocument()
  })

  it('allows AI narration regeneration when clicking the regenerate button', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockResolvedValue({ data: { ai_description: 'Updated AI description.' } })

    render(
      <PhotoModal 
        photoId={1} 
        onClose={vi.fn()} 
        currentUser={{ id: 10 }} 
        onDeleted={vi.fn()} 
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Beautiful Mountains')).toBeInTheDocument()
    })

    const regenBtn = screen.getByText(/Regenerate/i)
    expect(regenBtn).toBeInTheDocument()

    await user.click(regenBtn)

    expect(api.post).toHaveBeenCalledWith('/photos/1/regenerate-description')
    await waitFor(() => {
      expect(screen.getByText('Updated AI description.')).toBeInTheDocument()
    })
  })

  it('allows writing and posting a comment', async () => {
    const user = userEvent.setup()
    const newCommentResponse = {
      id: 103,
      photo_id: 1,
      user_id: 5,
      author_email: 'user5@example.com',
      body: 'Excellent view!',
      created_at: new Date().toISOString()
    }
    
    vi.mocked(api.post).mockResolvedValue({ data: newCommentResponse })

    const { container } = render(
      <PhotoModal 
        photoId={1} 
        onClose={vi.fn()} 
        currentUser={{ id: 5 }} 
        onDeleted={vi.fn()} 
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Beautiful Mountains')).toBeInTheDocument()
    })

    const commentInput = container.querySelector('#comment-input')
    const submitBtn = container.querySelector('#btn-submit-comment')

    expect(commentInput).toBeInTheDocument()
    expect(submitBtn).toBeDisabled()

    await user.type(commentInput!, 'Excellent view!')
    expect(submitBtn).toBeEnabled()

    await user.click(submitBtn!)

    expect(api.post).toHaveBeenCalledWith('/comments/1', { body: 'Excellent view!' })
    await waitFor(() => {
      expect(screen.getByText('Excellent view!')).toBeInTheDocument()
      expect(commentInput).toHaveValue('') // Input cleared
    })
  })
})
