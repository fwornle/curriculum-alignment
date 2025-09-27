import React from 'react'
import { useAppDispatch, useAppSelector } from '../../store'
import { closeModal } from '../../store/slices/uiSlice'
import { Button } from '../ui/button'
import { 
  X,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Calendar,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Download
} from 'lucide-react'
import { cn } from "@/lib/utils"

export const AnalysisDetailsModal: React.FC = () => {
  const dispatch = useAppDispatch()
  const { modals } = useAppSelector(state => state.ui)
  const { currentAnalysis } = useAppSelector(state => state.analysis)

  if (!modals.analysisDetails || !currentAnalysis) return null

  const handleClose = () => {
    dispatch(closeModal('analysisDetails'))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'in-progress':
        return <Play className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'in-progress':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatDuration = (createdAt: string, completedAt?: string) => {
    const start = new Date(createdAt)
    const end = completedAt ? new Date(completedAt) : new Date()
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`
    }
    return `${diffMins}m`
  }

  const ScoreIndicator = ({ score, label }: { score: number; label: string }) => (
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-2">
        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
          <path
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="2"
          />
          <path
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444"}
            strokeWidth="2"
            strokeDasharray={`${score}, 100`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{score}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative w-full max-w-4xl mx-4 bg-background rounded-lg shadow-lg border max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Analysis Details</h2>
              <p className="text-sm text-muted-foreground">
                {currentAnalysis.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={cn("p-4 rounded-lg border", getStatusColor(currentAnalysis.status))}>
              <div className="flex items-center space-x-2 mb-2">
                {getStatusIcon(currentAnalysis.status)}
                <span className="font-medium capitalize">{currentAnalysis.status}</span>
              </div>
              <div className="text-sm">
                Progress: {currentAnalysis.progress}%
                <div className="w-full bg-white/50 rounded-full h-2 mt-1">
                  <div 
                    className="bg-current rounded-full h-2 transition-all duration-300"
                    style={{ width: `${currentAnalysis.progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Created</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {new Date(currentAnalysis.createdAt).toLocaleDateString()}
                <br />
                {new Date(currentAnalysis.createdAt).toLocaleTimeString()}
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Duration</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDuration(currentAnalysis.createdAt, currentAnalysis.completedAt)}
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Type</span>
              </div>
              <div className="text-sm text-muted-foreground capitalize">
                {currentAnalysis.type.replace('-', ' ')}
              </div>
            </div>
          </div>

          {/* Parameters */}
          {currentAnalysis.parameters && (
            <div className="space-y-3">
              <h3 className="font-medium">Analysis Parameters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentAnalysis.parameters.sourceProgram && (
                  <div className="p-3 border rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Source Program</label>
                    <p className="text-sm mt-1">{currentAnalysis.parameters.sourceProgram}</p>
                  </div>
                )}
                {currentAnalysis.parameters.targetProgram && (
                  <div className="p-3 border rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Target Program</label>
                    <p className="text-sm mt-1">{currentAnalysis.parameters.targetProgram}</p>
                  </div>
                )}
                {currentAnalysis.parameters.standards && (
                  <div className="p-3 border rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Standards</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {currentAnalysis.parameters.standards.map((standard) => (
                        <span key={standard} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                          {standard}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {currentAnalysis.results && (
            <div className="space-y-6">
              <h3 className="font-medium">Results</h3>
              
              {/* Overall Score */}
              {currentAnalysis.results.overallScore && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-4">Overall Assessment</h4>
                  <ScoreIndicator 
                    score={currentAnalysis.results.overallScore} 
                    label="Overall Score"
                  />
                </div>
              )}

              {/* Similarities */}
              {currentAnalysis.results.similarities && currentAnalysis.results.similarities.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                    Similarities ({currentAnalysis.results.similarities.length})
                  </h4>
                  <div className="space-y-2">
                    {currentAnalysis.results.similarities.map((similarity: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <div>
                          <span className="font-medium">{similarity.category}</span>
                          {similarity.details && (
                            <p className="text-sm text-muted-foreground">{similarity.details}</p>
                          )}
                        </div>
                        {similarity.score && (
                          <span className="text-sm font-medium text-green-600">{similarity.score}%</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Differences */}
              {currentAnalysis.results.differences && currentAnalysis.results.differences.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center">
                    <TrendingDown className="h-4 w-4 mr-2 text-orange-500" />
                    Differences ({currentAnalysis.results.differences.length})
                  </h4>
                  <div className="space-y-2">
                    {currentAnalysis.results.differences.map((difference: any, index: number) => (
                      <div key={index} className="p-2 bg-orange-50 rounded">
                        <span className="font-medium">{difference.category}</span>
                        <p className="text-sm text-muted-foreground">{difference.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gaps */}
              {currentAnalysis.results.gaps && currentAnalysis.results.gaps.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                    Gaps Identified ({currentAnalysis.results.gaps.length})
                  </h4>
                  <div className="space-y-2">
                    {currentAnalysis.results.gaps.map((gap: any, index: number) => (
                      <div key={index} className="p-2 bg-red-50 rounded">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{gap.area}</span>
                          <span className={cn(
                            "px-2 py-1 text-xs rounded",
                            gap.severity === 'high' && "bg-red-200 text-red-800",
                            gap.severity === 'medium' && "bg-orange-200 text-orange-800",
                            gap.severity === 'low' && "bg-yellow-200 text-yellow-800"
                          )}>
                            {gap.severity}
                          </span>
                        </div>
                        {gap.recommendation && (
                          <p className="text-sm text-muted-foreground mt-1">{gap.recommendation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {currentAnalysis.results.recommendations && currentAnalysis.results.recommendations.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Target className="h-4 w-4 mr-2 text-blue-500" />
                    Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {currentAnalysis.results.recommendations.map((recommendation: string, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        <Minus className="h-3 w-3 mt-1 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {currentAnalysis.error && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="font-medium text-red-800">Analysis Failed</span>
              </div>
              <p className="text-sm text-red-700">{currentAnalysis.error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t">
          <div className="text-xs text-muted-foreground">
            Analysis ID: {currentAnalysis.id}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Report
            </Button>
            <Button onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}