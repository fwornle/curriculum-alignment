import React, { useState, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '../../store'
import { closeModal } from '../../store/slices/uiSlice'
import { uploadProgramDocument } from '../../store/slices/curriculumSlice'
import { Button } from '../ui/button'
import { 
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  File
} from 'lucide-react'
import { cn } from '../../lib/utils'

export const UploadDocumentModal: React.FC = () => {
  const dispatch = useAppDispatch()
  const { modals } = useAppSelector(state => state.ui)
  const { uploadedDocuments, currentProgram } = useAppSelector(state => state.curriculum)
  
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!modals.uploadDocument) return null

  const handleClose = () => {
    dispatch(closeModal('uploadDocument'))
    setSelectedFiles([])
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files)
      setSelectedFiles(prev => [...prev, ...files])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setSelectedFiles(prev => [...prev, ...files])
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  const handleUpload = async () => {
    if (!currentProgram?.id) {
      console.error('No current program selected for upload')
      return
    }

    for (const file of selectedFiles) {
      try {
        const fileId = `${file.name}-${file.size}`
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))

        await dispatch(uploadProgramDocument({ 
          programId: currentProgram.id,
          file, 
          metadata: { documentType: file.type, title: file.name },
          onProgress: (progress) => {
            setUploadProgress(prev => ({ ...prev, [fileId]: progress }))
          }
        })).unwrap()
        
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }))
      } catch (error) {
        console.error('Upload failed:', error)
        const fileId = `${file.name}-${file.size}`
        setUploadProgress(prev => ({ ...prev, [fileId]: -1 })) // -1 indicates error
      }
    }
    handleClose()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />
      case 'doc':
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-500" />
      case 'xls':
      case 'xlsx':
        return <FileText className="h-5 w-5 text-green-500" />
      default:
        return <File className="h-5 w-5 text-gray-500" />
    }
  }

  const supportedFormats = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative w-full max-w-2xl mx-4 bg-background rounded-lg shadow-lg border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Upload Curriculum Documents</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Upload Area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragActive 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-primary/50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                Drop files here or{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary hover:underline"
                >
                  browse
                </button>
              </p>
              <p className="text-sm text-muted-foreground">
                Supported formats: {supportedFormats.join(', ')}
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum file size: 50MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={supportedFormats.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Selected Files ({selectedFiles.length})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => {
                  const fileId = `${file.name}-${file.size}`
                  const progress = uploadProgress[fileId]
                  
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file.name)}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                          {progress !== undefined && (
                            <div className="mt-1">
                              {progress === -1 ? (
                                <div className="flex items-center space-x-1 text-red-500">
                                  <AlertCircle className="h-3 w-3" />
                                  <span className="text-xs">Upload failed</span>
                                </div>
                              ) : progress === 100 ? (
                                <div className="flex items-center space-x-1 text-green-500">
                                  <CheckCircle className="h-3 w-3" />
                                  <span className="text-xs">Upload complete</span>
                                </div>
                              ) : progress > 0 ? (
                                <div className="flex items-center space-x-2">
                                  <div className="flex-1 bg-muted rounded-full h-2">
                                    <div 
                                      className="bg-primary h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span className="text-xs text-muted-foreground">Uploading...</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                        disabled={progress !== undefined && progress >= 0}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent Uploads */}
          {uploadedDocuments.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Recent Uploads</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {uploadedDocuments.slice(0, 3).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex items-center space-x-2">
                      {getFileIcon(doc.name)}
                      <span className="text-sm">{doc.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {doc.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {doc.status === 'processing' && (
                        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                      )}
                      {doc.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-xs text-muted-foreground capitalize">
                        {doc.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Processing Information</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Documents will be automatically processed to extract curriculum data</li>
              <li>• Processing typically takes 30-60 seconds per document</li>
              <li>• Extracted data will be available for analysis once processing completes</li>
              <li>• Supported content: course descriptions, program requirements, syllabi</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t">
          <p className="text-xs text-muted-foreground">
            Files are processed securely and not shared with third parties
          </p>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || !currentProgram?.id}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload {selectedFiles.length > 0 ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}` : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}