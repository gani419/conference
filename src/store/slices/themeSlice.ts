import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ThemePreference } from '../../hooks/useResolvedTheme';
import { storageService } from '../../services/storageService';

export interface ThemeState {
  preference: ThemePreference;
}

const initialState: ThemeState = {
  preference: storageService.getThemePreference(),
};

export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setThemePreference(state, action: PayloadAction<ThemePreference>) {
      state.preference = action.payload;
      storageService.setThemePreference(action.payload);
    },
  },
});

export const { setThemePreference } = themeSlice.actions;
export default themeSlice.reducer;
