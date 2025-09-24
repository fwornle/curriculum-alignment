import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../store'
import { closeModal } from '../../store/slices/uiSlice'
import { Button } from '../ui/button'
import { 
  X,
  Plus,
  BookOpen,
  Building,
  GraduationCap,
  Save,
  AlertTriangle
} from 'lucide-react'
import { cn } from '../../lib/utils'
import type { Program } from '../../store/slices/curriculumSlice'

export const CreateProgramModal: React.FC = () => {
  const dispatch = useAppDispatch()
  const { modals } = useAppSelector(state => state.ui)
  
  const [formData, setFormData] = useState({
    name: '',
    degree: '',
    university: '',
    department: '',
    description: '',
    totalCredits: '',
    duration: '',
    level: 'undergraduate' as 'undergraduate' | 'graduate'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!modals.createProgram) return null

  const handleClose = () => {
    dispatch(closeModal('createProgram'))
    setFormData({
      name: '',
      degree: '',
      university: '',
      department: '',
      description: '',
      totalCredits: '',
      duration: '',
      level: 'undergraduate'
    })
    setErrors({})
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) newErrors.name = 'Program name is required'
    if (!formData.degree.trim()) newErrors.degree = 'Degree type is required'
    if (!formData.university.trim()) newErrors.university = 'University is required'
    if (!formData.department.trim()) newErrors.department = 'Department is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.totalCredits.trim()) newErrors.totalCredits = 'Total credits is required'
    else if (isNaN(Number(formData.totalCredits)) || Number(formData.totalCredits) <= 0) {
      newErrors.totalCredits = 'Total credits must be a positive number'
    }
    if (!formData.duration.trim()) newErrors.duration = 'Duration is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) return

    const newProgram: Omit<Program, 'id' | 'courses' | 'requirements' | 'lastUpdated' | 'version'> = {
      name: formData.name,
      degree: formData.degree,
      university: formData.university,
      department: formData.department,
      description: formData.description,
      totalCredits: Number(formData.totalCredits),
      duration: formData.duration,
    }

    // In a real app, this would dispatch an action to create the program
    console.log('Creating program:', newProgram)
    
    // For demo purposes, just close the modal
    handleClose()
  }

  const degreeOptions = [
    'Bachelor of Science',
    'Bachelor of Arts',
    'Master of Science',
    'Master of Arts',
    'Master of Business Administration',
    'Doctor of Philosophy',
    'Bachelor of Engineering',
    'Master of Engineering'
  ]

  const durationOptions = [
    '1 year',
    '2 years', 
    '3 years',
    '4 years',
    '5 years',
    '6 years'
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative w-full max-w-2xl mx-4 bg-background rounded-lg shadow-lg border max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Create New Program</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Basic Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Program Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Computer Science"
                  className={cn(
                    "w-full px-3 py-2 border rounded-md text-sm",
                    errors.name ? "border-red-500" : "border-input"
                  )}
                />
                {errors.name && (
                  <p className="text-xs text-red-500 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Degree Type *</label>
                <select
                  value={formData.degree}
                  onChange={(e) => handleInputChange('degree', e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 border rounded-md text-sm",
                    errors.degree ? "border-red-500" : "border-input"
                  )}
                >
                  <option value="">Select degree type</option>
                  {degreeOptions.map((degree) => (
                    <option key={degree} value={degree}>
                      {degree}
                    </option>
                  ))}
                </select>
                {errors.degree && (
                  <p className="text-xs text-red-500 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {errors.degree}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Institution Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Institution Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">University *</label>
                <input
                  type="text"
                  value={formData.university}
                  onChange={(e) => handleInputChange('university', e.target.value)}
                  placeholder="e.g., Central European University"
                  className={cn(
                    "w-full px-3 py-2 border rounded-md text-sm",
                    errors.university ? "border-red-500" : "border-input"
                  )}
                />
                {errors.university && (
                  <p className="text-xs text-red-500 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {errors.university}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Department *</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="e.g., Department of Computer Science"
                  className={cn(
                    "w-full px-3 py-2 border rounded-md text-sm",
                    errors.department ? "border-red-500" : "border-input"
                  )}
                />
                {errors.department && (
                  <p className="text-xs text-red-500 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {errors.department}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Program Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Program Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Level</label>
                <select
                  value={formData.level}
                  onChange={(e) => handleInputChange('level', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm border-input"
                >
                  <option value="undergraduate">Undergraduate</option>
                  <option value="graduate">Graduate</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Total Credits *</label>
                <input
                  type="number"
                  value={formData.totalCredits}
                  onChange={(e) => handleInputChange('totalCredits', e.target.value)}
                  placeholder="120"
                  min="1"
                  className={cn(
                    "w-full px-3 py-2 border rounded-md text-sm",
                    errors.totalCredits ? "border-red-500" : "border-input"
                  )}
                />
                {errors.totalCredits && (
                  <p className="text-xs text-red-500 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {errors.totalCredits}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Duration *</label>
                <select
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 border rounded-md text-sm",
                    errors.duration ? "border-red-500" : "border-input"
                  )}
                >
                  <option value="">Select duration</option>
                  {durationOptions.map((duration) => (
                    <option key={duration} value={duration}>
                      {duration}
                    </option>
                  ))}
                </select>
                {errors.duration && (
                  <p className="text-xs text-red-500 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {errors.duration}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Provide a comprehensive description of the program..."
                rows={4}
                className={cn(
                  "w-full px-3 py-2 border rounded-md text-sm resize-none",
                  errors.description ? "border-red-500" : "border-input"
                )}
              />
              {errors.description && (
                <p className="text-xs text-red-500 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {errors.description}
                </p>
              )}
            </div>
          </div>

          {/* Next Steps Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Next Steps</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• After creation, you can add courses and define requirements</li>
              <li>• Use the upload feature to import existing curriculum documents</li>
              <li>• Set up course prerequisites and graduation requirements</li>
              <li>• Run analyses to compare with other programs or standards</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 p-6 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="h-4 w-4 mr-2" />
            Create Program
          </Button>
        </div>
      </div>
    </div>
  )
}