import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../store'
import { toggleSidebar, setSearchOpen, openModal, setCurrentView } from '../../store/slices/uiSlice'
import { logout } from '../../store/slices/authSlice'
import { 
  Menu, 
  Search, 
  Settings, 
  User, 
  Bell, 
  HelpCircle,
  Zap,
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  BarChart3,
  FileText,
  MessageSquare
} from 'lucide-react'
import { cn } from "@/lib/utils.js"
import { Avatar } from '../ui/Avatar'

interface TopAppBarProps {
  className?: string
}

export const TopAppBar: React.FC<TopAppBarProps> = ({ className }) => {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector(state => state.auth)
  const { searchState, currentView } = useAppSelector(state => state.ui)
  const { notifications } = useAppSelector(state => state.analysis)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const unreadNotifications = notifications.filter(n => !n.read).length

  const handleSearchClick = () => {
    dispatch(setSearchOpen(true))
  }

  const handleSettingsClick = () => {
    dispatch(openModal('settings'))
  }

  const handleLLMConfigClick = () => {
    dispatch(openModal('llmConfig'))
  }

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'programs', label: 'Programs', icon: BookOpen },
    { id: 'analysis', label: 'Analysis', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
  ] as const

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm",
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => dispatch(toggleSidebar())}
            className="p-2 hover:bg-gray-100 rounded-md lg:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600 shadow-sm">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-semibold text-gray-900">
                Curriculum Alignment
              </h1>
              <p className="text-sm text-gray-500 hidden md:block">
                Central European University
              </p>
            </div>
          </div>
        </div>

        {/* Center section - Navigation */}
        <div className="flex-1 flex items-center justify-center">
          <nav className="hidden lg:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => dispatch(setCurrentView(item.id as any))}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-white text-blue-600 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden xl:inline">{item.label}</span>
                </button>
              )
            })}
          </nav>
          
          {/* Mobile/tablet search */}
          <div className="lg:hidden flex-1 max-w-md">
            <button
              onClick={handleSearchClick}
              className="w-full flex items-center gap-3 px-4 py-2 text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Search className="h-4 w-4" />
              <span>Search...</span>
            </button>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Search for desktop */}
          <button 
            onClick={handleSearchClick}
            className="p-2 hover:bg-gray-100 rounded-md hidden lg:flex"
            title="Search"
          >
            <Search className="h-4 w-4" />
          </button>
          
          {/* LLM Configuration */}
          <button 
            onClick={handleLLMConfigClick}
            className="p-2 hover:bg-gray-100 rounded-md relative"
            title="LLM Configuration"
          >
            <Zap className="h-4 w-4" />
            <span className="sr-only">LLM Configuration</span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-gray-100 rounded-md relative"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </button>

            {/* Notifications dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg border border-gray-200 shadow-lg p-4 z-50">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                {notifications.length === 0 ? (
                  <p className="text-center text-gray-500 py-6">
                    No notifications
                  </p>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {notifications.slice(0, 5).map((notification) => (
                      <div 
                        key={notification.id}
                        className={cn(
                          "p-3 rounded-lg border-l-4 transition-all hover:shadow-sm",
                          notification.type === 'error' && 'border-l-red-500 bg-red-50',
                          notification.type === 'warning' && 'border-l-yellow-500 bg-yellow-50',
                          notification.type === 'success' && 'border-l-green-500 bg-green-50',
                          notification.type === 'info' && 'border-l-blue-500 bg-blue-50',
                          !notification.read && 'ring-1 ring-blue-200'
                        )}
                      >
                        <div className="font-medium text-sm text-gray-900">{notification.title}</div>
                        <div className="text-xs text-gray-600 mt-1">{notification.message}</div>
                        <div className="text-xs text-gray-400 mt-2">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Help */}
          <button className="p-2 hover:bg-gray-100 rounded-md" title="Help">
            <HelpCircle className="h-4 w-4" />
            <span className="sr-only">Help</span>
          </button>

          {/* Settings */}
          <button 
            onClick={handleSettingsClick}
            className="p-2 hover:bg-gray-100 rounded-md"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </button>

          {/* User menu */}
          <div className="flex items-center ml-3 pl-3 border-l border-gray-200">
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-md"
                >
                  <Avatar 
                    email={user.email} 
                    name={user.name} 
                    picture={user.picture}
                    size={28}
                  />
                  <span className="hidden md:inline text-sm font-medium text-gray-700">
                    {user.name}
                  </span>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button 
                      onClick={() => {
                        setShowUserMenu(false)
                        dispatch(openModal('profile'))
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile
                    </button>
                    <button 
                      onClick={() => {
                        setShowUserMenu(false)
                        dispatch(openModal('settings'))
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Settings
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button 
                      onClick={() => {
                        setShowUserMenu(false)
                        dispatch(logout())
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={() => dispatch(openModal('login'))}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium text-sm transition-colors"
              >
                <User className="h-4 w-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search overlay */}
      {searchState.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="fixed left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search curricula, programs, analyses..."
                className="flex-1 text-lg border-none outline-none bg-transparent"
                value={searchState.query}
                onChange={() => dispatch(setSearchOpen(true))}
                autoFocus
              />
              <button 
                onClick={() => dispatch(setSearchOpen(false))}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <kbd className="flex h-6 select-none items-center gap-1 rounded bg-gray-100 px-2 font-mono text-xs font-medium text-gray-500">
                  ESC
                </kbd>
              </button>
            </div>
            
            {searchState.results.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-500 mb-3">Results</div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchState.results.map((result, index) => (
                    <div key={index} className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                      <div className="font-medium text-gray-900">{result.title}</div>
                      <div className="text-sm text-gray-600 mt-1">{result.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}