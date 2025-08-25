import * as sql from "mssql";

export const sqlConfig: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST as string,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
  },
};

export class DatabaseService {
  private pool: sql.ConnectionPool | null = null;

  async connect(): Promise<sql.ConnectionPool> {
    if (this.pool) {
      return this.pool;
    }

    this.pool = new sql.ConnectionPool(sqlConfig);
    await this.pool.connect();
    return this.pool;
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  async executeStoredProcedure(
    procedureName: string,
    parameters: Record<string, any>
  ): Promise<sql.IResult<any>> {
    const pool = await this.connect();
    const request = new sql.Request(pool);

    for (const [key, value] of Object.entries(parameters)) {
      request.input(key, value);
    }

    return await request.execute(procedureName);
  }
}

export const databaseService = new DatabaseService();
