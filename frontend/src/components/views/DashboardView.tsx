import React from 'react'
import { useAppSelector, useAppDispatch } from '../../store'
import { setCurrentView } from '../../store/slices/uiSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { 
  BarChart3, 
  FileText, 
  TrendingUp, 
  CheckCircle,
  AlertTriangle,
  Activity,
  Search,
  Plus,
  ArrowRight,
  GraduationCap,
  BookOpen,
  Zap,
  Users,
  Globe,
  Shield,
  Sparkles
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
  const activeAnalyses = analyses.filter(a => a.status === 'in-progress').length
  const totalPrograms = programs.length
  const totalReports = reports.length

  const recentAnalyses = [...analyses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const quickActions = [
    {
      title: 'Smart Compare',
      description: 'AI-powered curriculum comparison',
      icon: Search,
      gradient: 'from-blue-500 to-cyan-500',
      action: () => dispatch(setCurrentView('analysis'))
    },
    {
      title: 'Upload & Analyze',
      description: 'Intelligent document processing',
      icon: Plus,
      gradient: 'from-green-500 to-emerald-500',
      action: () => dispatch(setCurrentView('programs'))
    },
    {
      title: 'Generate Reports',
      description: 'Professional analysis reports',
      icon: FileText,
      gradient: 'from-purple-500 to-pink-500',
      action: () => dispatch(setCurrentView('reports'))
    },
    {
      title: 'Compliance Check',
      description: 'Automated standards verification',
      icon: Shield,
      gradient: 'from-orange-500 to-red-500',
      action: () => dispatch(setCurrentView('analysis'))
    }
  ]

  const metrics = [
    {
      title: 'Total Analyses',
      value: totalAnalyses,
      change: '+12%',
      trend: 'up',
      icon: BarChart3,
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-gradient-to-br from-blue-50 to-cyan-50'
    },
    {
      title: 'Active Projects',
      value: activeAnalyses,
      change: '+8%',
      trend: 'up',
      icon: Activity,
      gradient: 'from-green-500 to-green-600',
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50'
    },
    {
      title: 'Programs',
      value: totalPrograms,
      change: '+5%',
      trend: 'up',
      icon: GraduationCap,
      gradient: 'from-purple-500 to-purple-600',
      bg: 'bg-gradient-to-br from-purple-50 to-pink-50'
    },
    {
      title: 'Reports',
      value: totalReports,
      change: '+15%',
      trend: 'up',
      icon: FileText,
      gradient: 'from-orange-500 to-orange-600',
      bg: 'bg-gradient-to-br from-orange-50 to-red-50'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h1 className="text-4xl font-bold">
                  Welcome back, {user?.name || 'User'}
                </h1>
              </div>
              <p className="text-blue-100 text-xl mb-6">
                Central European University - AI-Powered Curriculum Alignment
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 bg-white/10 rounded-full px-5 py-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-white font-medium">System Online</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 rounded-full px-5 py-3">
                  <Users className="h-5 w-5" />
                  <span className="text-white font-medium">23 Active Users</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 rounded-full px-5 py-3">
                  <Globe className="h-5 w-5" />
                  <span className="text-white font-medium">Last updated: 9/23/2025</span>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="text-right">
                <p className="text-blue-100 text-sm">Last updated</p>
                <p className="text-white font-semibold">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    {metric.title}
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    {metric.value}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-semibold text-green-600">
                      {metric.change}
                    </span>
                    <span className="text-xs text-gray-500">vs last month</span>
                  </div>
                </div>
                <div className={cn(
                  "p-4 rounded-xl bg-gradient-to-br shadow-sm",
                  metric.gradient,
                  "text-white"
                )}>
                  <metric.icon className="h-7 w-7" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl text-white shadow-sm">
                  <Zap className="h-6 w-6" />
                </div>
                Quick Actions
              </h2>
              <p className="text-gray-600 text-lg">
                Accelerate your curriculum analysis workflow with AI
              </p>
            </div>
            <button className="bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
              <Globe className="h-4 w-4" />
              View All Tools
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:shadow-lg hover:border-blue-300 transition-all group"
              >
                <div className="flex flex-col gap-4">
                  <div className={cn(
                    "p-4 rounded-xl bg-gradient-to-br text-white shadow-sm w-fit",
                    action.gradient
                  )}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-2">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {action.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enhanced Recent Analyses */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80 h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl text-white">
                      <Activity className="h-5 w-5" />
                    </div>
                    Recent Analyses
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Your latest curriculum analysis projects
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentAnalyses.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">No analyses yet</h3>
                    <p className="text-slate-600 dark:text-slate-400">Start by uploading a curriculum document</p>
                  </div>
                ) : (
                  recentAnalyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-slate-50 dark:from-slate-700 dark:to-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-600/50 hover:shadow-md transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-3 h-3 rounded-full shadow-sm",
                          analysis.status === 'completed' && "bg-gradient-to-r from-green-400 to-emerald-500",
                          analysis.status === 'in-progress' && "bg-gradient-to-r from-blue-400 to-cyan-500 animate-pulse",
                          analysis.status === 'failed' && "bg-gradient-to-r from-red-400 to-pink-500"
                        )} />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{analysis.id}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {analysis.type.replace('-', ' ')} • {new Date(analysis.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {analysis.status === 'completed' && (
                          <div className="p-1 bg-green-100 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                        )}
                        {analysis.status === 'failed' && (
                          <div className="p-1 bg-red-100 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          </div>
                        )}
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          View
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Enhanced System Status */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white">
                  <Activity className="h-5 w-5" />
                </div>
                System Health
              </CardTitle>
              <CardDescription>
                Real-time system performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {[
                  { name: 'API Services', status: 'Operational', color: 'green' },
                  { name: 'AI Models', status: 'Available', color: 'green' },
                  { name: 'Database', status: 'Connected', color: 'green' },
                  { name: 'File Storage', status: '85% Used', color: 'yellow' }
                ].map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-white dark:from-slate-700 dark:to-slate-600 rounded-lg">
                    <span className="font-medium text-slate-900 dark:text-white">{service.name}</span>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        service.color === 'green' && "bg-green-500 shadow-green-500/50 shadow-lg",
                        service.color === 'yellow' && "bg-yellow-500 shadow-yellow-500/50 shadow-lg"
                      )} />
                      <span className={cn(
                        "text-sm font-medium",
                        service.color === 'green' && "text-green-600",
                        service.color === 'yellow' && "text-yellow-600"
                      )}>
                        {service.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">1.2s</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Avg Response</p>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">99.9%</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Uptime</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Analytics Chart */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl text-white">
                <TrendingUp className="h-5 w-5" />
              </div>
              Usage Analytics
            </CardTitle>
            <CardDescription className="text-base">
              Analysis activity and performance trends over the past 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Interactive Analytics</h3>
                <p className="text-slate-600 dark:text-slate-400">Advanced charting components will be integrated here</p>
                <div className="flex justify-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-75" />
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse delay-150" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}