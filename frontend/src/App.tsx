import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from './store'
import { setTheme } from './store/slices/uiSlice'
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
import { UploadDocumentModal } from './components/modals/UploadDocumentModal'
import { CreateProgramModal } from './components/modals/CreateProgramModal'
import { AnalysisDetailsModal } from './components/modals/AnalysisDetailsModal'

function App() {
  const dispatch = useAppDispatch()
  const { currentView } = useAppSelector(state => state.ui)

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system'
    dispatch(setTheme(savedTheme))
  }, [dispatch])

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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <TopAppBar />
      
      <main className="flex-1 overflow-hidden">
        {renderCurrentView()}
      </main>

      <BottomStatusBar />
      
      {/* Modals */}
      <LLMConfigModal />
      <SettingsModal />
      <UploadDocumentModal />
      <CreateProgramModal />
      <AnalysisDetailsModal />
    </div>
  )
}

export default App
