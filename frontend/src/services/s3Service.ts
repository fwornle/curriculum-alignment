import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

// AWS Configuration
const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'eu-central-1'
const S3_BUCKET_NAME = import.meta.env.VITE_S3_DOCUMENTS_BUCKET_NAME

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

class S3Service {
  private static readonly STORAGE_KEY = 'curriculum_alignment_profile_pictures'

  /**
   * Get profile pictures storage from localStorage
   */
  private getProfilePicturesStorage(): Record<string, string> {
    try {
      const stored = localStorage.getItem(S3Service.STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.warn('Failed to read profile pictures storage:', error)
      return {}
    }
  }

  /**
   * Save profile pictures storage to localStorage
   */
  private saveProfilePicturesStorage(storage: Record<string, string>): void {
    try {
      localStorage.setItem(S3Service.STORAGE_KEY, JSON.stringify(storage))
    } catch (error) {
      console.warn('Failed to save profile pictures storage:', error)
    }
  }

  /**
   * Generate a unique file key for profile pictures
   */
  private generateProfilePictureKey(userId: string, fileName: string): string {
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    return `profile-pictures/${userId}/${timestamp}-${sanitizedFileName}`
  }

  /**
   * Validate file before upload
   */
  private validateProfilePicture(file: File): string | null {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)'
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      return 'File size must be less than 5MB'
    }

    return null
  }

  /**
   * Upload profile picture (stores in localStorage for cloud-like persistence)
   */
  async uploadProfilePicture(file: File, userId: string): Promise<UploadResult> {
    try {
      // Validate file
      const validationError = this.validateProfilePicture(file)
      if (validationError) {
        return { success: false, error: validationError }
      }

      // Convert file to data URL
      const dataUrl = await S3Service.fileToDataUrl(file)

      // Generate unique key for this user
      const key = this.generateProfilePictureKey(userId, file.name)

      // Store in localStorage with cloud-like structure
      const storage = this.getProfilePicturesStorage()
      
      // Remove old profile picture for this user
      Object.keys(storage).forEach(existingKey => {
        if (existingKey.startsWith(`profile-pictures/${userId}/`)) {
          delete storage[existingKey]
        }
      })

      // Store new profile picture
      storage[key] = dataUrl
      this.saveProfilePicturesStorage(storage)

      // Return a cloud-like URL
      const url = `cloud-storage://profile-pictures/${userId}/${Date.now()}-${file.name}`

      return { success: true, url }
    } catch (error) {
      console.error('Profile picture upload failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }

  /**
   * Get profile picture data URL from cloud storage
   */
  getProfilePictureDataUrl(url: string, userId: string): string | null {
    try {
      const storage = this.getProfilePicturesStorage()
      
      // Find the data URL for this user
      const userKeys = Object.keys(storage).filter(key => 
        key.startsWith(`profile-pictures/${userId}/`)
      )
      
      if (userKeys.length > 0) {
        // Return the most recent one (they should be unique per user)
        return storage[userKeys[userKeys.length - 1]]
      }
      
      return null
    } catch (error) {
      console.warn('Failed to get profile picture data URL:', error)
      return null
    }
  }

  /**
   * Delete profile picture from cloud storage
   */
  async deleteProfilePicture(url: string): Promise<boolean> {
    try {
      if (!url.startsWith('cloud-storage://profile-pictures/')) {
        console.warn('Invalid profile picture URL for deletion:', url)
        return false
      }

      // Extract userId from URL
      const urlParts = url.replace('cloud-storage://', '').split('/')
      if (urlParts.length < 3) {
        console.warn('Invalid profile picture URL structure:', url)
        return false
      }

      const userId = urlParts[1]
      
      // Delete from localStorage
      const storage = this.getProfilePicturesStorage()
      
      // Remove all profile pictures for this user
      Object.keys(storage).forEach(key => {
        if (key.startsWith(`profile-pictures/${userId}/`)) {
          delete storage[key]
        }
      })
      
      this.saveProfilePicturesStorage(storage)
      return true
    } catch (error) {
      console.error('Profile picture deletion failed:', error)
      return false
    }
  }

  /**
   * Convert File to data URL for preview
   */
  static fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}

// Export singleton instance
export const s3Service = new S3Service()