import React from 'react'
import { useAppSelector } from '../../store'
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Zap, 
  Activity,
  Users,
  Database,
  Wifi,
  WifiOff,
  DollarSign
} from 'lucide-react'
import { cn } from "../../lib/utils.js"

interface BottomStatusBarProps {
  className?: string
}

export const BottomStatusBar: React.FC<BottomStatusBarProps> = ({ className }) => {
  const { loading } = useAppSelector(state => state.ui)
  const { isAuthenticated, user } = useAppSelector(state => state.auth)
  const { analyses, workflows, isRunningAnalysis } = useAppSelector(state => state.analysis)
  const { isConnected } = useAppSelector(state => state.chat)
  const { currentConfiguration } = useAppSelector(state => state.llmConfig)

  // Calculate active operations
  const activeAnalyses = analyses.filter(a => a.status === 'in-progress').length
  const activeWorkflows = workflows.filter(w => w.status === 'running').length
  const totalActiveOps = activeAnalyses + activeWorkflows

  // Get current LLM model info
  const currentModel = currentConfiguration?.model || 'No model configured'

  // Calculate estimated costs (mock data for demo)
  const estimatedDailyCost = 12.50
  const monthlyBudget = 500

  return (
    <footer className={cn(
      "sticky bottom-0 z-30 w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      "transition-all duration-200",
      className
    )}>
      <div className="academic-container flex h-8 items-center justify-between text-xs">
        {/* Left section - System status */}
        <div className="flex items-center space-x-4">
          {/* Connection status */}
          <div className="flex items-center space-x-1">
            {isConnected ? (
              <Wifi className="h-3 w-3 text-green-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" />
            )}
            <span className={cn(
              "text-xs",
              isConnected ? "text-green-600" : "text-red-600"
            )}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Active operations */}
          {totalActiveOps > 0 && (
            <div className="flex items-center space-x-1">
              <Activity className="h-3 w-3 text-blue-500 animate-pulse" />
              <span className="text-blue-600">
                {totalActiveOps} active operation{totalActiveOps !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Loading indicator */}
          {(loading.global || isRunningAnalysis) && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3 text-yellow-500 animate-spin" />
              <span className="text-yellow-600">Processing...</span>
            </div>
          )}

          {/* Authentication status */}
          <div className="flex items-center space-x-1">
            {isAuthenticated ? (
              <>
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-green-600">
                  Signed in as {user?.name || 'Unknown'}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 text-yellow-500" />
                <span className="text-yellow-600">Not authenticated</span>
              </>
            )}
          </div>
        </div>

        {/* Center section - Current analysis/workflow info */}
        <div className="flex items-center space-x-4">
          {activeAnalyses > 0 && (
            <div className="flex items-center space-x-1">
              <Database className="h-3 w-3 text-blue-500" />
              <span className="text-muted-foreground">
                Analyzing {activeAnalyses} curriculum{activeAnalyses !== 1 ? 'a' : 'um'}
              </span>
            </div>
          )}

          {activeWorkflows > 0 && (
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3 text-purple-500" />
              <span className="text-muted-foreground">
                {activeWorkflows} workflow{activeWorkflows !== 1 ? 's' : ''} running
              </span>
            </div>
          )}
        </div>

        {/* Right section - LLM and cost info */}
        <div className="flex items-center space-x-4">
          {/* Cost tracking */}
          <div className="flex items-center space-x-1">
            <DollarSign className="h-3 w-3 text-green-500" />
            <span className="text-muted-foreground">
              ${estimatedDailyCost.toFixed(2)} / ${monthlyBudget}
            </span>
          </div>

          {/* Current LLM model */}
          <div className="flex items-center space-x-1">
            <Zap className="h-3 w-3 text-yellow-500" />
            <span className="text-muted-foreground truncate max-w-32">
              {currentModel}
            </span>
          </div>

          {/* Analysis statistics */}
          <div className="flex items-center space-x-1">
            <Activity className="h-3 w-3 text-blue-500" />
            <span className="text-muted-foreground">
              {analyses.length} analysis{analyses.length !== 1 ? 'es' : ''}
            </span>
          </div>

          {/* Environment indicator */}
          <div className="flex items-center space-x-1">
            <div className={cn(
              "h-2 w-2 rounded-full",
              process.env.NODE_ENV === 'production' ? "bg-green-500" : "bg-yellow-500"
            )} />
            <span className="text-muted-foreground">
              {process.env.NODE_ENV === 'production' ? 'PROD' : 'DEV'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress indicator for active operations */}
      {totalActiveOps > 0 && (
        <div className="w-full h-0.5 bg-muted">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"
            style={{ width: '45%' }} // This would be calculated based on actual progress
          />
        </div>
      )}
    </footer>
  )
}