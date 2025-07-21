// src/app/api/admin/auth/validate/route.js
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

export async function GET(req) {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('admin_session')?.value;

    if (!sessionToken) {
      return new Response(JSON.stringify({ 
        valid: false, 
        message: 'No session token' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const pool = await sql.connect(dbConfig);
    
    const result = await pool.request()
      .input('sessionToken', sql.NVarChar, sessionToken)
      .query(`
        SELECT s.admin_id, s.expires_at, a.username, a.email, a.full_name, a.is_active
        FROM AdminSessions s
        INNER JOIN AdminUsers a ON s.admin_id = a.id
        WHERE s.session_token = @sessionToken 
          AND s.is_active = 1 
          AND s.expires_at > GETDATE()
          AND a.is_active = 1
      `);

    if (result.recordset.length === 0) {
      const response = new Response(JSON.stringify({ 
        valid: false, 
        message: 'Invalid or expired session' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });

      // Clear invalid session cookie
      response.headers.set('Set-Cookie', 
        'admin_session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
      );

      return response;
    }

    const session = result.recordset[0];

    // Update last accessed time
    await pool.request()
      .input('sessionToken', sql.NVarChar, sessionToken)
      .query(`
        UPDATE AdminSessions 
        SET last_accessed = GETDATE()
        WHERE session_token = @sessionToken
      `);

    return new Response(JSON.stringify({
      valid: true,
      admin: {
        id: session.admin_id,
        username: session.username,
        email: session.email,
        fullName: session.full_name
      }
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Session validation error:', error);
    return new Response(JSON.stringify({ 
      valid: false, 
      message: 'Session validation failed',
      error: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}