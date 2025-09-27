import React, { useState } from 'react'
import { getGravatarUrl, getInitials } from '@/lib/gravatar'
import { cn } from "@/lib/utils"

interface AvatarProps {
  email: string
  name: string
  picture?: string  // Direct picture URL (from federated providers or uploads)
  size?: number
  className?: string
}

export const Avatar: React.FC<AvatarProps> = ({ 
  email, 
  name, 
  picture,
  size = 40, 
  className 
}) => {
  const [imageError, setImageError] = useState(false)
  const gravatarUrl = getGravatarUrl(email, { size, default: 'mp' })
  const initials = getInitials(name)

  const handleImageError = () => {
    setImageError(true)
  }

  // Priority: direct picture URL > Gravatar > initials
  const imageUrl = picture || gravatarUrl

  return (
    <div 
      className={cn(
        "rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white font-medium",
        className
      )}
      style={{ width: size, height: size }}
    >
      {!imageError && imageUrl ? (
        <img
          src={imageUrl}
          alt={`${name}'s avatar`}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      ) : (
        <span style={{ fontSize: size * 0.4 }}>
          {initials}
        </span>
      )}
    </div>
  )
}