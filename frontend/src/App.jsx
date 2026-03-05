import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <span className="text-lg font-bold text-white flex items-center gap-2">
            🔗 <span className="text-indigo-400">Link</span>Hub
          </span>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `text-sm px-3 py-1.5 rounded-lg transition ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`
            }
          >
            Links
          </NavLink>
          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `text-sm px-3 py-1.5 rounded-lg transition ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`
            }
          >
            Analytics
          </NavLink>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </div>
  )
}
