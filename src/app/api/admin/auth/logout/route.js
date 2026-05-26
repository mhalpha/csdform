// src/app/api/admin/auth/logout/route.js
import sql from 'mssql';
import { cookies } from 'next/headers';
import { getPool } from '../../../../../lib/db';

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session')?.value;

    if (sessionToken) {
      const pool = await getPool();
      
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