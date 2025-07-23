import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';

const config = {
    user: 'nhf_azure',
    password: '29{w{u4637b7CdWK',
    server: 'nhfdev.database.windows.net',
    database: 'Cardiac-Services-Directory-New-Form_NewVersion',
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
};

export async function GET() {
    let pool: sql.ConnectionPool | undefined;
    
    try {
        pool = new sql.ConnectionPool(config);
        await pool.connect();
        
        const result = await pool.request().query`SELECT * FROM [dbo].[CardiacServices]`; 
        return NextResponse.json(result.recordset);
    } catch (err: any) {
        console.error('Database error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}