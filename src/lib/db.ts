/**
 * MySQL connection pool for the web application.
 *
 * Database security setup (run once as a privileged MySQL user):
 *
 *   CREATE USER 'web_register'@'localhost' IDENTIFIED BY '<strong-password>';
 *   GRANT EXECUTE ON PROCEDURE account.sp_create_player_account
 *     TO 'web_register'@'localhost';
 *   FLUSH PRIVILEGES;
 *
 * Verify: SHOW GRANTS FOR 'web_register'@'localhost';
 * Expected: GRANT EXECUTE ON PROCEDURE `account`.`sp_create_player_account` TO ...
 */
import { createPool, type Pool } from "mysql2/promise";

let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    _pool = createPool({
      host: process.env.DB_HOST ?? "127.0.0.1",
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
    });
  }
  return _pool;
}

export async function query<T = unknown>(
  sql: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any[],
): Promise<T> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T;
}
