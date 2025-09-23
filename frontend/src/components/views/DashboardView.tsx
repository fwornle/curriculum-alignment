import React from 'react'
import { useAppSelector, useAppDispatch } from '../../store'
import { setCurrentView } from '../../store/slices/uiSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { 
  BarChart3, 
  FileText, 
 
  TrendingUp, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Activity,
  Search,
  Plus,
  ArrowRight,
  GraduationCap,
  BookOpen,
  Award,
  Target
} from 'lucide-react'
import { cn } from '../../lib/utils'

export const DashboardView: React.FC = () => {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector(state => state.auth)
  const { analyses } = useAppSelector(state => state.analysis)
  const { reports } = useAppSelector(state => state.report)
  const { programs } = useAppSelector(state => state.curriculum)

  // Calculate statistics
  const totalAnalyses = analyses.length
  const completedAnalyses = analyses.filter(a => a.status === 'completed').length
  const activeAnalyses = analyses.filter(a => a.status === 'in-progress').length
  const totalPrograms = programs.length
  const totalReports = reports.length

  const recentAnalyses = analyses
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const quickActions = [
    {
      title: 'Compare Programs',
      description: 'Compare curriculum programs across universities',
      icon: Search,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      action: () => dispatch(setCurrentView('analysis'))
    },
    {
      title: 'Upload Curriculum',
      description: 'Upload and analyze curriculum documents',
      icon: Plus,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      action: () => dispatch(setCurrentView('programs'))
    },
    {
      title: 'Generate Report',
      description: 'Create comprehensive analysis reports',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      action: () => dispatch(setCurrentView('reports'))
    },
    {
      title: 'Check Compliance',
      description: 'Verify accreditation standards compliance',
      icon: Award,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      action: () => dispatch(setCurrentView('analysis'))
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold academic-header">
            Welcome back, {user?.name || 'User'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Central European University - Curriculum Alignment System
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Clock className="h-4 w-4 mr-2" />
            Last updated: {new Date().toLocaleDateString()}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="academic-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Analyses</p>
                <p className="text-2xl font-bold">{totalAnalyses}</p>
                <p className="text-xs text-green-600 mt-1">
                  {completedAnalyses} completed
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="academic-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold">{activeAnalyses}</p>
                <p className="text-xs text-blue-600 mt-1">
                  In progress
                </p>
              </div>
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="academic-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Programs</p>
                <p className="text-2xl font-bold">{totalPrograms}</p>
                <p className="text-xs text-purple-600 mt-1">
                  Curriculum data
                </p>
              </div>
              <GraduationCap className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="academic-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reports Generated</p>
                <p className="text-2xl font-bold">{totalReports}</p>
                <p className="text-xs text-emerald-600 mt-1">
                  This month
                </p>
              </div>
              <FileText className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="academic-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Start your curriculum analysis workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 justify-start hover:scale-105 transition-transform"
                onClick={action.action}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className={cn(
                    "p-2 rounded-lg",
                    action.bgColor
                  )}>
                    <action.icon className={cn("h-4 w-4", action.color)} />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm">{action.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {action.description}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Analyses */}
        <Card className="academic-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Analyses
              </CardTitle>
              <CardDescription>
                Your latest curriculum analysis projects
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentAnalyses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No analyses yet</p>
                <p className="text-sm">Start by uploading a curriculum</p>
              </div>
            ) : (
              recentAnalyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      analysis.status === 'completed' && "bg-green-500",
                      analysis.status === 'in-progress' && "bg-blue-500",
                      analysis.status === 'failed' && "bg-red-500"
                    )} />
                    <div>
                      <p className="font-medium text-sm">{analysis.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {analysis.type} • {new Date(analysis.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {analysis.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {analysis.status === 'failed' && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="academic-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Current system health and performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">API Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-green-600">Operational</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">LLM Services</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-green-600">Available</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-green-600">Connected</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">File Storage</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span className="text-xs text-yellow-600">85% Used</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span>Average Response Time</span>
                <span className="font-medium">1.2s</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span>Active Users</span>
                <span className="font-medium">23</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart Placeholder */}
      <Card className="academic-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage Analytics
          </CardTitle>
          <CardDescription>
            Analysis activity over the past 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2" />
              <p>Analytics Chart</p>
              <p className="text-sm">Chart component would be integrated here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}