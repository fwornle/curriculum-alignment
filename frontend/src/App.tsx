import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from './store'
import { setTheme } from './store/slices/uiSlice'
import { useAuth } from './hooks/useAuth'
import { TopAppBar } from './components/layout/TopAppBar'
import { BottomStatusBar } from './components/layout/BottomStatusBar'
import { DashboardView } from './components/views/DashboardView'
import { ProgramsView } from './components/views/ProgramsView'
import { AnalysisView } from './components/views/AnalysisView'
import { ReportsView } from './components/views/ReportsView'
import { ComponentsTestView } from './components/views/ComponentsTestView'
import { ChatInterface } from './components/chat/ChatInterface'
import { LLMConfigModal } from './components/modals/LLMConfigModal'
import { SettingsModal } from './components/modals/SettingsModal'
import { ProfileModal } from './components/modals/ProfileModal'
import { UploadDocumentModal } from './components/modals/UploadDocumentModal'
import { CreateProgramModal } from './components/modals/CreateProgramModal'
import { AnalysisDetailsModal } from './components/modals/AnalysisDetailsModal'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastContainer } from './components/ui/toast'
import { LoginModal } from './components/auth/LoginModal'

function App() {
  const dispatch = useAppDispatch()
  const { currentView } = useAppSelector(state => state.ui)
  
  // Initialize authentication and connect API client to Redux store
  const auth = useAuth()

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system'
    dispatch(setTheme(savedTheme))
  }, [dispatch])

  // Clear any old mock authentication data on app start
  useEffect(() => {
    const authState = localStorage.getItem('auth_state')
    if (authState) {
      try {
        const parsed = JSON.parse(authState)
        // If auth state exists but has no tokens, it's old mock data - clear it
        if (parsed.user && !parsed.tokens?.accessToken) {
          console.info('Clearing old mock authentication data')
          localStorage.removeItem('auth_state')
          window.location.reload()
        }
      } catch (e) {
        localStorage.removeItem('auth_state')
      }
    }
  }, [])

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />
      case 'programs':
        return <ProgramsView />
      case 'analysis':
        return <AnalysisView />
      case 'reports':
        return <ReportsView />
      case 'chat':
        return <ChatInterface />
      case 'components-test':
        return <ComponentsTestView />
      default:
        return <DashboardView />
    }
  }

  return (
    <ErrorBoundary level="critical">
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <ErrorBoundary level="component">
          <TopAppBar />
        </ErrorBoundary>
        
        <main className="flex-1 overflow-hidden">
          <ErrorBoundary level="page">
            {renderCurrentView()}
          </ErrorBoundary>
        </main>

        <ErrorBoundary level="component">
          <BottomStatusBar />
        </ErrorBoundary>
        
        {/* Modals */}
        <ErrorBoundary level="component">
          <LoginModal />
          <LLMConfigModal />
          <SettingsModal />
          <ProfileModal />
          <UploadDocumentModal />
          <CreateProgramModal />
          <AnalysisDetailsModal />
        </ErrorBoundary>

        {/* Global toast notifications */}
        <ToastContainer />
      </div>
    </ErrorBoundary>
  )
}

export default App