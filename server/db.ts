import mongoose from 'mongoose';

let isConnected = false;
let connectionError: string | null = null;

export async function connectDB(): Promise<boolean> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.warn('[LabelLens DB] No MONGODB_URI provided in environment. Running with in-memory resilient data store fallback.');
    isConnected = false;
    connectionError = 'MONGODB_URI not configured. Using resilient in-memory store.';
    return false;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    isConnected = true;
    connectionError = null;
    console.log('[LabelLens DB] Successfully connected to MongoDB at', mongoUri.replace(/\/\/.*@/, '//***@'));
    return true;
  } catch (err: any) {
    isConnected = false;
    connectionError = err.message || 'Failed to connect to MongoDB';
    console.warn(`[LabelLens DB] MongoDB connection failed (${err.message}). Using resilient in-memory store for demonstration.`);
    return false;
  }
}

export function getDBStatus() {
  return {
    connected: isConnected,
    database: isConnected ? mongoose.connection.name : 'in-memory-fallback',
    error: connectionError,
    readyState: mongoose.connection.readyState, // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  };
}
