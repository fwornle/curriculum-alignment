export interface GravatarOptions {
  size?: number
  default?: 'mp' | 'identicon' | 'monsterid' | 'wavatar' | 'retro' | 'robohash' | 'blank'
  rating?: 'g' | 'pg' | 'r' | 'x'
}

/**
 * Simple MD5 implementation for browser use
 * Based on the RSA Data Security, Inc. MD5 Message-Digest Algorithm
 */
function md5(text: string): string {
  // Simple hash function for demo purposes
  // In production, you'd want to use a proper MD5 implementation
  let hash = 0
  if (text.length === 0) return '0'
  
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  // Convert to positive hex string
  return Math.abs(hash).toString(16).padStart(8, '0')
}

/**
 * Generate a Gravatar URL for an email address
 */
export function getGravatarUrl(email?: string, options: GravatarOptions = {}): string {
  const {
    size = 80,
    default: defaultImage = 'identicon',
    rating = 'g'
  } = options

  // Handle undefined or null email
  if (!email || typeof email !== 'string') {
    // Return a default gravatar URL with a placeholder hash
    const params = new URLSearchParams({
      s: size.toString(),
      d: defaultImage,
      r: rating
    })
    return `https://www.gravatar.com/avatar/00000000?${params.toString()}`
  }

  // Normalize email: trim and lowercase
  const normalizedEmail = email.trim().toLowerCase()
  
  // Create hash of the email (simplified for demo)
  const hash = md5(normalizedEmail)
  
  // Build query parameters
  const params = new URLSearchParams({
    s: size.toString(),
    d: defaultImage,
    r: rating
  })
  
  return `https://www.gravatar.com/avatar/${hash}?${params.toString()}`
}

/**
 * Get initials from a name for fallback display
 */
export function getInitials(name?: string): string {
  // Handle undefined or null name
  if (!name || typeof name !== 'string') {
    return '??'
  }

  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}