import { NavLink } from 'react-router-dom'
import { Home, Users, Utensils, BarChart3, Trophy } from 'lucide-react'
import { ROUTES } from '../../constants'

const navItems = [
  { to: ROUTES.DASHBOARD, icon: Home, label: '홈' },
  { to: ROUTES.MATCH_REQUEST, icon: Users, label: '매칭 신청' },
  { to: ROUTES.LUNCH_RECORD, icon: Utensils, label: '점심 인증' },
  { to: ROUTES.MY_STATS, icon: BarChart3, label: '내 통계' },
  { to: ROUTES.RANKING, icon: Trophy, label: '랭킹' },
]

export default function Navigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 sm:static sm:border-t-0 sm:border-r sm:w-20 sm:min-h-screen">
      <ul className="flex justify-around sm:flex-col sm:items-center sm:pt-4 sm:space-y-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-3 sm:px-4 sm:py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`
              }
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
