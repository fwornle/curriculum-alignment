import { apiClient } from './apiClient'

// User preferences and settings interfaces
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  notifications: NotificationSettings
  display: DisplaySettings
  accessibility: AccessibilitySettings
  privacy: PrivacySettings
}

export interface NotificationSettings {
  enabled: boolean
  email: boolean
  push: boolean
  inApp: boolean
  types: {
    systemUpdates: boolean
    analysisComplete: boolean
    reportGenerated: boolean
    documentProcessed: boolean
    chatMessages: boolean
    deadlines: boolean
  }
  frequency: 'immediate' | 'daily' | 'weekly'
  quietHours: {
    enabled: boolean
    start: string // HH:MM format
    end: string   // HH:MM format
  }
}

export interface DisplaySettings {
  density: 'compact' | 'comfortable' | 'spacious'
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  sidebarCollapsed: boolean
  gridView: boolean
  itemsPerPage: number
  showThumbnails: boolean
  animationsEnabled: boolean
  highContrast: boolean
}

export interface AccessibilitySettings {
  screenReaderOptimized: boolean
  keyboardNavigation: boolean
  reducedMotion: boolean
  highContrast: boolean
  largeClickTargets: boolean
  autoPlayVideos: boolean
  captionsEnabled: boolean
}

export interface PrivacySettings {
  analytics: boolean
  crashReporting: boolean
  usageTracking: boolean
  locationTracking: boolean
  cookiesAccepted: boolean
  dataRetentionDays: number
  shareUsageData: boolean
}

export interface AppSettings {
  autoSave: boolean
  autoSaveInterval: number // minutes
  maxRecentItems: number
  defaultAnalysisType: 'alignment' | 'gap' | 'comparison'
  defaultReportFormat: 'pdf' | 'docx' | 'html'
  exportQuality: 'low' | 'medium' | 'high'
  cacheEnabled: boolean
  offlineMode: boolean
  syncOnStartup: boolean
}

export interface UserSettings {
  id: string
  userId: string
  preferences: UserPreferences
  appSettings: AppSettings
  lastUpdated: string
  version: number
  syncStatus: 'synced' | 'pending' | 'conflict' | 'offline'
}

export interface SettingsConflict {
  field: string
  localValue: any
  remoteValue: any
  lastModified: {
    local: string
    remote: string
  }
}

export interface SyncResult {
  success: boolean
  conflicts: SettingsConflict[]
  synced: string[]
  errors: string[]
}

// Default settings
const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  notifications: {
    enabled: true,
    email: true,
    push: false,
    inApp: true,
    types: {
      systemUpdates: true,
      analysisComplete: true,
      reportGenerated: true,
      documentProcessed: true,
      chatMessages: false,
      deadlines: true
    },
    frequency: 'immediate',
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  },
  display: {
    density: 'comfortable',
    fontSize: 'medium',
    sidebarCollapsed: false,
    gridView: false,
    itemsPerPage: 20,
    showThumbnails: true,
    animationsEnabled: true,
    highContrast: false
  },
  accessibility: {
    screenReaderOptimized: false,
    keyboardNavigation: true,
    reducedMotion: false,
    highContrast: false,
    largeClickTargets: false,
    autoPlayVideos: false,
    captionsEnabled: false
  },
  privacy: {
    analytics: true,
    crashReporting: true,
    usageTracking: true,
    locationTracking: false,
    cookiesAccepted: false,
    dataRetentionDays: 365,
    shareUsageData: false
  }
}

const defaultAppSettings: AppSettings = {
  autoSave: true,
  autoSaveInterval: 5,
  maxRecentItems: 10,
  defaultAnalysisType: 'alignment',
  defaultReportFormat: 'pdf',
  exportQuality: 'medium',
  cacheEnabled: true,
  offlineMode: false,
  syncOnStartup: true
}

class SettingsService {
  private baseUrl = '/api/settings'
  private localStorageKey = 'curriculum-alignment-settings'
  private syncIntervalId: NodeJS.Timeout | null = null
  private settings: UserSettings | null = null

  constructor() {
    this.initializeSettings()
    this.startPeriodicSync()
  }

  // Initialize settings from localStorage or defaults
  private initializeSettings(): void {
    try {
      const stored = localStorage.getItem(this.localStorageKey)
      if (stored) {
        this.settings = JSON.parse(stored)
        // Merge with defaults for any missing properties
        this.settings = this.mergeWithDefaults(this.settings)
      } else {
        this.settings = this.createDefaultSettings()
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error)
      this.settings = this.createDefaultSettings()
    }
  }

  private createDefaultSettings(): UserSettings {
    return {
      id: '',
      userId: '',
      preferences: defaultPreferences,
      appSettings: defaultAppSettings,
      lastUpdated: new Date().toISOString(),
      version: 1,
      syncStatus: 'offline'
    }
  }

  private mergeWithDefaults(settings: UserSettings): UserSettings {
    return {
      ...settings,
      preferences: { ...defaultPreferences, ...settings.preferences },
      appSettings: { ...defaultAppSettings, ...settings.appSettings }
    }
  }

  // Get current settings
  getSettings(): UserSettings {
    return this.settings || this.createDefaultSettings()
  }

  // Update settings locally
  updateSettings(updates: Partial<UserSettings>): void {
    if (!this.settings) {
      this.settings = this.createDefaultSettings()
    }

    this.settings = {
      ...this.settings,
      ...updates,
      lastUpdated: new Date().toISOString(),
      version: this.settings.version + 1,
      syncStatus: 'pending'
    }

    this.saveToLocalStorage()
  }

  // Update specific preference
  updatePreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): void {
    this.updateSettings({
      preferences: {
        ...this.getSettings().preferences,
        [key]: value
      }
    })
  }

  // Update app setting
  updateAppSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): void {
    this.updateSettings({
      appSettings: {
        ...this.getSettings().appSettings,
        [key]: value
      }
    })
  }

  // Save to localStorage
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(this.settings))
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error)
    }
  }

  // Sync with backend
  async syncWithBackend(): Promise<SyncResult> {
    try {
      const localSettings = this.getSettings()
      
      // Get remote settings
      const response = await apiClient.get(`${this.baseUrl}/user`)
      const remoteSettings = response.data as UserSettings

      if (!remoteSettings) {
        // No remote settings, upload local ones
        return this.uploadSettings(localSettings)
      }

      // Compare versions and timestamps
      const conflicts = this.detectConflicts(localSettings, remoteSettings)
      
      if (conflicts.length === 0) {
        // No conflicts, use the newer version
        if (localSettings.version > remoteSettings.version) {
          return this.uploadSettings(localSettings)
        } else if (remoteSettings.version > localSettings.version) {
          this.settings = remoteSettings
          this.saveToLocalStorage()
          return {
            success: true,
            conflicts: [],
            synced: Object.keys(remoteSettings.preferences).concat(Object.keys(remoteSettings.appSettings)),
            errors: []
          }
        } else {
          // Same version, mark as synced
          this.updateSettings({ syncStatus: 'synced' })
          return {
            success: true,
            conflicts: [],
            synced: [],
            errors: []
          }
        }
      } else {
        // Conflicts detected
        this.updateSettings({ syncStatus: 'conflict' })
        return {
          success: false,
          conflicts,
          synced: [],
          errors: ['Settings conflicts detected']
        }
      }
    } catch (error: any) {
      console.error('Settings sync failed:', error)
      this.updateSettings({ syncStatus: 'offline' })
      return {
        success: false,
        conflicts: [],
        synced: [],
        errors: [error.message || 'Sync failed']
      }
    }
  }

  // Upload local settings to backend
  private async uploadSettings(settings: UserSettings): Promise<SyncResult> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/user`, settings)
      const savedSettings = response.data as UserSettings
      
      this.settings = savedSettings
      this.settings.syncStatus = 'synced'
      this.saveToLocalStorage()

      return {
        success: true,
        conflicts: [],
        synced: Object.keys(settings.preferences).concat(Object.keys(settings.appSettings)),
        errors: []
      }
    } catch (error: any) {
      console.error('Failed to upload settings:', error)
      return {
        success: false,
        conflicts: [],
        synced: [],
        errors: [error.message || 'Upload failed']
      }
    }
  }

  // Detect conflicts between local and remote settings
  private detectConflicts(local: UserSettings, remote: UserSettings): SettingsConflict[] {
    const conflicts: SettingsConflict[] = []

    // Compare preferences
    this.compareObjects(local.preferences, remote.preferences, 'preferences', conflicts, local.lastUpdated, remote.lastUpdated)
    
    // Compare app settings
    this.compareObjects(local.appSettings, remote.appSettings, 'appSettings', conflicts, local.lastUpdated, remote.lastUpdated)

    return conflicts
  }

  private compareObjects(
    local: any,
    remote: any,
    prefix: string,
    conflicts: SettingsConflict[],
    localTime: string,
    remoteTime: string
  ): void {
    for (const key in local) {
      if (local[key] !== remote[key]) {
        if (typeof local[key] === 'object' && typeof remote[key] === 'object') {
          this.compareObjects(local[key], remote[key], `${prefix}.${key}`, conflicts, localTime, remoteTime)
        } else {
          conflicts.push({
            field: `${prefix}.${key}`,
            localValue: local[key],
            remoteValue: remote[key],
            lastModified: {
              local: localTime,
              remote: remoteTime
            }
          })
        }
      }
    }
  }

  // Resolve conflicts by choosing local or remote values
  async resolveConflicts(resolutions: Record<string, 'local' | 'remote'>): Promise<SyncResult> {
    const currentSettings = this.getSettings()
    let resolvedSettings = { ...currentSettings }

    for (const [fieldPath, choice] of Object.entries(resolutions)) {
      if (choice === 'local') {
        // Keep local value (already in resolvedSettings)
        continue
      } else {
        // Get remote value and apply it
        try {
          const response = await apiClient.get(`${this.baseUrl}/user`)
          const remoteSettings = response.data as UserSettings
          const remotePath = fieldPath.split('.')
          
          let remoteValue = remoteSettings
          let targetObject = resolvedSettings
          
          for (let i = 0; i < remotePath.length - 1; i++) {
            remoteValue = (remoteValue as any)[remotePath[i]]
            targetObject = (targetObject as any)[remotePath[i]]
          }
          
          const finalKey = remotePath[remotePath.length - 1];
          (targetObject as any)[finalKey] = (remoteValue as any)[finalKey]
        } catch (error) {
          console.error(`Failed to resolve conflict for ${fieldPath}:`, error)
        }
      }
    }

    this.settings = resolvedSettings
    this.settings.syncStatus = 'pending'
    this.settings.lastUpdated = new Date().toISOString()
    this.settings.version += 1

    return this.syncWithBackend()
  }

  // Import settings from file/object
  importSettings(settingsData: Partial<UserSettings>): boolean {
    try {
      const validatedSettings = this.validateSettings(settingsData)
      this.updateSettings(validatedSettings)
      return true
    } catch (error) {
      console.error('Failed to import settings:', error)
      return false
    }
  }

  // Export settings to object
  exportSettings(): UserSettings {
    return this.getSettings()
  }

  // Reset to defaults
  resetToDefaults(): void {
    this.settings = this.createDefaultSettings()
    this.saveToLocalStorage()
  }

  // Validate settings object
  private validateSettings(settings: any): Partial<UserSettings> {
    // Basic validation - could be expanded
    const validated: Partial<UserSettings> = {}

    if (settings.preferences && typeof settings.preferences === 'object') {
      validated.preferences = { ...defaultPreferences, ...settings.preferences }
    }

    if (settings.appSettings && typeof settings.appSettings === 'object') {
      validated.appSettings = { ...defaultAppSettings, ...settings.appSettings }
    }

    return validated
  }

  // Start periodic background sync
  private startPeriodicSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId)
    }

    // Sync every 5 minutes
    this.syncIntervalId = setInterval(() => {
      const settings = this.getSettings()
      if (settings.syncStatus === 'pending') {
        this.syncWithBackend()
      }
    }, 5 * 60 * 1000)
  }

  // Stop periodic sync
  stopPeriodicSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId)
      this.syncIntervalId = null
    }
  }

  // Get specific preference
  getPreference<K extends keyof UserPreferences>(key: K): UserPreferences[K] {
    return this.getSettings().preferences[key]
  }

  // Get specific app setting
  getAppSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.getSettings().appSettings[key]
  }

  // Check if settings are synced
  isSynced(): boolean {
    return this.getSettings().syncStatus === 'synced'
  }

  // Check if there are pending changes
  hasPendingChanges(): boolean {
    return this.getSettings().syncStatus === 'pending'
  }

  // Check if there are conflicts
  hasConflicts(): boolean {
    return this.getSettings().syncStatus === 'conflict'
  }
}

// Export singleton instance
export const settingsService = new SettingsService()