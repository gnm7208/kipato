import { Eye, EyeOff, LockKeyhole, Smartphone, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isMockMode } from '../../data/repository'
import { ApiError } from '../../lib/http'
import { BrutalistButton, Field, IconButton, TextInput, fieldDescribedBy } from '../../components/ui'
import { InlineAlert } from '../../components/feedback'
import { useAuth } from './auth-context'
import type { AuthMode } from '../../types'

interface AuthFormProps {
  mode: AuthMode
}

interface FormErrors {
  fullName?: string
  phone?: string
  password?: string
}

export function AuthForm({ mode }: AuthFormProps) {
  const isRegister = mode === 'register'
  const { login, register, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState(isMockMode() ? '+254700000001' : '')
  const [password, setPassword] = useState(isMockMode() ? 'securepassword123' : '')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState('')

  const validate = () => {
    const nextErrors: FormErrors = {}
    if (isRegister && fullName.trim().length < 2) nextErrors.fullName = 'Enter your full name.'
    if (!/^\+?\d{9,15}$/.test(phone.replaceAll(' ', ''))) nextErrors.phone = 'Enter a valid phone number.'
    if (password.length < 8) nextErrors.password = 'Use at least 8 characters.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setServerError('')
    if (!validate()) return

    try {
      if (isRegister) {
        await register({ full_name: fullName.trim(), phone: phone.replaceAll(' ', ''), password })
      } else {
        await login({ phone: phone.replaceAll(' ', ''), password })
      }
      const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/app'
      navigate(destination, { replace: true })
    } catch (error: unknown) {
      setServerError(error instanceof ApiError ? error.message : 'Something went wrong. Try again.')
    }
  }

  const isSubmitting = status === 'submitting'

  return (
    <main className="flex min-h-svh items-center bg-canvas px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <Link aria-label="Kipato home" className="mb-10 inline-flex items-center gap-2.5" to="/login">
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center border-3 border-ink bg-ink text-sun"><span className="font-display text-lg font-bold">↗</span></span>
          <span className="font-display text-lg font-bold tracking-[0.16em]">KIPATO</span>
        </Link>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-muted">{isRegister ? 'Start your record' : 'Your worker record'}</p>
        <h1 className="max-w-sm font-display text-5xl font-bold leading-[0.92] tracking-[-0.07em]">Your money.<br /><span className="text-jade">Your record.</span></h1>
        <p className="mt-5 max-w-sm text-sm leading-6 text-muted">{isRegister ? 'Build a clear record of the work you do every day.' : 'Pick up where you left off and keep every earning visible.'}</p>
        {serverError ? <div className="mt-6"><InlineAlert>{serverError}</InlineAlert></div> : null}
        <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit}>
          {isRegister ? (
            <Field error={errors.fullName} id="full-name" label="Full name" required>
              <div className="relative">
                <UserRound aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <TextInput aria-describedby={fieldDescribedBy('full-name', undefined, errors.fullName)} aria-invalid={Boolean(errors.fullName)} autoComplete="name" id="full-name" onBlur={validate} onChange={(event) => setFullName(event.target.value)} placeholder="Amina Wanjiku" value={fullName} className="pl-10" />
              </div>
            </Field>
          ) : null}
          <Field error={errors.phone} hint="Use the number you use for work." id="phone" label="Phone number" required>
            <div className="relative">
              <Smartphone aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <TextInput aria-describedby={fieldDescribedBy('phone', 'Use the number you use for work.', errors.phone)} aria-invalid={Boolean(errors.phone)} autoComplete="tel" id="phone" inputMode="tel" onBlur={validate} onChange={(event) => setPhone(event.target.value)} placeholder="+254 700 000 001" value={phone} className="pl-10" />
            </div>
          </Field>
          <Field error={errors.password} hint={isRegister ? 'At least 8 characters.' : undefined} id="password" label="Password" required>
            <div className="relative">
              <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <TextInput aria-describedby={fieldDescribedBy('password', isRegister ? 'At least 8 characters.' : undefined, errors.password)} aria-invalid={Boolean(errors.password)} autoComplete={isRegister ? 'new-password' : 'current-password'} id="password" onBlur={validate} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" type={showPassword ? 'text' : 'password'} value={password} className="pl-10 pr-12" />
              <IconButton className="absolute right-1 top-1/2 -translate-y-1/2 border-0 bg-transparent shadow-none" label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((current) => !current)} size="sm">
                {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
              </IconButton>
            </div>
          </Field>
          <BrutalistButton className="w-full" disabled={isSubmitting} size="lg" type="submit" variant="sun">
            {isSubmitting ? 'Saving…' : isRegister ? 'Create my record' : 'Log in'}
          </BrutalistButton>
        </form>
        {isMockMode() && !isRegister ? <p className="mt-4 border-l-3 border-jade pl-3 text-xs leading-5 text-muted">Demo access is prefilled. Use <strong className="text-ink">+254700000001</strong> and <strong className="text-ink">securepassword123</strong>.</p> : null}
        <p className="mt-8 text-center text-sm text-muted">
          {isRegister ? 'Already have a record?' : 'New to Kipato?'}{' '}
          <Link className="font-bold text-ink underline decoration-2 underline-offset-4" to={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Create an account'}</Link>
        </p>
      </div>
    </main>
  )
}
