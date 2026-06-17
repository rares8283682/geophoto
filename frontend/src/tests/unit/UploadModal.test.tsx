import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UploadModal from '../../components/Upload/UploadModal'

// Mock react-leaflet and leaflet to prevent rendering maps in jsdom environment
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="mock-map">{children}</div>,
  TileLayer: () => <div />,
  Marker: () => <div />,
  useMap: () => ({ setView: vi.fn() }),
  useMapEvents: () => null,
}))

vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn(),
  },
  divIcon: vi.fn(),
}))

describe('UploadModal', () => {
  it('renders upload dropzone by default with submit disabled', () => {
    const handleClose = vi.fn()
    const handleUploaded = vi.fn()
    const { container } = render(<UploadModal onClose={handleClose} onUploaded={handleUploaded} />)

    expect(screen.getByText(/Click to browse or drag & drop a photo here/i)).toBeInTheDocument()
    expect(container.querySelector('#btn-submit-upload')).toBeDisabled()
  })

  it('allows manual entering of coordinates', async () => {
    const user = userEvent.setup()
    const { container } = render(<UploadModal onClose={vi.fn()} onUploaded={vi.fn()} />)

    const latInput = container.querySelector('#input-lat')
    const lngInput = container.querySelector('#input-lng')

    await user.type(latInput!, '48.8584')
    await user.type(lngInput!, '2.2945')

    expect(latInput).toHaveValue(48.8584)
    expect(lngInput).toHaveValue(2.2945)
  })

  it('triggers onUploaded callback on successful upload submission', async () => {
    const user = userEvent.setup()
    const handleUploaded = vi.fn()
    const { container } = render(<UploadModal onClose={vi.fn()} onUploaded={handleUploaded} />)

    // Select file input using ID selector
    const fileInput = container.querySelector('#file-input')
    expect(fileInput).toBeInTheDocument()

    // Select mock file
    const file = new File(['image-bytes'], 'eiffel.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput!, file)

    // Set coordinates
    const latInput = container.querySelector('#input-lat')
    const lngInput = container.querySelector('#input-lng')
    await user.type(latInput!, '48.8584')
    await user.type(lngInput!, '2.2945')

    const submitBtn = container.querySelector('#btn-submit-upload')
    expect(submitBtn).toBeEnabled()

    await user.click(submitBtn!)

    await waitFor(() => {
      expect(handleUploaded).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 3,
          filename: 'uploaded-789.jpg',
        })
      )
    })
  })
})
