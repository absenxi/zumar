// Re-export all database operations from Supabase engine to completely replace Firebase
export * from './supabase';
import { getSupabaseConnectionStatus, handleSupabaseError, SupabaseErrorInfo, OperationType } from './supabase';

// Compatibility aliases for legacy references
export const getFirestoreConnectionStatus = getSupabaseConnectionStatus;
export const handleFirestoreError = handleSupabaseError;
export type FirestoreErrorInfo = SupabaseErrorInfo;
export const db = null;
