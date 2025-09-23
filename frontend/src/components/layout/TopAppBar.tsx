import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../store'
import { toggleSidebar, setSearchOpen, openModal } from '../../store/slices/uiSlice'
import { Button } from '../ui/button'
import { 
  Menu, 
  Search, 
  Settings, 
  User, 
  Bell, 
  HelpCircle,
  Zap,
  GraduationCap
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface TopAppBarProps {
  className?: string
}

export const TopAppBar: React.FC<TopAppBarProps> = ({ className }) => {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector(state => state.auth)
  const { searchState } = useAppSelector(state => state.ui)
  const { notifications } = useAppSelector(state => state.analysis)
  const [showNotifications, setShowNotifications] = useState(false)

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

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      <div className="academic-container flex h-14 items-center justify-between">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => dispatch(toggleSidebar())}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-6 w-6 text-primary-600" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold academic-header">
                  Curriculum Alignment
                </h1>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Central European University
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Center section - Search */}
        <div className="flex-1 max-w-md mx-4">
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground"
            onClick={handleSearchClick}
          >
            <Search className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Search curricula, programs...</span>
            <span className="sm:hidden">Search...</span>
            <kbd className="ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-2">
          {/* LLM Configuration */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleLLMConfigClick}
            className="relative"
            title="LLM Configuration"
          >
            <Zap className="h-4 w-4" />
            <span className="sr-only">LLM Configuration</span>
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>

            {/* Notifications dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-md border bg-popover p-2 shadow-lg z-50">
                <div className="flex items-center justify-between p-2 border-b mb-2">
                  <h3 className="font-semibold">Notifications</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowNotifications(false)}>
                    ×
                  </Button>
                </div>
                
                {notifications.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No notifications
                  </p>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {notifications.slice(0, 5).map((notification) => (
                      <div 
                        key={notification.id}
                        className={cn(
                          "p-2 rounded border-l-2",
                          notification.type === 'error' && 'border-l-red-500 bg-red-50',
                          notification.type === 'warning' && 'border-l-yellow-500 bg-yellow-50',
                          notification.type === 'success' && 'border-l-green-500 bg-green-50',
                          notification.type === 'info' && 'border-l-blue-500 bg-blue-50',
                          !notification.read && 'ring-1 ring-primary/20'
                        )}
                      >
                        <div className="font-medium text-sm">{notification.title}</div>
                        <div className="text-xs text-muted-foreground">{notification.message}</div>
                        <div className="text-xs text-muted-foreground mt-1">
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
          <Button variant="ghost" size="icon" title="Help">
            <HelpCircle className="h-4 w-4" />
            <span className="sr-only">Help</span>
          </Button>

          {/* Settings */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleSettingsClick}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>

          {/* User menu */}
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="hidden sm:flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span className="hidden md:inline text-sm">
                {user?.name || 'Guest User'}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Search overlay */}
      {searchState.isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg">
            <div className="flex items-center space-x-2 mb-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search curricula, programs, analyses..."
                className="flex-1 border-none outline-none text-lg bg-transparent"
                value={searchState.query}
                onChange={() => dispatch(setSearchOpen(true))}
                autoFocus
              />
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => dispatch(setSearchOpen(false))}
              >
                <kbd className="flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ESC
                </kbd>
              </Button>
            </div>
            
            {searchState.results.length > 0 && (
              <div className="border-t pt-4">
                <div className="text-sm text-muted-foreground mb-2">Results</div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchState.results.map((result, index) => (
                    <div key={index} className="p-2 hover:bg-accent rounded cursor-pointer">
                      <div className="font-medium">{result.title}</div>
                      <div className="text-sm text-muted-foreground">{result.description}</div>
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