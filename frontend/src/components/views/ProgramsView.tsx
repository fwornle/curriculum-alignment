import React, { useState, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../../store'
import { openModal } from '../../store/slices/uiSlice'
import { fetchPrograms, setCurrentProgram } from '../../store/slices/curriculumSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { FileUpload } from '../upload/FileUpload'
import { 
  GraduationCap,
  Plus,
  Search,
  Download,
  Upload,
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit,
  MoreVertical,
  Building,
  Calendar,
  Award
} from 'lucide-react'
import { cn } from "@/lib/utils.js"

export const ProgramsView: React.FC = () => {
  const dispatch = useAppDispatch()
  const { programs, uploadedDocuments, isLoading, error } = useAppSelector(state => state.curriculum)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterUniversity, setFilterUniversity] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Fetch programs on component mount
  useEffect(() => {
    dispatch(fetchPrograms())
  }, [dispatch])

  const filteredPrograms = programs.filter(program => {
    const matchesSearch = program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         program.degree.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         program.department.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesUniversity = !filterUniversity || program.university === filterUniversity
    return matchesSearch && matchesUniversity
  })

  const universities = [...new Set(programs.map(p => p.university))]
  const totalCourses = programs.reduce((sum, p) => sum + p.courses.length, 0)

  const handleCreateProgram = () => {
    dispatch(openModal('createProgram'))
  }

  const handleUploadDocument = () => {
    dispatch(openModal('uploadDocument'))
  }

  const handleViewProgram = (program: typeof programs[0]) => {
    dispatch(setCurrentProgram(program))
    // Navigate to program detail view (future implementation)
    console.log('Viewing program:', program.name)
  }

  const handleEditProgram = (program: typeof programs[0]) => {
    dispatch(setCurrentProgram(program))
    dispatch(openModal('editProgram'))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold academic-header">
            Curriculum Programs
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and analyze curriculum programs across institutions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleUploadDocument} disabled={isLoading}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Documents
          </Button>
          <Button onClick={handleCreateProgram} disabled={isLoading}>
            <Plus className="h-4 w-4 mr-2" />
            Add Program
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="academic-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Programs</p>
                <p className="text-2xl font-bold">{programs.length}</p>
                <p className="text-xs text-blue-600 mt-1">
                  Across {universities.length} institutions
                </p>
              </div>
              <GraduationCap className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="academic-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                <p className="text-2xl font-bold">{totalCourses}</p>
                <p className="text-xs text-green-600 mt-1">
                  Combined curriculum
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="academic-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Documents</p>
                <p className="text-2xl font-bold">{uploadedDocuments.length}</p>
                <p className="text-xs text-purple-600 mt-1">
                  {uploadedDocuments.filter(d => d.status === 'completed').length} processed
                </p>
              </div>
              <Upload className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="academic-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Universities</p>
                <p className="text-2xl font-bold">{universities.length}</p>
                <p className="text-xs text-orange-600 mt-1">
                  Active institutions
                </p>
              </div>
              <Building className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="academic-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search programs, degrees, or departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterUniversity}
              onChange={(e) => setFilterUniversity(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm bg-background"
            >
              <option value="">All Universities</option>
              {universities.map(uni => (
                <option key={uni} value={uni}>{uni}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                Grid
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="programs" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="space-y-4">
          {/* Programs Grid/List */}
          {filteredPrograms.length === 0 ? (
            <Card className="academic-card">
              <CardContent className="p-12 text-center">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Programs Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'No programs match your search criteria.' : 'Start by adding your first curriculum program.'}
                </p>
                <Button onClick={handleCreateProgram}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Program
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            )}>
              {filteredPrograms.map((program) => (
                <Card key={program.id} className="academic-card hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{program.name}</CardTitle>
                        <CardDescription>{program.degree}</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2">
                      <Badge variant="outline">{program.university}</Badge>
                      <Badge variant="secondary">{program.department}</Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        <span>{program.totalCredits} credits</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{program.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span>{program.courses.length} courses</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>v{program.version}</span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {program.description}
                    </p>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleViewProgram(program)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleEditProgram(program)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card className="academic-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Uploaded Documents
              </CardTitle>
              <CardDescription>
                Manage curriculum documents and their processing status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadedDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {uploadedDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          doc.status === 'completed' && "bg-green-500",
                          doc.status === 'processing' && "bg-blue-500",
                          doc.status === 'uploading' && "bg-yellow-500",
                          doc.status === 'error' && "bg-red-500"
                        )} />
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.type} • {doc.status}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {doc.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <Button variant="ghost" size="sm">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card className="academic-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Curriculum Documents
              </CardTitle>
              <CardDescription>
                Upload curriculum documents for processing and analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                acceptedFormats={['.pdf', '.doc', '.docx', '.txt', '.xlsx']}
                maxFileSize={10}
                multiple={true}
              />
              
              <Alert className="mt-6 border-blue-200 bg-blue-50">
                <Upload className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Supported Formats:</strong> PDF, Word documents, Excel spreadsheets, and text files.
                  Documents will be automatically processed for curriculum extraction.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}