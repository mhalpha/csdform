// src/app/api/admin/auth/login/route.js
import sql from 'mssql';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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
    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ 
        message: 'Username and password are required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const pool = await sql.connect(dbConfig);
    
    // Find admin by username
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query(`
        SELECT id, username, password_hash, email, full_name, is_active
        FROM AdminUsers 
        WHERE username = @username AND is_active = 1
      `);

    if (result.recordset.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'Invalid credentials' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const admin = result.recordset[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    if (!isValidPassword) {
      return new Response(JSON.stringify({ 
        message: 'Invalid credentials' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update last login
    await pool.request()
      .input('adminId', sql.Int, admin.id)
      .query(`
        UPDATE AdminUsers 
        SET last_login = GETDATE(), updated_at = GETDATE()
        WHERE id = @adminId
      `);

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours

    await pool.request()
      .input('sessionToken', sql.NVarChar, sessionToken)
      .input('adminId', sql.Int, admin.id)
      .input('expiresAt', sql.DateTime2, expiresAt)
      .query(`
        INSERT INTO AdminSessions (session_token, admin_id, expires_at)
        VALUES (@sessionToken, @adminId, @expiresAt)
      `);

    // Create response
    const response = new Response(JSON.stringify({
      message: 'Login successful',
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        fullName: admin.full_name
      }
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    // Set secure cookie with session token
    response.headers.set('Set-Cookie', 
      `admin_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}; Path=/`
    );

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ 
      message: 'Login failed',
      error: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}