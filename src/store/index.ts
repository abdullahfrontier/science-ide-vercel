import {configureStore, combineReducers} from '@reduxjs/toolkit'
import {persistReducer, persistStore} from 'redux-persist'
// import storage from 'redux-persist/lib/storage'
import authReducer from './slices/authSlice'
import storage from './storage'

const rootReducer = combineReducers({
	auth: authReducer
})

const persistConfig = {
	key: 'root',
	storage,
	whitelist: ['auth']
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
	reducer: persistedReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				// Ignore these action types for serializable check
				ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE']
			}
		})
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
