import React, { useState, useRef, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../../store'
import { closeModal } from '../../store/slices/uiSlice'
import { updateUserPreferences, updateUserProfile } from '../../store/slices/authSlice'
import { Button } from '../ui/button'
import { Avatar } from '../ui/Avatar'
import { ProfilePicture } from '../ui/ProfilePicture'
import { ImageCropper } from '../ui/ImageCropper'
import { getActiveFaculties, getFacultyById } from '../../constants/faculties'
import { s3Service } from '../../services/s3Service'
import { 
  X,
  User,
  Mail,
  Shield,
  Upload,
  Camera,
  Trash2,
  Edit2,
  Save,
  AlertCircle,
  Building2,
  CheckCircle,
  LoaderIcon
} from 'lucide-react'

interface ProfilePictureUploadProps {
  currentPicture?: string
  onPictureChange: (pictureUrl: string | null) => Promise<void>
  isUploading: boolean
  userId: string
}

const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentPicture,
  onPictureChange,
  isUploading,
  userId
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)

  // Handle showing the cropper for a selected file
  const handleFileSelection = (file: File) => {
    console.log('🚀 ProfilePictureUpload: handleFileSelection called with file:', file)
    setUploadError(null)
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file.')
      return
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image file must be less than 10MB.')
      return
    }
    
    // Create URL for the image and show cropper
    const imageUrl = URL.createObjectURL(file)
    setSelectedImageUrl(imageUrl)
    setShowCropper(true)
  }

  // Handle the final upload after cropping
  const handleFileUpload = async (file: File) => {
    console.log('🚀 ProfilePictureUpload: handleFileUpload called with cropped file:', file)
    setUploadError(null)
    
    try {
      // Upload to S3 using the s3Service
      console.log('📤 ProfilePictureUpload: Starting S3 upload for user:', userId)
      const result = await s3Service.uploadProfilePicture(file, userId)
      
      console.log('✅ ProfilePictureUpload: S3 upload result:', result)
      
      if (result.success && result.url) {
        console.log('🔄 ProfilePictureUpload: Calling onPictureChange with URL:', result.url)
        // Update the profile with the S3 URL
        await onPictureChange(result.url)
        console.log('✨ ProfilePictureUpload: onPictureChange completed')
      } else {
        console.error('❌ ProfilePictureUpload: Upload failed:', result.error)
        setUploadError(result.error || 'Failed to upload image. Please try again.')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError('Failed to upload image. Please try again.')
    }
  }

  // Handle cropper actions
  const handleCropComplete = (croppedFile: File) => {
    setShowCropper(false)
    if (selectedImageUrl) {
      URL.revokeObjectURL(selectedImageUrl)
      setSelectedImageUrl(null)
    }
    handleFileUpload(croppedFile)
  }

  const handleCropCancel = () => {
    setShowCropper(false)
    if (selectedImageUrl) {
      URL.revokeObjectURL(selectedImageUrl)
      setSelectedImageUrl(null)
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    console.log('🎯 ProfilePictureUpload: handleDrop triggered', e.dataTransfer.files)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      console.log('📁 ProfilePictureUpload: File found in drop:', e.dataTransfer.files[0])
      handleFileSelection(e.dataTransfer.files[0])
    } else {
      console.log('❌ ProfilePictureUpload: No file found in drop')
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📁 ProfilePictureUpload: handleFileSelect triggered', e.target.files)
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0])
    }
  }, [])

  const handleRemovePicture = async () => {
    try {
      // If there's a current picture and it's a cloud storage URL, delete it
      if (currentPicture && currentPicture.startsWith('cloud-storage://')) {
        await s3Service.deleteProfilePicture(currentPicture)
      }
      
      await onPictureChange(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error removing picture:', error)
      setUploadError('Failed to remove picture. Please try again.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Current Picture Preview */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <ProfilePicture
            src={currentPicture}
            userId={userId}
            size="xl"
            className="shadow-lg border-2 border-gray-200"
            alt="Profile Picture"
          />
          {currentPicture && (
            <button
              onClick={handleRemovePicture}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              disabled={isUploading}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">Profile Picture</h4>
          <p className="text-sm text-gray-500">
            {currentPicture ? 'Update your profile picture' : 'Add a profile picture'}
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        <div className="text-center">
          {isUploading ? (
            <div className="flex flex-col items-center">
              <LoaderIcon className="h-8 w-8 text-blue-500 animate-spin mb-2" />
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Camera className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-1">
                Drag and drop an image, or <span className="text-blue-600 font-medium">click to browse</span>
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF, WebP up to 5MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{uploadError}</p>
        </div>
      )}

      {/* Upload Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex-1"
        >
          <Upload className="h-4 w-4 mr-2" />
          Choose File
        </Button>
        {currentPicture && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemovePicture}
            disabled={isUploading}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Image Cropper Modal */}
      {showCropper && selectedImageUrl && (
        <ImageCropper
          imageSrc={selectedImageUrl}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1} // Square crop for profile pictures
        />
      )}
    </div>
  )
}

export const EnhancedProfileModal: React.FC = () => {
  const dispatch = useAppDispatch()
  const { modals } = useAppSelector(state => state.ui)
  const { user } = useAppSelector(state => state.auth)
  const [isEditing, setIsEditing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [editForm, setEditForm] = useState({
    // Profile fields
    picture: user?.picture || '',
    faculty: user?.faculty || '',
    // Preferences
    theme: user?.preferences?.theme || 'system',
    language: user?.preferences?.language || 'en',
    notifications: user?.preferences?.notifications || true
  })

  const faculties = getActiveFaculties()
  const currentFaculty = user?.faculty ? getFacultyById(user.faculty) : undefined

  if (!modals.profile || !user) return null

  const handleClose = () => {
    dispatch(closeModal('profile'))
    setIsEditing(false)
    // Reset form
    setEditForm({
      picture: user?.picture || '',
      faculty: user?.faculty || '',
      theme: user?.preferences?.theme || 'system',
      language: user?.preferences?.language || 'en',
      notifications: user?.preferences?.notifications || true
    })
  }

  const handleSave = async () => {
    try {
      // Update profile data (picture, faculty)
      if (editForm.picture !== user.picture || editForm.faculty !== user.faculty) {
        dispatch(updateUserProfile({
          picture: editForm.picture || undefined,
          faculty: editForm.faculty || undefined
        }))
      }

      // Update preferences
      dispatch(updateUserPreferences({
        theme: editForm.theme,
        language: editForm.language,
        notifications: editForm.notifications
      }))

      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save profile:', error)
    }
  }

  const handleCancel = () => {
    setEditForm({
      picture: user?.picture || '',
      faculty: user?.faculty || '',
      theme: user?.preferences?.theme || 'system',
      language: user?.preferences?.language || 'en',
      notifications: user?.preferences?.notifications || true
    })
    setIsEditing(false)
  }

  const handlePictureChange = async (pictureUrl: string | null) => {
    console.log('🖼️ EnhancedProfileModal: handlePictureChange called with URL:', pictureUrl)
    setIsUploading(true)
    try {
      console.log('📝 EnhancedProfileModal: Updating editForm.picture from:', editForm.picture, 'to:', pictureUrl || '')
      setEditForm(prev => ({ ...prev, picture: pictureUrl || '' }))
      
      // IMMEDIATELY save the profile picture to Redux and localStorage for persistence
      console.log('💾 EnhancedProfileModal: Immediately saving picture to Redux for persistence')
      await dispatch(updateUserProfile({ picture: pictureUrl || '' }))
      console.log('✅ EnhancedProfileModal: Picture saved to Redux and localStorage')
    } finally {
      setIsUploading(false)
    }
  }

  const isFederatedPicture = user.picture && !user.picture.startsWith('data:')

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Profile Settings</h2>
              <p className="text-sm text-gray-500">Manage your account and preferences</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit Profile
                </Button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-6">
                {/* Profile Picture Upload */}
                <ProfilePictureUpload
                  currentPicture={editForm.picture}
                  onPictureChange={handlePictureChange}
                  isUploading={isUploading}
                  userId={user.id}
                />

                {/* Faculty Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Faculty Assignment
                  </label>
                  <select
                    value={editForm.faculty}
                    onChange={(e) => setEditForm(prev => ({ ...prev, faculty: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No faculty assigned</option>
                    {faculties.map(faculty => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </select>
                  {editForm.faculty && (
                    <p className="text-xs text-gray-500 mt-1">
                      {getFacultyById(editForm.faculty)?.description}
                    </p>
                  )}
                </div>

                {/* Preferences */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900">Preferences</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Theme
                    </label>
                    <select
                      value={editForm.theme}
                      onChange={(e) => setEditForm(prev => ({ ...prev, theme: e.target.value as 'light' | 'dark' | 'system' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="system">System</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Language
                    </label>
                    <select
                      value={editForm.language}
                      onChange={(e) => setEditForm(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="en">English</option>
                      <option value="hu">Hungarian</option>
                      <option value="de">German</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.notifications}
                        onChange={(e) => setEditForm(prev => ({ ...prev, notifications: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Enable Notifications</span>
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2"
                    disabled={isUploading}
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1"
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="space-y-4">
                {/* Current Profile Picture */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <ProfilePicture 
                    src={user.picture}
                    userId={user.id}
                    size="xl"
                    className="shadow-lg"
                    alt={user.name}
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                    {currentFaculty && (
                      <p className="text-sm text-blue-600 flex items-center gap-1 mt-1">
                        <Building2 className="h-3 w-3" />
                        {currentFaculty.shortName}
                      </p>
                    )}
                    {isFederatedPicture && (
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <CheckCircle className="h-3 w-3" />
                        Picture from sign-in provider
                      </p>
                    )}
                  </div>
                </div>

                {/* Cognito Info Notice */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-600">ℹ️ Name and email are managed by AWS Cognito and cannot be edited here.</p>
                </div>

                {/* Account Information */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-xs text-gray-500">Full Name (from Cognito)</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      <div className="text-xs text-gray-500">Email Address (from Cognito)</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 capitalize">{user.role}</div>
                      <div className="text-xs text-gray-500">Account Role</div>
                    </div>
                  </div>

                  {currentFaculty && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{currentFaculty.name}</div>
                        <div className="text-xs text-gray-500">Faculty Assignment</div>
                      </div>
                    </div>
                  )}

                  {user.emailVerified && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div className="text-sm text-green-700">Email Verified by Cognito</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Account Status */}
          {!isEditing && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Account Status</h4>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                Active Account
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}