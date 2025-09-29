import React, { useMemo } from 'react'
import { Avatar } from './Avatar'
import { s3Service } from '../../services/s3Service'

interface ProfilePictureProps {
  src?: string
  userId?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  alt?: string
}

export const ProfilePicture: React.FC<ProfilePictureProps> = ({
  src,
  userId,
  size = 'md',
  className = '',
  alt = 'Profile picture'
}) => {
  const resolvedSrc = useMemo(() => {
    console.log('🖼️ ProfilePicture: Resolving src:', src, 'for userId:', userId)
    
    if (!src) {
      console.log('❌ ProfilePicture: No src provided')
      return undefined
    }

    // If it's already a data URL, use it directly
    if (src.startsWith('data:')) {
      console.log('📄 ProfilePicture: Using data URL directly')
      return src
    }

    // If it's a cloud storage URL, resolve it to data URL
    if (src.startsWith('cloud-storage://') && userId) {
      console.log('☁️ ProfilePicture: Resolving cloud storage URL:', src)
      const dataUrl = s3Service.getProfilePictureDataUrl(src, userId)
      console.log('🔄 ProfilePicture: Retrieved data URL:', dataUrl ? 'Found' : 'Not found')
      return dataUrl || undefined
    }

    // If it's a regular URL (e.g., from federated provider), use it directly
    console.log('🌐 ProfilePicture: Using regular URL directly:', src)
    return src
  }, [src, userId])

  // Convert size prop to pixel values for Avatar component
  const sizeInPixels = useMemo(() => {
    switch (size) {
      case 'sm': return 32
      case 'md': return 40
      case 'lg': return 48
      case 'xl': return 64
      default: return 40
    }
  }, [size])

  return (
    <Avatar
      picture={resolvedSrc}
      size={sizeInPixels}
      className={className}
      name={alt}
    />
  )
}