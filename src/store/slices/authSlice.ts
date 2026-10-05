import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Session } from '../../types/auth';

export interface AuthState {
  session: Session | null;
  isInitialized: boolean;
  isLoading: boolean;
  pendingMeetingId: string | null;
}

const initialState: AuthState = {
  session: null,
  isInitialized: false,
  isLoading: false,
  pendingMeetingId: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<Session | null>) {
      state.session = action.payload;
    },
    setInitialized(state, action: PayloadAction<boolean>) {
      state.isInitialized = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setPendingMeetingId(state, action: PayloadAction<string | null>) {
      state.pendingMeetingId = action.payload;
    },
    logout(state) {
      state.session = null;
      state.pendingMeetingId = null;
    },
  },
});

export const { setSession, setInitialized, setLoading, setPendingMeetingId, logout } = authSlice.actions;
export const clearSession = logout;
export default authSlice.reducer;
