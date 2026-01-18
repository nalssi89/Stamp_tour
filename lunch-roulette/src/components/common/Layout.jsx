import { Outlet } from 'react-router-dom'
import Header from './Header'
import Navigation from './Navigation'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 p-4 sm:p-6 pb-24 sm:pb-6 max-w-4xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
