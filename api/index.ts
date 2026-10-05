import app from '../server/app.ts';
import { initDatabase } from '../server/db.ts';
let databaseReady: Promise<void> | null = null;
export default async function handler(req: any, res: any) {
  databaseReady ??= initDatabase();
  await databaseReady;
  return app(req, res);
}
