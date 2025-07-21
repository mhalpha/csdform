// src/app/api/admin/auth/logout/route.js
import sql from 'mssql';
import { cookies } from 'next/headers';

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

export async function POST(req) {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('admin_session')?.value;

    if (sessionToken) {
      const pool = await sql.connect(dbConfig);
      
      await pool.request()
        .input('sessionToken', sql.NVarChar, sessionToken)
        .query(`
          UPDATE AdminSessions 
          SET is_active = 0 
          WHERE session_token = @sessionToken
        `);
    }

    const response = new Response(JSON.stringify({
      message: 'Logged out successfully'
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    // Clear the session cookie
    response.headers.set('Set-Cookie', 
      'admin_session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
    );

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ 
      message: 'Logout failed',
      error: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}