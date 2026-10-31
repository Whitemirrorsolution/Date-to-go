import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
// import bookingReducer from './slices/bookingSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // bookings: bookingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
