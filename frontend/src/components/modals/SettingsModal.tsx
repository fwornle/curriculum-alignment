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
  Users,
  Settings as SettingsIcon
} from 'lucide-react'

export const SettingsModal: React.FC = () => {
  const dispatch = useAppDispatch()
  const { modals, theme, preferences } = useAppSelector(state => state.ui)
  const { user } = useAppSelector(state => state.auth)

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

  // Mock user data for demonstration - in a real app this would come from an API
  const allUsers = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@ceu.edu',
      role: 'admin' as const,
      faculty: 'business',
      active: true,
      permissions: ['manage_users', 'manage_roles', 'manage_faculties']
    },
    {
      id: '2', 
      name: 'Sarah Johnson',
      email: 'sarah.johnson@ceu.edu',
      role: 'faculty' as const,
      faculty: 'public-policy',
      active: true,
      permissions: ['view_programs', 'create_programs', 'edit_own_programs']
    },
    {
      id: '3',
      name: 'Michael Brown',
      email: 'michael.brown@ceu.edu', 
      role: 'student' as const,
      faculty: 'legal-studies',
      active: true,
      permissions: ['view_programs', 'submit_assignments']
    }
  ]

  const handleRoleChange = (userId: string, newRole: 'admin' | 'faculty' | 'student' | 'guest') => {
    // In a real app, this would call an API
    console.log(`Changing user ${userId} role to ${newRole}`)
    // dispatch(updateUserRole({ userId, role: newRole }))
  }

  const handleUserToggle = (userId: string, active: boolean) => {
    // In a real app, this would call an API
    console.log(`${active ? 'Activating' : 'Deactivating'} user ${userId}`)
  }

  const isAdmin = user?.role === 'admin'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative w-full max-w-4xl mx-4 bg-background rounded-lg shadow-lg border">
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
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* User Management - Admin Only */}
          {isAdmin && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">User Management</h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Admin Only</span>
              </div>
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
                      <div className="col-span-3">User</div>
                      <div className="col-span-2">Role</div>
                      <div className="col-span-2">Faculty</div>
                      <div className="col-span-3">Permissions</div>
                      <div className="col-span-1">Status</div>
                      <div className="col-span-1">Actions</div>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {allUsers.map((user) => (
                      <div key={user.id} className="px-4 py-3 border-b last:border-b-0 hover:bg-gray-50">
                        <div className="grid grid-cols-12 gap-4 items-center text-sm">
                          <div className="col-span-3">
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-gray-500 text-xs">{user.email}</div>
                            </div>
                          </div>
                          <div className="col-span-2">
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="admin">Admin</option>
                              <option value="faculty">Faculty</option>
                              <option value="student">Student</option>
                              <option value="guest">Guest</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              {user.faculty || 'None'}
                            </span>
                          </div>
                          <div className="col-span-3">
                            <div className="text-xs text-gray-500">
                              {user.permissions.slice(0, 2).join(', ')}
                              {user.permissions.length > 2 && `... +${user.permissions.length - 2} more`}
                            </div>
                          </div>
                          <div className="col-span-1">
                            <Button
                              variant={user.active ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleUserToggle(user.id, !user.active)}
                              className="text-xs px-2 py-1"
                            >
                              {user.active ? 'Active' : 'Inactive'}
                            </Button>
                          </div>
                          <div className="col-span-1">
                            <Button variant="ghost" size="sm" className="text-xs px-2 py-1">
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Total Users: {allUsers.length} | Active: {allUsers.filter(u => u.active).length} | Admins: {allUsers.filter(u => u.role === 'admin').length}
                </div>
              </div>
            </div>
          )}

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