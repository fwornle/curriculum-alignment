import { useCallback, useEffect, useState } from 'react'
import { 
  settingsService, 
  UserSettings, 
  UserPreferences, 
  AppSettings,
  SyncResult,
  SettingsConflict 
} from '../services/api/settingsService'

export interface UseSettingsReturn {
  settings: UserSettings | null
  preferences: UserPreferences
  appSettings: AppSettings
  isLoading: boolean
  isSyncing: boolean
  isSynced: boolean
  hasPendingChanges: boolean
  hasConflicts: boolean
  syncResult: SyncResult | null
  conflicts: SettingsConflict[]
  error: string | null
  
  // Actions
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<void>
  updateAppSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
  syncWithBackend: () => Promise<SyncResult>
  resolveConflicts: (resolutions: Record<string, 'local' | 'remote'>) => Promise<SyncResult>
  resetToDefaults: () => Promise<void>
  exportSettings: () => UserSettings
  importSettings: (settingsData: Partial<UserSettings>) => Promise<boolean>
  
  // Getters
  getPreference: <K extends keyof UserPreferences>(key: K) => UserPreferences[K]
  getAppSetting: <K extends keyof AppSettings>(key: K) => AppSettings[K]
}

export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [conflicts, setConflicts] = useState<SettingsConflict[]>([])
  const [error, setError] = useState<string | null>(null)

  // Initialize settings on hook mount
  useEffect(() => {
    const initializeSettings = () => {
      try {
        setIsLoading(true)
        const currentSettings = settingsService.getSettings()
        setSettings(currentSettings)
        setError(null)
      } catch (err: any) {
        console.error('Failed to initialize settings:', err)
        setError(err.message || 'Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }

    initializeSettings()
  }, [])

  // Derived state
  const preferences = settings?.preferences || settingsService.getSettings().preferences
  const appSettings = settings?.appSettings || settingsService.getSettings().appSettings
  const isSynced = settingsService.isSynced()
  const hasPendingChanges = settingsService.hasPendingChanges()
  const hasConflicts = settingsService.hasConflicts()

  // Update settings locally
  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    try {
      setError(null)
      settingsService.updateSettings(updates)
      const updatedSettings = settingsService.getSettings()
      setSettings(updatedSettings)
    } catch (err: any) {
      console.error('Failed to update settings:', err)
      setError(err.message || 'Failed to update settings')
      throw err
    }
  }, [])

  // Update specific preference
  const updatePreference = useCallback(async <K extends keyof UserPreferences>(
    key: K, 
    value: UserPreferences[K]
  ) => {
    try {
      setError(null)
      settingsService.updatePreference(key, value)
      const updatedSettings = settingsService.getSettings()
      setSettings(updatedSettings)
    } catch (err: any) {
      console.error('Failed to update preference:', err)
      setError(err.message || 'Failed to update preference')
      throw err
    }
  }, [])

  // Update app setting
  const updateAppSetting = useCallback(async <K extends keyof AppSettings>(
    key: K, 
    value: AppSettings[K]
  ) => {
    try {
      setError(null)
      settingsService.updateAppSetting(key, value)
      const updatedSettings = settingsService.getSettings()
      setSettings(updatedSettings)
    } catch (err: any) {
      console.error('Failed to update app setting:', err)
      setError(err.message || 'Failed to update app setting')
      throw err
    }
  }, [])

  // Sync with backend
  const syncWithBackend = useCallback(async (): Promise<SyncResult> => {
    try {
      setIsSyncing(true)
      setError(null)
      
      const result = await settingsService.syncWithBackend()
      setSyncResult(result)
      
      if (result.conflicts.length > 0) {
        setConflicts(result.conflicts)
      } else {
        setConflicts([])
      }
      
      if (!result.success && result.errors.length > 0) {
        setError(result.errors.join(', '))
      }
      
      // Refresh local settings after sync
      const updatedSettings = settingsService.getSettings()
      setSettings(updatedSettings)
      
      return result
    } catch (err: any) {
      console.error('Sync failed:', err)
      const error = err.message || 'Sync failed'
      setError(error)
      const failedResult: SyncResult = {
        success: false,
        conflicts: [],
        synced: [],
        errors: [error]
      }
      setSyncResult(failedResult)
      return failedResult
    } finally {
      setIsSyncing(false)
    }
  }, [])

  // Resolve conflicts
  const resolveConflicts = useCallback(async (
    resolutions: Record<string, 'local' | 'remote'>
  ): Promise<SyncResult> => {
    try {
      setIsSyncing(true)
      setError(null)
      
      const result = await settingsService.resolveConflicts(resolutions)
      setSyncResult(result)
      
      if (result.success) {
        setConflicts([])
      } else if (result.errors.length > 0) {
        setError(result.errors.join(', '))
      }
      
      // Refresh local settings after conflict resolution
      const updatedSettings = settingsService.getSettings()
      setSettings(updatedSettings)
      
      return result
    } catch (err: any) {
      console.error('Conflict resolution failed:', err)
      const error = err.message || 'Failed to resolve conflicts'
      setError(error)
      const failedResult: SyncResult = {
        success: false,
        conflicts: conflicts,
        synced: [],
        errors: [error]
      }
      setSyncResult(failedResult)
      return failedResult
    } finally {
      setIsSyncing(false)
    }
  }, [conflicts])

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    try {
      setError(null)
      settingsService.resetToDefaults()
      const resetSettings = settingsService.getSettings()
      setSettings(resetSettings)
      setConflicts([])
      setSyncResult(null)
    } catch (err: any) {
      console.error('Failed to reset settings:', err)
      setError(err.message || 'Failed to reset settings')
      throw err
    }
  }, [])

  // Export settings
  const exportSettings = useCallback((): UserSettings => {
    return settingsService.exportSettings()
  }, [])

  // Import settings
  const importSettings = useCallback(async (settingsData: Partial<UserSettings>): Promise<boolean> => {
    try {
      setError(null)
      const success = settingsService.importSettings(settingsData)
      
      if (success) {
        const updatedSettings = settingsService.getSettings()
        setSettings(updatedSettings)
      } else {
        setError('Failed to import settings - invalid data')
      }
      
      return success
    } catch (err: any) {
      console.error('Failed to import settings:', err)
      setError(err.message || 'Failed to import settings')
      return false
    }
  }, [])

  // Get specific preference
  const getPreference = useCallback(<K extends keyof UserPreferences>(key: K): UserPreferences[K] => {
    return settingsService.getPreference(key)
  }, [])

  // Get specific app setting
  const getAppSetting = useCallback(<K extends keyof AppSettings>(key: K): AppSettings[K] => {
    return settingsService.getAppSetting(key)
  }, [])

  return {
    settings,
    preferences,
    appSettings,
    isLoading,
    isSyncing,
    isSynced,
    hasPendingChanges,
    hasConflicts,
    syncResult,
    conflicts,
    error,
    
    // Actions
    updateSettings,
    updatePreference,
    updateAppSetting,
    syncWithBackend,
    resolveConflicts,
    resetToDefaults,
    exportSettings,
    importSettings,
    
    // Getters
    getPreference,
    getAppSetting
  }
}

// Specific hooks for common settings operations
export const useTheme = () => {
  const { getPreference, updatePreference } = useSettings()
  
  return {
    theme: getPreference('theme'),
    setTheme: (theme: 'light' | 'dark' | 'system') => updatePreference('theme', theme)
  }
}

export const useNotificationSettings = () => {
  const { getPreference, updatePreference } = useSettings()
  
  const notifications = getPreference('notifications')
  
  return {
    notifications,
    updateNotifications: (updates: Partial<typeof notifications>) => 
      updatePreference('notifications', { ...notifications, ...updates }),
    toggleNotifications: () => 
      updatePreference('notifications', { ...notifications, enabled: !notifications.enabled })
  }
}

export const useDisplaySettings = () => {
  const { getPreference, updatePreference } = useSettings()
  
  const display = getPreference('display')
  
  return {
    display,
    updateDisplay: (updates: Partial<typeof display>) => 
      updatePreference('display', { ...display, ...updates }),
    toggleSidebar: () => 
      updatePreference('display', { ...display, sidebarCollapsed: !display.sidebarCollapsed }),
    setDensity: (density: 'compact' | 'comfortable' | 'spacious') =>
      updatePreference('display', { ...display, density })
  }
}

export const usePrivacySettings = () => {
  const { getPreference, updatePreference } = useSettings()
  
  const privacy = getPreference('privacy')
  
  return {
    privacy,
    updatePrivacy: (updates: Partial<typeof privacy>) => 
      updatePreference('privacy', { ...privacy, ...updates }),
    toggleAnalytics: () => 
      updatePreference('privacy', { ...privacy, analytics: !privacy.analytics })
  }
}