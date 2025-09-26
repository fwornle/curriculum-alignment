import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'

// Import all slices
import authSlice from './slices/authSlice'
import curriculumSlice from './slices/curriculumSlice'
import analysisSlice from './slices/analysisSlice'
import uiSlice from './slices/uiSlice'
import llmConfigSlice from './slices/llmConfigSlice'
import reportSlice from './slices/reportSlice'
import chatSlice from './slices/chatSlice'
import websocketSlice from './slices/websocketSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    curriculum: curriculumSlice,
    analysis: analysisSlice,
    ui: uiSlice,
    llmConfig: llmConfigSlice,
    report: reportSlice,
    chat: chatSlice,
    websocket: websocketSlice,
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

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector