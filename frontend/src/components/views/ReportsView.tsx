import React, { useState } from 'react'
import { useAppSelector } from '../../store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  FileText,
  Search,
  Plus,
  Download,
  Eye,
  Edit,
  Share,
  Calendar,
  Clock,
  BarChart3,
  TrendingUp,
  CheckCircle,
  Settings,
  Printer,
  Mail,
  Grid,
  List
} from 'lucide-react'
import { cn } from "@/lib/utils.ts"

export const ReportsView: React.FC = () => {
  const { reports, templates } = useAppSelector(state => state.report)
  const { analyses } = useAppSelector(state => state.analysis)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !filterStatus || report.status === filterStatus
    const matchesType = !filterType || report.type === filterType
    return matchesSearch && matchesStatus && matchesType
  })

  const totalReports = reports.length
  const completedReports = reports.filter(r => r.status === 'completed').length
  const generatingReports = reports.filter(r => r.status === 'generating').length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'generating': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'failed': return 'text-red-600 bg-red-50 border-red-200'
      case 'draft': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'comparison': return <BarChart3 className="h-4 w-4" />
      case 'accreditation': return <CheckCircle className="h-4 w-4" />
      case 'gap-analysis': return <TrendingUp className="h-4 w-4" />
      case 'custom': return <Settings className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const reportTypeOptions = [
    { id: 'comparison', name: 'Curriculum Comparison', description: 'Side-by-side program comparison' },
    { id: 'accreditation', name: 'Accreditation Report', description: 'Standards compliance assessment' },
    { id: 'gap-analysis', name: 'Gap Analysis', description: 'Identify curriculum gaps' },
    { id: 'custom', name: 'Custom Report', description: 'Build your own template' }
  ]

  const handleCreateReport = () => {
    // Would open report creation modal
    console.log('Create new report')
  }

  const handleGenerateReport = (templateId: string) => {
    // Would trigger report generation
    console.log('Generate report from template:', templateId)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold academic-header">
            Analysis Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate and manage comprehensive curriculum analysis reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button onClick={handleCreateReport}>
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="academic-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold">{totalReports}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {completedReports} completed
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="academic-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Generating</p>
                <p className="text-2xl font-bold">{generatingReports}</p>
                <p className="text-xs text-orange-600 mt-1">
                  In progress
                </p>
              </div>
              <Settings className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="academic-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Templates</p>
                <p className="text-2xl font-bold">{templates.length}</p>
                <p className="text-xs text-purple-600 mt-1">
                  Available
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="academic-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">
                  {reports.filter(r => {
                    const reportDate = new Date(r.createdAt)
                    const now = new Date()
                    return reportDate.getMonth() === now.getMonth() && 
                           reportDate.getFullYear() === now.getFullYear()
                  }).length}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Generated
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Generating Report */}
      {generatingReports > 0 && (
        <Card className="academic-card border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600 animate-spin" />
              Report Generation in Progress
            </CardTitle>
            <CardDescription>
              {generatingReports} report{generatingReports > 1 ? 's' : ''} currently being generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reports.filter(r => r.status === 'generating').map((report) => (
              <div key={report.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{report.title}</span>
                  <span>{report.progress}%</span>
                </div>
                <Progress value={report.progress} className="h-2" />
              </div>
            ))}
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
                placeholder="Search reports..."
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
              <option value="draft">Draft</option>
              <option value="generating">Generating</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm bg-background"
            >
              <option value="">All Types</option>
              {reportTypeOptions.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="generate">Generate New</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          {/* Reports List */}
          {filteredReports.length === 0 ? (
            <Card className="academic-card">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'No reports match your search criteria.' : 'Start by generating your first report.'}
                </p>
                <Button onClick={handleCreateReport}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            )}>
              {filteredReports.map((report) => (
                <Card key={report.id} className="academic-card hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getTypeIcon(report.type)}
                          <CardTitle className="text-lg">{report.title}</CardTitle>
                        </div>
                        <CardDescription>
                          {report.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </CardDescription>
                      </div>
                      <Badge className={cn('text-xs', getStatusColor(report.status))}>
                        {report.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      {report.completedAt && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(report.completedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {report.status === 'generating' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{report.progress}%</span>
                        </div>
                        <Progress value={report.progress} className="h-2" />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      {report.status === 'completed' && (
                        <Button variant="outline" size="sm" className="flex-1">
                          <Download className="h-3 w-3 mr-1" />
                          Export
                        </Button>
                      )}
                      {report.status === 'draft' && (
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>

                    {report.status === 'completed' && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="flex-1">
                          <Share className="h-3 w-3 mr-1" />
                          Share
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1">
                          <Printer className="h-3 w-3 mr-1" />
                          Print
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1">
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card className="academic-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Report Templates
              </CardTitle>
              <CardDescription>
                Pre-configured templates for different report types
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">No templates available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="border">
                      <CardHeader>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 mb-4">
                          <p className="text-sm text-muted-foreground">
                            {template.sections.length} sections • {template.type}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {template.sections.slice(0, 3).map((section) => (
                              <Badge key={section.id} variant="outline" className="text-xs">
                                {section.title}
                              </Badge>
                            ))}
                            {template.sections.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.sections.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => handleGenerateReport(template.id)}
                        >
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportTypeOptions.map((type) => (
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
                  <Button className="w-full" onClick={() => handleGenerateReport(type.id)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="academic-card">
            <CardHeader>
              <CardTitle>Quick Generate from Analysis</CardTitle>
              <CardDescription>
                Create a report from existing analysis results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <select className="w-full px-3 py-2 border rounded-md text-sm bg-background">
                <option value="">Select completed analysis...</option>
                {analyses.filter(a => a.status === 'completed').map(analysis => (
                  <option key={analysis.id} value={analysis.id}>
                    {analysis.id} - {analysis.type}
                  </option>
                ))}
              </select>
              <Button className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Generate Report from Analysis
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}