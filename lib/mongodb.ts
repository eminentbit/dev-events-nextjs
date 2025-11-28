/**
 * lib/mongodb.ts
 *
 * Mongoose connection helper for a Next.js + TypeScript application.
 *
 * - Uses a global cache to reuse the Mongoose connection across module reloads (dev HMR).
 * - Avoids creating multiple connections during development.
 * - Provides strong typing without using `any`.
 */

import mongoose from "mongoose";

// Small alias for the Mongoose type used in returns
type MongooseType = typeof mongoose;

// Cache shape stored on the global object to persist across module reloads
interface MongooseCache {
  conn: MongooseType | null;
  promise: Promise<MongooseType> | null;
}

// Extend global to include our cache variable. This lets TypeScript know about it.
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

// Read the MongoDB connection string from environment variables.
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // Fail early if the environment variable is missing. This is preferable to obscure runtime errors.
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

// Initialize the cache on the global object if it doesn't already exist.
if (!global._mongooseCache) {
  global._mongooseCache = { conn: null, promise: null };
}

/**
 * connectToDatabase
 *
 * Establishes (or reuses) a Mongoose connection to MongoDB and returns the connected
 * Mongoose instance. Uses a global cache to avoid creating multiple connections
 * during development when modules are reloaded.
 *
 * Returns:
 *  - a connected `mongoose` instance (typed as `typeof mongoose`).
 */
export async function connectToDatabase(): Promise<MongooseType> {
  // Use a local `cache` variable that is typed as `MongooseCache` so TypeScript
  // knows the object is present (we ensured it above).
  const cache: MongooseCache = global._mongooseCache as MongooseCache;

  // If a connection already exists in the cache, return it immediately.
  if (cache.conn) return cache.conn;

  // If a connection is in the process of being established, await it.
  if (cache.promise) {
    const mongooseInstance = await cache.promise;
    return mongooseInstance;
  }

  // Build connect options with the typed Mongoose ConnectOptions. Tune as needed.
  const options: mongoose.ConnectOptions = {
    bufferCommands: false,
  };

  // After the null-check above, we can safely coerce the URI to `string`.
  const uri: string = MONGODB_URI as string;

  // Create a promise for the connection and store it on the cache so subsequent calls wait for it.
  cache.promise = mongoose.connect(uri, options).then((mongooseInstance) => {
    // Store the resolved mongoose instance in cache.conn for fast synchronous returns later.
    cache.conn = mongooseInstance;
    return mongooseInstance;
  });

  const mongooseInstance = await cache.promise;
  return mongooseInstance;
}

// Default export for convenience
export default connectToDatabase;
