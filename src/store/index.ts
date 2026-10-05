import { configureStore } from '@reduxjs/toolkit';
import { appApi } from '../api/appApi';
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import activeMeetingReducer from './slices/activeMeetingSlice';

export const store = configureStore({
  reducer: {
    [appApi.reducerPath]: appApi.reducer,
    auth: authReducer,
    theme: themeReducer,
    activeMeeting: activeMeetingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(appApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
