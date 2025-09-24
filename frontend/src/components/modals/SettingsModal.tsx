import React from 'react'
import { useAppDispatch, useAppSelector } from '../../store'
import { closeModal, setTheme, updatePreferences } from '../../store/slices/uiSlice'
import { Button } from '../ui/button'
import { 
  X,
  Monitor,
  Sun,
  Moon,
  Bell,
  Save,
  Zap,
  Palette,
  Settings as SettingsIcon
} from 'lucide-react'

export const SettingsModal: React.FC = () => {
  const dispatch = useAppDispatch()
  const { modals, theme, preferences } = useAppSelector(state => state.ui)

  if (!modals.settings) return null

  const handleClose = () => {
    dispatch(closeModal('settings'))
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    dispatch(setTheme(newTheme))
  }

  const handlePreferenceChange = (key: string, value: any) => {
    dispatch(updatePreferences({ [key]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative w-full max-w-2xl mx-4 bg-background rounded-lg shadow-lg border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
          {/* Theme Settings */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Theme</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor },
              ].map((option) => {
                const Icon = option.icon
                return (
                  <Button
                    key={option.value}
                    variant={theme === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleThemeChange(option.value as any)}
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{option.label}</span>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Application Preferences */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Application</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Auto-save</label>
                  <p className="text-xs text-muted-foreground">Automatically save changes</p>
                </div>
                <Button
                  variant={preferences.autoSave ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePreferenceChange('autoSave', !preferences.autoSave)}
                >
                  {preferences.autoSave ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Animations</label>
                  <p className="text-xs text-muted-foreground">Enable UI animations</p>
                </div>
                <Button
                  variant={preferences.animationsEnabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePreferenceChange('animationsEnabled', !preferences.animationsEnabled)}
                >
                  {preferences.animationsEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Items per page</label>
                <div className="flex space-x-2">
                  {[10, 20, 50, 100].map((count) => (
                    <Button
                      key={count}
                      variant={preferences.itemsPerPage === count ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePreferenceChange('itemsPerPage', count)}
                    >
                      {count}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Default view</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'dashboard', label: 'Dashboard' },
                    { value: 'programs', label: 'Programs' },
                    { value: 'analysis', label: 'Analysis' },
                    { value: 'reports', label: 'Reports' },
                  ].map((view) => (
                    <Button
                      key={view.value}
                      variant={preferences.defaultView === view.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePreferenceChange('defaultView', view.value)}
                    >
                      {view.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Notifications</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Enable notifications</label>
                <p className="text-xs text-muted-foreground">Receive analysis and workflow updates</p>
              </div>
              <Button
                variant={preferences.notifications ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePreferenceChange('notifications', !preferences.notifications)}
              >
                {preferences.notifications ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 p-6 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleClose}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}