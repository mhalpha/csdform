import sql from 'mssql';
import { getPool } from '../../../../lib/db';


export async function GET(req, { params }) {
 const { serviceName } = await params;
 try {
       const pool = await getPool(); // { changed code }
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