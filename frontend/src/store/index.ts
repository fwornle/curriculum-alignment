import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'

// Import all slices
import authSlice from './slices/authSlice'
import curriculumSlice from './slices/curriculumSlice'
import analysisSlice from './slices/analysisSlice'
import uiSlice from './slices/uiSlice'
import llmConfigSlice from './slices/llmConfigSlice'
import reportSlice from './slices/reportSlice'
import chatSlice from './slices/chatSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    curriculum: curriculumSlice,
    analysis: analysisSlice,
    ui: uiSlice,
    llmConfig: llmConfigSlice,
    report: reportSlice,
    chat: chatSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector