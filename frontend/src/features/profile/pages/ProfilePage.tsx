import { useState } from 'react'
import { CalendarDays, CheckCircle2, LogOut, Phone, ShieldCheck, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../../components/feedback'
import { BrutalistButton, ConfirmDialog, Field, HardCard, LoadingState, TextInput } from '../../../components/ui'
import { ApiError } from '../../../lib/http'
import { formatDate, formatPhone } from '../../../lib/formatters'
import { useAuth } from '../../auth/auth-context'

export function ProfilePage() {
  const { user, logout, deleteAccount, status } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | undefined>()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (!user) return <LoadingState label="Loading profile" />

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      showToast({ title: 'Could not log out', description: 'Check your connection and try again.', variant: 'error' })
    }
  }

  const handleDelete = async () => {
    try {
      await deleteAccount(deletePassword)
      setConfirmingDelete(false)
      showToast({ title: 'Account deleted', description: 'Your record has been erased. Thank you for using Kipato.', variant: 'success' })
      navigate('/login', { replace: true })
    } catch (error) {
      setConfirmingDelete(false)
      setDeleteError(error instanceof ApiError && error.status === 401 ? 'That password is not right.' : 'Could not delete your account. Check your connection and try again.')
    }
  }

  const isAdmin = user.role !== 'worker'

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <header className="border-b-2 border-ink pb-5"><p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-muted">Your account</p><h1 className="font-display text-4xl font-bold tracking-[-0.06em]">Profile</h1><p className="mt-2 text-sm leading-6 text-muted">Your identity stays attached to every record you create.</p></header>
      <HardCard className="overflow-hidden" shadow="sun"><div className="flex items-center gap-4 border-b-2 border-ink bg-sun p-5"><div className="flex h-16 w-16 items-center justify-center border-3 border-ink bg-paper font-display text-2xl font-bold">{user.full_name.slice(0, 1).toUpperCase()}</div><div><p className="font-display text-2xl font-bold tracking-tight">{user.full_name}</p><p className="mt-1 text-sm font-semibold">Worker account</p></div></div><div className="space-y-4 p-5"><div className="flex items-center gap-3"><Phone aria-hidden="true" className="text-muted" size={19} /><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Phone number</p><p className="mt-1 font-semibold">{formatPhone(user.phone)}</p></div></div><div className="flex items-center gap-3"><CalendarDays aria-hidden="true" className="text-muted" size={19} /><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Record started</p><p className="mt-1 font-semibold">{formatDate(user.created_at)}</p></div></div><div className="flex items-center gap-3"><ShieldCheck aria-hidden="true" className="text-muted" size={19} /><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Access</p><p className="mt-1 font-semibold">{user.role === 'worker' ? 'Worker-owned records' : 'Administrator'}</p></div></div><div className="flex items-center gap-2 border-t-2 border-ink/15 pt-4 text-sm font-semibold text-jade"><CheckCircle2 aria-hidden="true" size={18} /> {user.email_verified ? 'Contact verified' : 'Phone sign-in enabled'}</div></div></HardCard>
      <div className="border-2 border-ink bg-paper p-4"><p className="text-sm leading-6 text-muted">Kipato is designed to help you keep evidence of the work you do. Add entries often, then generate a statement when you need to show your progress.</p><BrutalistButton className="mt-4" disabled={status === 'submitting'} icon={<LogOut aria-hidden="true" size={17} />} onClick={() => void handleLogout()} variant="ink">{status === 'submitting' ? 'Logging out…' : 'Log out'}</BrutalistButton></div>
      {!isAdmin && (
        <section aria-labelledby="delete-account-heading" className="border-2 border-ink bg-paper p-4">
          <h2 className="font-display text-xl font-bold tracking-tight" id="delete-account-heading">Delete my account</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Permanently erases your record: every entry, import, statement and share link. This cannot be undone, and your phone number becomes free to register again. Enter your password to confirm.</p>
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              setDeleteError(undefined)
              if (!deletePassword) {
                setDeleteError('Enter your password to continue.')
                return
              }
              setConfirmingDelete(true)
            }}
          >
            <Field error={deleteError} id="delete-password" label="Your password" required>
              <TextInput autoComplete="current-password" id="delete-password" onChange={(event) => setDeletePassword(event.target.value)} type="password" value={deletePassword} />
            </Field>
            <BrutalistButton disabled={status === 'submitting'} icon={<Trash2 aria-hidden="true" size={17} />} type="submit" variant="outline">Delete my account</BrutalistButton>
          </form>
          <ConfirmDialog
            confirmLabel="Delete everything"
            description="Your entries, statements and share links will be erased immediately. Anyone holding a statement link will no longer be able to open it."
            onClose={() => setConfirmingDelete(false)}
            onConfirm={() => void handleDelete()}
            open={confirmingDelete}
            pending={status === 'submitting'}
            title="Delete your Kipato account?"
          />
        </section>
      )}
    </div>
  )
}
