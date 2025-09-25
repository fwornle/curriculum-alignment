import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface UIState {
  theme: 'light' | 'dark' | 'system'
  sidebarOpen: boolean
  currentView: 'dashboard' | 'programs' | 'analysis' | 'reports' | 'chat' | 'components-test'
  currentRoute: string
  modals: {
    uploadDocument: boolean
    createProgram: boolean
    editProgram: boolean
    settings: boolean
    llmConfig: boolean
    analysisDetails: boolean
  }
  loading: {
    global: boolean
    components: Record<string, boolean>
  }
  toasts: Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message?: string
    duration?: number
    actions?: Array<{
      label: string
      action: string
    }>
  }>
  breadcrumbs: Array<{
    label: string
    href?: string
    active?: boolean
  }>
  searchState: {
    query: string
    isOpen: boolean
    results: any[]
    isSearching: boolean
  }
  layout: {
    compactMode: boolean
    showStatusBar: boolean
    panelSizes: Record<string, number>
  }
  preferences: {
    autoSave: boolean
    notifications: boolean
    animationsEnabled: boolean
    defaultView: UIState['currentView']
    itemsPerPage: number
  }
}

const initialState: UIState = {
  theme: 'system',
  sidebarOpen: true,
  currentView: 'dashboard',
  currentRoute: '/',
  modals: {
    uploadDocument: false,
    createProgram: false,
    editProgram: false,
    settings: false,
    llmConfig: false,
    analysisDetails: false,
  },
  loading: {
    global: false,
    components: {},
  },
  toasts: [],
  breadcrumbs: [
    { label: 'Home', href: '/', active: true }
  ],
  searchState: {
    query: '',
    isOpen: false,
    results: [],
    isSearching: false,
  },
  layout: {
    compactMode: false,
    showStatusBar: true,
    panelSizes: {
      sidebar: 280,
      main: 800,
      details: 400,
    },
  },
  preferences: {
    autoSave: true,
    notifications: true,
    animationsEnabled: true,
    defaultView: 'dashboard',
    itemsPerPage: 20,
  },
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<UIState['theme']>) => {
      state.theme = action.payload
      // Apply theme to document
      if (typeof document !== 'undefined') {
        const root = document.documentElement
        if (action.payload === 'dark') {
          root.classList.add('dark')
        } else if (action.payload === 'light') {
          root.classList.remove('dark')
        } else {
          // System theme
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          if (prefersDark) {
            root.classList.add('dark')
          } else {
            root.classList.remove('dark')
          }
        }
      }
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload
    },
    setCurrentView: (state, action: PayloadAction<UIState['currentView']>) => {
      state.currentView = action.payload
    },
    setCurrentRoute: (state, action: PayloadAction<string>) => {
      state.currentRoute = action.payload
    },
    openModal: (state, action: PayloadAction<keyof UIState['modals']>) => {
      state.modals[action.payload] = true
    },
    closeModal: (state, action: PayloadAction<keyof UIState['modals']>) => {
      state.modals[action.payload] = false
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(key => {
        state.modals[key as keyof UIState['modals']] = false
      })
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload
    },
    setComponentLoading: (state, action: PayloadAction<{
      component: string
      loading: boolean
    }>) => {
      state.loading.components[action.payload.component] = action.payload.loading
    },
    addToast: (state, action: PayloadAction<Omit<UIState['toasts'][0], 'id'>>) => {
      const toast = {
        ...action.payload,
        id: Date.now().toString(),
      }
      state.toasts.push(toast)
      
      // Auto remove toast after duration
      if (toast.duration !== 0) {
        setTimeout(() => {
          const index = state.toasts.findIndex(t => t.id === toast.id)
          if (index !== -1) {
            state.toasts.splice(index, 1)
          }
        }, toast.duration || 5000)
      }
    },
    removeToast: (state, action: PayloadAction<string>) => {
      const index = state.toasts.findIndex(t => t.id === action.payload)
      if (index !== -1) {
        state.toasts.splice(index, 1)
      }
    },
    clearToasts: (state) => {
      state.toasts = []
    },
    setBreadcrumbs: (state, action: PayloadAction<UIState['breadcrumbs']>) => {
      state.breadcrumbs = action.payload
    },
    addBreadcrumb: (state, action: PayloadAction<UIState['breadcrumbs'][0]>) => {
      // Mark previous breadcrumb as inactive
      state.breadcrumbs.forEach(crumb => crumb.active = false)
      state.breadcrumbs.push({ ...action.payload, active: true })
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchState.query = action.payload
    },
    setSearchOpen: (state, action: PayloadAction<boolean>) => {
      state.searchState.isOpen = action.payload
      if (!action.payload) {
        state.searchState.query = ''
        state.searchState.results = []
      }
    },
    setSearchResults: (state, action: PayloadAction<any[]>) => {
      state.searchState.results = action.payload
    },
    setSearching: (state, action: PayloadAction<boolean>) => {
      state.searchState.isSearching = action.payload
    },
    setPanelSize: (state, action: PayloadAction<{
      panel: string
      size: number
    }>) => {
      state.layout.panelSizes[action.payload.panel] = action.payload.size
    },
    setCompactMode: (state, action: PayloadAction<boolean>) => {
      state.layout.compactMode = action.payload
    },
    setShowStatusBar: (state, action: PayloadAction<boolean>) => {
      state.layout.showStatusBar = action.payload
    },
    updatePreferences: (state, action: PayloadAction<Partial<UIState['preferences']>>) => {
      state.preferences = { ...state.preferences, ...action.payload }
    },
    resetUI: (state) => {
      // Reset to initial state but preserve theme and preferences
      const { theme, preferences } = state
      Object.assign(state, initialState, { theme, preferences })
    },
  },
})

export const {
  setTheme,
  toggleSidebar,
  setSidebarOpen,
  setCurrentView,
  setCurrentRoute,
  openModal,
  closeModal,
  closeAllModals,
  setGlobalLoading,
  setComponentLoading,
  addToast,
  removeToast,
  clearToasts,
  setBreadcrumbs,
  addBreadcrumb,
  setSearchQuery,
  setSearchOpen,
  setSearchResults,
  setSearching,
  setPanelSize,
  setCompactMode,
  setShowStatusBar,
  updatePreferences,
  resetUI,
} = uiSlice.actions

export default uiSlice.reducer