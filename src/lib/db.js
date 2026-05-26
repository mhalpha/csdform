import sql from 'mssql';

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

let poolPromise = null;

export function getPool() {
  if (poolPromise) return poolPromise;
  poolPromise = (async () => {
    const pool = await new sql.ConnectionPool(dbConfig).connect();
    pool.on('error', (err) => {
      console.error('MSSQL pool error -- resetting poolPromise', err);
      poolPromise = null;
    });
    return pool;
  })();
  return poolPromise;
}