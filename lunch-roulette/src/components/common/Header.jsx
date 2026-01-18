import { Link, useNavigate } from 'react-router-dom'
import { LogOut, User, Settings } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { ROUTES } from '../../constants'

export default function Header() {
  const { profile, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate(ROUTES.LOGIN)
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to={ROUTES.DASHBOARD} className="flex items-center space-x-2">
            <span className="text-2xl">🍽️</span>
            <span className="text-xl font-bold text-gray-900">점심 룰렛</span>
          </Link>

          <div className="flex items-center space-x-4">
            {profile && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{profile.name}</span>
                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                  {profile.department}
                </span>
              </div>
            )}

            {isAdmin && (
              <Link
                to={ROUTES.ADMIN}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title="관리자"
              >
                <Settings className="w-5 h-5" />
              </Link>
            )}

            <button
              onClick={handleSignOut}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="로그아웃"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
