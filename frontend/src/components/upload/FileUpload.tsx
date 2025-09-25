import React, { useState, useRef, useCallback } from 'react'
import { useAppDispatch } from '../../store'
import { uploadProgramDocument } from '../../store/slices/curriculumSlice'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { Progress } from '../ui/progress'
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  File,
  FileImage,
  FileSpreadsheet
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface FileUploadProps {
  acceptedFormats?: string[]
  maxFileSize?: number // in MB
  multiple?: boolean
  className?: string
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  url?: string
}

export const FileUpload: React.FC<FileUploadProps> = ({
  acceptedFormats = ['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.xls'],
  maxFileSize = 10, // 10MB default
  multiple = true,
  className
}) => {
  const dispatch = useAppDispatch()
  
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />
    if (fileType.includes('image')) return <FileImage className="h-5 w-5 text-blue-500" />
    if (fileType.includes('sheet') || fileType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />
    if (fileType.includes('doc')) return <FileText className="h-5 w-5 text-blue-600" />
    return <File className="h-5 w-5 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const validateFile = (file: File): string | null => {
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`
    
    if (!acceptedFormats.some(format => fileExtension === format.toLowerCase())) {
      return `File type ${fileExtension} is not supported. Accepted formats: ${acceptedFormats.join(', ')}`
    }
    
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit`
    }
    
    return null
  }

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = []
    
    Array.from(fileList).forEach(file => {
      const error = validateFile(file)
      
      newFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        status: error ? 'error' : 'pending',
        progress: 0,
        error: error || undefined
      })
    })
    
    setFiles(prev => [...prev, ...newFiles])
    
    // Auto-upload valid files
    newFiles
      .filter(f => f.status === 'pending')
      .forEach(fileData => {
        uploadFile(fileData)
      })
  }, [])

  const uploadFile = async (fileData: UploadedFile) => {
    // Update status to uploading
    setFiles(prev => prev.map(f => 
      f.id === fileData.id ? { ...f, status: 'uploading' } : f
    ))
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setFiles(prev => prev.map(f => {
        if (f.id === fileData.id && f.progress < 90) {
          return { ...f, progress: f.progress + 10 }
        }
        return f
      }))
    }, 200)
    
    try {
      // Create a simulated File object for upload
      const file = new window.File([new Blob([''], { type: fileData.type })], fileData.name, { type: fileData.type })
      const result = await dispatch(uploadProgramDocument({
        programId: 'temp-program-id',
        file,
        metadata: { documentType: file.type, title: file.name }
      }))
      
      clearInterval(progressInterval)
      
      if (uploadProgramDocument.fulfilled.match(result)) {
        setFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'success', progress: 100, url: result.payload?.url } 
            : f
        ))
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      clearInterval(progressInterval)
      setFiles(prev => prev.map(f => 
        f.id === fileData.id 
          ? { ...f, status: 'error', error: 'Upload failed. Please try again.' } 
          : f
      ))
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
      e.dataTransfer.clearData()
    }
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const successfulFiles = files.filter(f => f.status === 'success')

  return (
    <div className={cn("w-full", className)}>
      <Card className="academic-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Curriculum Documents
          </CardTitle>
          <CardDescription>
            Upload curriculum files for analysis. Supported formats: {acceptedFormats.join(', ')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop Zone */}
          <div
            className={cn(
              "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isDragging 
                ? "border-primary-500 bg-primary-50" 
                : "border-gray-300 hover:border-gray-400",
              "cursor-pointer"
            )}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleButtonClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple={multiple}
              accept={acceptedFormats.join(',')}
              onChange={handleFileInputChange}
              className="hidden"
            />
            
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            
            <p className="text-lg font-medium mb-2">
              {isDragging ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse from your computer
            </p>
            
            <Button variant="outline">
              Select Files
            </Button>
            
            <p className="text-xs text-muted-foreground mt-4">
              Maximum file size: {maxFileSize}MB
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Uploaded Files</h3>
              <div className="space-y-2">
                {files.map(file => (
                  <div
                    key={file.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border bg-card",
                      file.status === 'error' && "border-red-200 bg-red-50",
                      file.status === 'success' && "border-green-200 bg-green-50"
                    )}
                  >
                    {getFileIcon(file.type)}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                      
                      {file.status === 'uploading' && (
                        <div className="mt-2">
                          <Progress value={file.progress} className="h-1" />
                        </div>
                      )}
                      
                      {file.error && (
                        <p className="text-xs text-red-600 mt-1">{file.error}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {file.status === 'pending' && (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      )}
                      
                      {file.status === 'uploading' && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          <span className="text-xs text-blue-600">{file.progress}%</span>
                        </div>
                      )}
                      
                      {file.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      
                      {file.status === 'error' && (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(file.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Message */}
          {successfulFiles.length > 0 && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {successfulFiles.length} file{successfulFiles.length > 1 ? 's' : ''} uploaded successfully
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}