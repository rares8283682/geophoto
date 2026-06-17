import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthPage from '../../components/Auth/AuthPage'

// Mock the AuthContext hook
const mockLogin = vi.fn()
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
  AuthProvider: ({ children }: any) => <div>{children}</div>
}))

describe('AuthPage', () => {
  it('renders login tab by default with email and password fields', () => {
    const { container } = render(<AuthPage />)

    expect(container.querySelector('#auth-email')).toBeInTheDocument()
    expect(container.querySelector('#auth-password')).toBeInTheDocument()
    expect(container.querySelector('#auth-submit')).toBeInTheDocument()
  })

  it('allows switching to create account tab', async () => {
    const user = userEvent.setup()
    const { container } = render(<AuthPage />)

    const signupTab = container.querySelector('#tab-signup')
    expect(signupTab).toBeInTheDocument()
    await user.click(signupTab!)

    expect(container.querySelector('#auth-name')).toBeInTheDocument()
    expect(container.querySelector('#auth-username')).toBeInTheDocument()
    expect(container.querySelector('#auth-email')).toBeInTheDocument()
    expect(container.querySelector('#auth-email-confirm')).toBeInTheDocument()
    expect(container.querySelector('#auth-password')).toBeInTheDocument()
  })

  it('validates password strength rules on signup', async () => {
    const user = userEvent.setup()
    const { container } = render(<AuthPage />)

    const signupTab = container.querySelector('#tab-signup')
    await user.click(signupTab!)

    const passwordInput = container.querySelector('#auth-password')
    await user.type(passwordInput!, 'abc')

    // Expect password strength rules display
    expect(screen.getByText(/Password Strength:/i)).toBeInTheDocument()
    expect(screen.getByText(/Weak/i)).toBeInTheDocument()
  })

  it('shows error on login with invalid credentials', async () => {
    const user = userEvent.setup()
    const { container } = render(<AuthPage />)

    const emailInput = container.querySelector('#auth-email')
    const passwordInput = container.querySelector('#auth-password')
    const submitBtn = container.querySelector('#auth-submit')

    await user.type(emailInput!, 'test@example.com')
    await user.type(passwordInput!, 'wrongpassword') // Handlers return 401 for 'wrongpassword'
    await user.click(submitBtn!)

    expect(await screen.findByText(/Invalid email or password/i)).toBeInTheDocument()
  })

  it('successful login calls login function from context', async () => {
    const user = userEvent.setup()
    const { container } = render(<AuthPage />)

    const emailInput = container.querySelector('#auth-email')
    const passwordInput = container.querySelector('#auth-password')
    const submitBtn = container.querySelector('#auth-submit')

    await user.type(emailInput!, 'test@example.com')
    await user.type(passwordInput!, 'Password123')
    await user.click(submitBtn!)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled()
    })
  })
})
