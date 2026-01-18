import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { ROUTES } from '../../constants'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin, isProfileComplete } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (!isProfileComplete) {
    return <Navigate to={ROUTES.SIGNUP} state={{ step: 'profile' }} replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return children
}
