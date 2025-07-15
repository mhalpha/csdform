import sql from 'mssql';
 
const dbConfig = {
  user: 'nhf_azure',
  password: '29{w{u4637b7CdWK',
  server: 'nhfdev.database.windows.net',
  database: 'Cardiac-Services-Directory-New-Form_NewVersion',
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

export async function GET(req, { params }) {
 const { serviceName } = await params;
 try {
   const pool = await sql.connect(dbConfig);
   const decodedServiceName = decodeURIComponent(serviceName);
   const result = await pool.request()
     .input('serviceName', sql.NVarChar, decodedServiceName)
     .query(`
       SELECT id FROM CardiacServices
       WHERE LOWER(LTRIM(RTRIM(service_name))) = LOWER(LTRIM(RTRIM(@serviceName))) AND is_active = 1
     `);
   if (result.recordset.length === 0) {
     return new Response(JSON.stringify({ message: 'Service not found' }), { status: 404 });
   }
   return new Response(JSON.stringify({ exists: true }), { status: 200 });
 } catch (err) {
   return new Response(JSON.stringify({ message: 'Error' }), { status: 500 });
 }
}