import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../store'
import { closeModal } from '../../store/slices/uiSlice'
import { updateUserPreferences } from '../../store/slices/authSlice'
import { Button } from '../ui/button'
import { Avatar } from '../ui/Avatar'
import { 
  X,
  User,
  Mail,
  Shield,
  Calendar,
  Edit2,
  Save,
  AlertCircle
} from 'lucide-react'

export const ProfileModal: React.FC = () => {
  const dispatch = useAppDispatch()
  const { modals } = useAppSelector(state => state.ui)
  const { user } = useAppSelector(state => state.auth)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    // Only allow editing non-Cognito fields like preferences
    theme: user?.preferences?.theme || 'system',
    language: user?.preferences?.language || 'en',
    notifications: user?.preferences?.notifications || true
  })

  if (!modals.profile || !user) return null

  const handleClose = () => {
    dispatch(closeModal('profile'))
    setIsEditing(false)
  }

  const handleSave = () => {
    // Update user preferences in Redux
    dispatch(updateUserPreferences({
      theme: editForm.theme,
      language: editForm.language,
      notifications: editForm.notifications
    }))
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditForm({
      theme: user?.preferences?.theme || 'system',
      language: user?.preferences?.language || 'en',
      notifications: user?.preferences?.notifications || true
    })
    setIsEditing(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
              <p className="text-sm text-gray-500">Manage your account information</p>
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
          {/* Profile Picture */}
          <div className="flex items-center gap-4">
            <Avatar 
              email={user.email} 
              name={user.name} 
              picture={user.picture}
              size={64}
              className="shadow-lg"
            />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{user.name}</h3>
              <p className="text-sm text-gray-500 capitalize">{user.role}</p>
              {!user.picture && (
                <button
                  className="mt-1 text-xs text-blue-600 hover:text-blue-700"
                  onClick={() => {/* TODO: Implement profile picture upload */}}
                >
                  Upload profile picture
                </button>
              )}
            </div>
          </div>

          {/* User Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">{isEditing ? 'Preferences' : 'Account Information'}</h4>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit Preferences
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
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
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-600 mb-2">ℹ️ Name and email are managed by AWS Cognito and cannot be edited here.</p>
                </div>
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
                {user.emailVerified && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <div className="text-sm text-green-700">Email Verified by Cognito</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Account Status */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Account Status</h4>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              Active Account
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}