import { configureStore, createSlice } from "@reduxjs/toolkit";

const shellSlice = createSlice({
  name: "shell",
  initialState: {
    searchOpen: false,
  },
  reducers: {
    openSearch(state) {
      state.searchOpen = true;
    },
    closeSearch(state) {
      state.searchOpen = false;
    },
    toggleSearch(state) {
      state.searchOpen = !state.searchOpen;
    },
  },
});

export const { openSearch, closeSearch, toggleSearch } = shellSlice.actions;

export function makeStore() {
  return configureStore({
    reducer: {
      shell: shellSlice.reducer,
    },
  });
}
