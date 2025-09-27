import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility functions for curriculum alignment system
export function formatUniversityName(name: string): string {
  // Handle common abbreviations
  const abbreviations: Record<string, string> = {
    'CEU': 'Central European University',
    'MIT': 'Massachusetts Institute of Technology',
    'UCLA': 'University of California, Los Angeles',
    'NYU': 'New York University'
  }
  
  return abbreviations[name] || name
}

export function calculateComplianceColor(score: number): string {
  if (score >= 0.9) return 'text-green-600 bg-green-50'
  if (score >= 0.8) return 'text-blue-600 bg-blue-50'
  if (score >= 0.7) return 'text-yellow-600 bg-yellow-50'
  if (score >= 0.6) return 'text-orange-600 bg-orange-50'
  return 'text-red-600 bg-red-50'
}

export function formatCredits(credits: number): string {
  return `${credits} credit${credits !== 1 ? 's' : ''}`
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}