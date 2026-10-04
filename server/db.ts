import { PrismaClient } from "@prisma/client";

/**
 * LearnX Database
 *
 * Database:
 *   Supabase PostgreSQL
 *
 * ORM:
 *   Prisma 6.19.3
 *
 * Important:
 *   - No SQLite
 *   - No local learnx.db
 *   - No implicit demo users; optional accounts are provisioned by demoAccounts.ts
 *   - No demo sessions
 *   - No automatic session or course test data
 *   - Skills are system/master data and are NOT created here
 *
 * Supabase Authentication remains responsible for:
 *   - email
 *   - password
 *   - email verification
 *   - authentication sessions
 *
 * Prisma is responsible for public application data:
 *   - profiles
 *   - skills
 *   - user_skills
 *   - learning requests
 *   - availability
 *   - matches
 *   - sessions
 *   - Time Credits
 *   - reviews
 *   - reliability
 *   - notifications
 *   - learning progress
 *   - quizzes
 *   - achievements
 *   - certificates
 *   - partners
 *   - reports
 *   - admin data
 */

/**
 * Create one Prisma client.
 *
 * In development, Vite/tsx/nodemon can reload the server multiple times.
 * Storing the client on globalThis prevents unnecessary Prisma connections.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

/**
 * Connect to Supabase PostgreSQL.
 */
export async function initDatabase(): Promise<void> {
  try {
    await db.$connect();

    console.log("✅ Connected to Supabase PostgreSQL");
  } catch (error) {
    console.error("❌ Failed to connect to Supabase PostgreSQL");
    console.error(error);

    throw error;
  }
}

/**
 * Return the shared Prisma client.
 *
 * Existing backend services can import:
 *
 *   import { getPrismaClient } from "./db";
 *
 * and use:
 *
 *   const prisma = getPrismaClient();
 */
export function getPrismaClient(): PrismaClient {
  return db;
}

/**
 * Gracefully disconnect Prisma.
 */
export async function closeDatabase(): Promise<void> {
  try {
    await db.$disconnect();
    console.log("✅ Prisma disconnected");
  } catch (error) {
    console.error("❌ Error while disconnecting Prisma");
    console.error(error);
  }
}

/**
 * Health check for the database connection.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;

    return true;
  } catch (error) {
    console.error("❌ Database health check failed");
    console.error(error);

    return false;
  }
}

/**
 * Get basic database information.
 *
 * This does not modify any data.
 */
export async function getDatabaseInfo(): Promise<{
  connected: boolean;
  database: string;
  provider: string;
}> {
  try {
    await db.$queryRaw`SELECT 1`;

    return {
      connected: true,
      database: "Supabase PostgreSQL",
      provider: "PostgreSQL",
    };
  } catch {
    return {
      connected: false,
      database: "Supabase PostgreSQL",
      provider: "PostgreSQL",
    };
  }
}

/**
 * Application shutdown handlers.
 */
async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received. Closing database connection...`);

  await closeDatabase();

  process.exit(0);
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});