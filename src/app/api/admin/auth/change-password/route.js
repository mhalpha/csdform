// src/app/api/admin/auth/change-password/route.js
import sql from 'mssql';
import bcrypt from 'bcryptjs';
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

// Validate session function
async function validateSession(sessionToken) {
  if (!sessionToken) return { valid: false };
  
  try {
    const pool = await sql.connect(dbConfig);
    
    const result = await pool.request()
      .input('sessionToken', sql.NVarChar, sessionToken)
      .query(`
        SELECT s.admin_id, a.username, a.email, a.full_name
        FROM AdminSessions s
        INNER JOIN AdminUsers a ON s.admin_id = a.id
        WHERE s.session_token = @sessionToken 
          AND s.is_active = 1 
          AND s.expires_at > GETDATE()
          AND a.is_active = 1
      `);

    if (result.recordset.length === 0) {
      return { valid: false };
    }

    return {
      valid: true,
      admin: {
        id: result.recordset[0].admin_id,
        username: result.recordset[0].username,
        email: result.recordset[0].email,
        fullName: result.recordset[0].full_name
      }
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false };
  }
}

// Validate password strength
function validatePasswordStrength(password) {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (@$!%*?&)' };
  }
  return { valid: true, message: 'Password is strong' };
}

export async function POST(req) {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('admin_session')?.value;

    if (!sessionToken) {
      return new Response(JSON.stringify({ 
        message: 'Authentication required' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate session
    const sessionResult = await validateSession(sessionToken);
    if (!sessionResult.valid) {
      return new Response(JSON.stringify({ 
        message: 'Invalid session' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { currentPassword, newPassword, confirmPassword } = await req.json();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return new Response(JSON.stringify({ 
        message: 'All password fields are required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (newPassword !== confirmPassword) {
      return new Response(JSON.stringify({ 
        message: 'New passwords do not match' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return new Response(JSON.stringify({ 
        message: passwordValidation.message 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const pool = await sql.connect(dbConfig);
    
    // Get current password hash
    const result = await pool.request()
      .input('adminId', sql.Int, sessionResult.admin.id)
      .query(`
        SELECT password_hash FROM AdminUsers 
        WHERE id = @adminId AND is_active = 1
      `);

    if (result.recordset.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'Admin not found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const currentHash = result.recordset[0].password_hash;
    const isValidCurrentPassword = await bcrypt.compare(currentPassword, currentHash);

    if (!isValidCurrentPassword) {
      return new Response(JSON.stringify({ 
        message: 'Current password is incorrect' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.request()
      .input('adminId', sql.Int, sessionResult.admin.id)
      .input('passwordHash', sql.NVarChar, newPasswordHash)
      .query(`
        UPDATE AdminUsers 
        SET password_hash = @passwordHash, 
            password_changed_at = GETDATE(),
            updated_at = GETDATE()
        WHERE id = @adminId
      `);

    // Invalidate all existing sessions for this admin (force re-login)
    await pool.request()
      .input('adminId', sql.Int, sessionResult.admin.id)
      .query(`
        UPDATE AdminSessions 
        SET is_active = 0 
        WHERE admin_id = @adminId
      `);

    // Clear session cookie since all sessions are invalidated
    const response = new Response(JSON.stringify({
      message: 'Password changed successfully',
      requireLogin: true
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    response.headers.set('Set-Cookie', 
      'admin_session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
    );

    return response;

  } catch (error) {
    console.error('Password change error:', error);
    return new Response(JSON.stringify({ 
      message: 'Password change failed',
      error: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}