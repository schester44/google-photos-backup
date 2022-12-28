import fs from 'fs/promises';
import path from 'node:path';

type DBConfig = {
  filePath: string;
};

class Database {
  private data: any;
  private config: DBConfig;

  constructor(config: DBConfig) {
    this.config = config;

    this.data = {};
  }

  public get(key: string) {
    return this.data[key];
  }

  public set(key: string, value: any) {
    this.data[key] = value;
  }

  public async save() {
    await fs.writeFile(
      this.config.filePath,
      JSON.stringify(this.data, null, 2)
    );

    return true;
  }

  public async load() {
    try {
      this.data = JSON.parse(await fs.readFile(this.config.filePath, 'utf8'));
    } catch (e) {
      this.data = {};
    }
  }
}

let cachedDb: { db: Database };

export async function getDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  const db = new Database({
    filePath: path.resolve(__dirname, './config/db.json'),
  });

  await db.load();

  cachedDb = { db };

  return cachedDb;
}
