import React from 'react'
import { useAppSelector, useAppDispatch } from '../../store'
import { setCurrentView } from '../../store/slices/uiSlice'
import { 
  BarChart3, 
  FileText, 
  TrendingUp, 
  Activity,
  Search,
  Plus,
  ArrowRight,
  GraduationCap,
  Globe,
  Shield,
  Sparkles
} from 'lucide-react'
import { cn } from "@/lib/utils"

export const DashboardView: React.FC = () => {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector(state => state.auth)
  const { analyses } = useAppSelector(state => state.analysis)
  const { reports } = useAppSelector(state => state.report)
  const { programs } = useAppSelector(state => state.curriculum)

  // Dynamic version based on environment
  const getVersion = () => {
    const isDev = import.meta.env.DEV
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    
    if (isDev || isLocalhost) {
      return 'Version 1.1.0-dev'
    } else {
      return 'Version 1.1.0-prod'
    }
  }

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
      value: totalAnalyses || 0,
      change: totalAnalyses > 0 ? '+12%' : 'N/A',
      trend: totalAnalyses > 0 ? 'up' : 'neutral',
      icon: BarChart3,
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-gradient-to-br from-blue-50 to-cyan-50'
    },
    {
      title: 'Active Projects',
      value: activeAnalyses || 0,
      change: activeAnalyses > 0 ? '+8%' : 'N/A',
      trend: activeAnalyses > 0 ? 'up' : 'neutral',
      icon: Activity,
      gradient: 'from-green-500 to-green-600',
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50'
    },
    {
      title: 'Programs',
      value: totalPrograms || 0,
      change: totalPrograms > 0 ? '+5%' : 'N/A',
      trend: totalPrograms > 0 ? 'up' : 'neutral',
      icon: GraduationCap,
      gradient: 'from-purple-500 to-purple-600',
      bg: 'bg-gradient-to-br from-purple-50 to-pink-50'
    },
    {
      title: 'Reports',
      value: totalReports || 0,
      change: totalReports > 0 ? '+15%' : 'N/A',
      trend: totalReports > 0 ? 'up' : 'neutral',
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
              <p className="text-blue-100 text-lg">
                Ready to analyze and align your curriculum with intelligent automation.
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 bg-white/10 rounded-full px-5 py-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white font-medium">System Online</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 rounded-full px-5 py-3">
                  <Globe className="h-5 w-5" />
                  <span className="text-white font-medium">{getVersion()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div className={cn("p-3 rounded-xl", metric.bg)}>
                  <metric.icon className="h-6 w-6 text-gray-700" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                  <div className={cn(
                    "text-sm font-medium flex items-center gap-1",
                    metric.trend === 'up' ? 'text-green-600' : 'text-gray-500'
                  )}>
                    {metric.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                    {metric.change}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-gray-900">{metric.title}</h3>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={cn("h-2 rounded-full bg-gradient-to-r", metric.gradient)}
                    style={{ width: `${Math.min((metric.value / 10) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="group bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-200 text-left"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={cn(
                    "p-3 rounded-xl bg-gradient-to-r group-hover:scale-110 transition-transform",
                    action.gradient
                  )}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {action.title}
                </h3>
                <p className="text-gray-600 text-sm mt-2">{action.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Recent Analyses</h2>
                <button 
                  onClick={() => dispatch(setCurrentView('analysis'))}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  View all
                </button>
              </div>
              
              {recentAnalyses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <BarChart3 className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No analyses yet</h3>
                  <p className="text-gray-600 mb-6">Get started by uploading curriculum documents</p>
                  <button 
                    onClick={() => dispatch(setCurrentView('programs'))}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Upload Documents
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentAnalyses.map((analysis) => (
                    <div key={analysis.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          analysis.status === 'completed' ? 'bg-green-100 text-green-600' : 
                          analysis.status === 'in-progress' ? 'bg-blue-100 text-blue-600' : 
                          'bg-gray-100 text-gray-600'
                        )}>
                          <BarChart3 className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{analysis.title}</h4>
                          <p className="text-sm text-gray-600">{analysis.status}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">
                          {new Date(analysis.createdAt).toLocaleDateString()}
                        </span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* System Status */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">System Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Multi-Agent System</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600 font-medium">Online</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Document Processing</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600 font-medium">Ready</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">AI Analysis Engine</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600 font-medium">Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Report Generation</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600 font-medium">Available</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Need Help?</h3>
              <p className="text-gray-600 text-sm mb-4">
                Our AI assistant is ready to guide you through curriculum analysis and alignment.
              </p>
              <button 
                onClick={() => dispatch(setCurrentView('chat'))}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Start Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}