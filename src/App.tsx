import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import Home from './pages/Home'
import Matches from './pages/Matches'
import MatchDetail from './pages/MatchDetail'
import Venues from './pages/Venues'
import Community from './pages/Community'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Auth from './pages/Auth'
import CertificationApply from './pages/CertificationApply'
import ProfileEdit from './pages/ProfileEdit'
import PublicProfileEdit from './pages/PublicProfileEdit'
import UserProfile from './pages/UserProfile'
import PlayerCard from './pages/PlayerCard'
import Teams from './pages/Teams'
import TeamDetail from './pages/TeamDetail'
import Admin from './pages/Admin'
import Notifications from './pages/Notifications'

const App: React.FC = () => {
  const location = useLocation()
  const showBottomNav = ['/', '/matches', '/venues', '/community', '/profile', '/teams'].includes(location.pathname)

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="fixed top-0 left-0 w-full h-64 bg-gradient-to-b from-emerald-50 to-transparent pointer-events-none z-0" />
      
      <div className="relative z-10 max-w-md mx-auto min-h-screen shadow-2xl bg-slate-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/matches/:id" element={<MatchDetail />} />
          <Route path="/venues" element={<Venues />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:id" element={<TeamDetail />} />
          <Route path="/community" element={<Community />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<ProfileEdit />} />
          <Route path="/profile/public" element={<PublicProfileEdit />} />
          <Route path="/user/:id" element={<UserProfile />} />
          <Route path="/user/:id/card" element={<PlayerCard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/certification-apply" element={<CertificationApply />} />
        </Routes>
        {showBottomNav && <BottomNav />}
      </div>
    </div>
  )
}

export default App
