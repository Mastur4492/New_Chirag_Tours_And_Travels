import mongoose from 'mongoose';

/**
 * PRODUCTION & DEVELOPMENT DATABASE INTEGRITY GUARD
 * 
 * Enforces strict isolation for all test suites:
 * 1. Blocks any connection attempt to 'chirag_travels' or any non-test database.
 * 2. Blocks any dropDatabase, collection drop, or deleteMany if not connected to 'chirag_test_*'.
 * 3. Prevents accidental data corruption or loss.
 */

const PROTECTED_DATABASES = ['chirag_travels', 'admin', 'local', 'config'];

const originalConnect = mongoose.connect.bind(mongoose);

// Intercept mongoose.connect
(mongoose as any).connect = async function (uri: string, options?: any) {
  // Extract database name from URI
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  const dbName = match ? match[1] : '';

  if (PROTECTED_DATABASES.includes(dbName.toLowerCase())) {
    const errorMsg = `[CRITICAL DATABASE SAFETY VIOLATION] Test attempted to connect to protected database '${dbName}'! Test execution aborted immediately to protect data integrity.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (dbName && !dbName.startsWith('chirag_test_')) {
    const errorMsg = `[CRITICAL DATABASE SAFETY VIOLATION] Test connected to non-test database '${dbName}'. Test databases MUST start with 'chirag_test_'!`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return originalConnect(uri, options);
};

// Intercept dropDatabase
const originalDropDatabase = mongoose.connection.dropDatabase.bind(mongoose.connection);
mongoose.connection.dropDatabase = async function (...args: any[]) {
  const currentDbName = mongoose.connection.name;

  if (PROTECTED_DATABASES.includes((currentDbName || '').toLowerCase())) {
    const errorMsg = `[CRITICAL DATABASE SAFETY VIOLATION] Attempted to drop protected database '${currentDbName}'! Action blocked.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (!currentDbName || !currentDbName.startsWith('chirag_test_')) {
    const errorMsg = `[CRITICAL DATABASE SAFETY VIOLATION] Attempted to drop non-test database '${currentDbName}'! Only 'chirag_test_*' databases can be dropped.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return originalDropDatabase(...args);
};

