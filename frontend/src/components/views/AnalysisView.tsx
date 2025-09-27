import React, { useState } from 'react'
import { useAppSelector, useAppDispatch } from '../../store'
import { openModal } from '../../store/slices/uiSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Alert, AlertDescription } from '../ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  BarChart3,
  Search,
  Plus,
  Play,
  Pause,
  Square,
  AlertTriangle,
  Zap,
  Settings,
  Download,
  Eye,
  RefreshCcw,
  TrendingUp,
  FileText,
  GitCompare,
  Shield,
  Target,
  Activity
} from 'lucide-react'
import { cn } from "@/lib/utils.ts"

export const AnalysisView: React.FC = () => {
  const dispatch = useAppDispatch()
  const { analyses, workflows, currentAnalysis } = useAppSelector(state => state.analysis)
  const { programs } = useAppSelector(state => state.curriculum)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')

  const filteredAnalyses = analyses.filter(analysis => {
    const matchesSearch = analysis.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         analysis.type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !filterStatus || analysis.status === filterStatus
    const matchesType = !filterType || analysis.type === filterType
    return matchesSearch && matchesStatus && matchesType
  })

  const totalAnalyses = analyses.length
  const completedAnalyses = analyses.filter(a => a.status === 'completed').length
  const runningAnalyses = analyses.filter(a => a.status === 'in-progress').length

  const runningWorkflows = workflows.filter(w => w.status === 'running')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'in-progress': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'failed': return 'text-red-600 bg-red-50 border-red-200'
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'curriculum-comparison': return <GitCompare className="h-4 w-4" />
      case 'accreditation-analysis': return <Shield className="h-4 w-4" />
      case 'gap-analysis': return <Target className="h-4 w-4" />
      case 'semantic-analysis': return <BarChart3 className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const analysisTypes = [
    { id: 'curriculum-comparison', name: 'Curriculum Comparison', description: 'Compare curricula across institutions' },
    { id: 'accreditation-analysis', name: 'Accreditation Analysis', description: 'Analyze compliance with standards' },
    { id: 'gap-analysis', name: 'Gap Analysis', description: 'Identify curriculum gaps and deficiencies' },
    { id: 'semantic-analysis', name: 'Semantic Analysis', description: 'AI-powered content analysis' }
  ]

  const handleCreateAnalysis = () => {
    dispatch(openModal('analysisDetails'))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold academic-header">
            Curriculum Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered curriculum analysis and comparison workflows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button onClick={handleCreateAnalysis}>
            <Plus className="h-4 w-4 mr-2" />
            New Analysis
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="academic-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Analyses</p>
                <p className="text-2xl font-bold">{totalAnalyses}</p>
                <p className="text-xs text-blue-600 mt-1">
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
                <p className="text-sm font-medium text-muted-foreground">Running</p>
                <p className="text-2xl font-bold">{runningAnalyses}</p>
                <p className="text-xs text-orange-600 mt-1">
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
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {totalAnalyses > 0 ? Math.round((completedAnalyses / totalAnalyses) * 100) : 0}%
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Quality score
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="academic-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Workflows</p>
                <p className="text-2xl font-bold">{workflows.length}</p>
                <p className="text-xs text-purple-600 mt-1">
                  {runningWorkflows.length} active
                </p>
              </div>
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Running Analysis */}
      {currentAnalysis && currentAnalysis.status === 'in-progress' && (
        <Card className="academic-card border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Analysis in Progress
            </CardTitle>
            <CardDescription>
              {currentAnalysis.type} • Started {new Date(currentAnalysis.createdAt).toLocaleTimeString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{currentAnalysis.progress}%</span>
              </div>
              <Progress value={currentAnalysis.progress} className="h-2" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Pause className="h-3 w-3 mr-1" />
                Pause
              </Button>
              <Button size="sm" variant="outline">
                <Square className="h-3 w-3 mr-1" />
                Stop
              </Button>
              <Button size="sm" variant="outline">
                <Eye className="h-3 w-3 mr-1" />
                Monitor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="academic-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search analyses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm bg-background"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm bg-background"
            >
              <option value="">All Types</option>
              {analysisTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="analyses" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analyses">Analyses</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
        </TabsList>

        <TabsContent value="analyses" className="space-y-4">
          {/* Analyses List */}
          {filteredAnalyses.length === 0 ? (
            <Card className="academic-card">
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Analyses Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'No analyses match your search criteria.' : 'Start by creating your first analysis.'}
                </p>
                <Button onClick={handleCreateAnalysis}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Analysis
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAnalyses.map((analysis) => (
                <Card key={analysis.id} className="academic-card hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getTypeIcon(analysis.type)}
                          <h3 className="font-semibold">{analysis.id}</h3>
                          <Badge className={cn('text-xs', getStatusColor(analysis.status))}>
                            {analysis.status}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {analysis.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Created:</span>
                            <p className="font-medium">{new Date(analysis.createdAt).toLocaleDateString()}</p>
                          </div>
                          {analysis.completedAt && (
                            <div>
                              <span className="text-muted-foreground">Completed:</span>
                              <p className="font-medium">{new Date(analysis.completedAt).toLocaleDateString()}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Progress:</span>
                            <p className="font-medium">{analysis.progress}%</p>
                          </div>
                          {analysis.results?.overallScore && (
                            <div>
                              <span className="text-muted-foreground">Score:</span>
                              <p className="font-medium">{analysis.results.overallScore}%</p>
                            </div>
                          )}
                        </div>

                        {analysis.status === 'in-progress' && (
                          <div className="mt-4">
                            <Progress value={analysis.progress} className="h-2" />
                          </div>
                        )}

                        {analysis.error && (
                          <Alert className="mt-4 border-red-200 bg-red-50">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                              {analysis.error}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {analysis.status === 'completed' && (
                          <Button size="sm" variant="outline">
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        {analysis.status === 'failed' && (
                          <Button size="sm" variant="outline">
                            <RefreshCcw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card className="academic-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Analysis Workflows
              </CardTitle>
              <CardDescription>
                Automated multi-step analysis processes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workflows.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">No workflows configured</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {workflows.map((workflow) => (
                    <div key={workflow.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium">{workflow.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {workflow.steps.length} steps • {workflow.status}
                          </p>
                        </div>
                        <Badge className={getStatusColor(workflow.status)}>
                          {workflow.status}
                        </Badge>
                      </div>
                      
                      {workflow.status === 'running' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{workflow.progress}%</span>
                          </div>
                          <Progress value={workflow.progress} className="h-1" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analysisTypes.map((type) => (
              <Card key={type.id} className="academic-card hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getTypeIcon(type.id)}
                    {type.name}
                  </CardTitle>
                  <CardDescription>
                    {type.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" onClick={handleCreateAnalysis}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Analysis
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="academic-card">
            <CardHeader>
              <CardTitle>Quick Setup</CardTitle>
              <CardDescription>
                Start a basic curriculum comparison
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select className="px-3 py-2 border rounded-md text-sm bg-background">
                  <option value="">Select Source Program</option>
                  {programs.map(program => (
                    <option key={program.id} value={program.id}>
                      {program.name} - {program.university}
                    </option>
                  ))}
                </select>
                <select className="px-3 py-2 border rounded-md text-sm bg-background">
                  <option value="">Select Target Program</option>
                  {programs.map(program => (
                    <option key={program.id} value={program.id}>
                      {program.name} - {program.university}
                    </option>
                  ))}
                </select>
              </div>
              <Button className="w-full">
                <GitCompare className="h-4 w-4 mr-2" />
                Compare Programs
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}