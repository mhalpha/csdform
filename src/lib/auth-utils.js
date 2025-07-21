// lib/auth-utils.js
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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

export class AdminAuthService {
  constructor() {
    this.saltRounds = 12;
    this.sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
    this.resetTokenDuration = 60 * 60 * 1000; // 1 hour
  }

  // Hash password
  async hashPassword(password) {
    return await bcrypt.hash(password, this.saltRounds);
  }

  // Verify password
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Generate secure random token
  generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Authenticate admin user
  async authenticateAdmin(username, password) {
    try {
      const pool = await sql.connect(dbConfig);
      
      const result = await pool.request()
        .input('username', sql.NVarChar, username)
        .query(`
          SELECT id, username, password_hash, email, full_name, is_active
          FROM AdminUsers 
          WHERE username = @username AND is_active = 1
        `);

      if (result.recordset.length === 0) {
        return { success: false, message: 'Invalid credentials' };
      }

      const admin = result.recordset[0];
      const isValidPassword = await this.verifyPassword(password, admin.password_hash);

      if (!isValidPassword) {
        return { success: false, message: 'Invalid credentials' };
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
      const sessionToken = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + this.sessionDuration);

      await pool.request()
        .input('sessionToken', sql.NVarChar, sessionToken)
        .input('adminId', sql.Int, admin.id)
        .input('expiresAt', sql.DateTime2, expiresAt)
        .query(`
          INSERT INTO AdminSessions (session_token, admin_id, expires_at)
          VALUES (@sessionToken, @adminId, @expiresAt)
        `);

      return {
        success: true,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          fullName: admin.full_name
        },
        sessionToken
      };

    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, message: 'Authentication failed' };
    }
  }

  // Validate session token
  async validateSession(sessionToken) {
    try {
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
        return { valid: false, message: 'Invalid or expired session' };
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

      return {
        valid: true,
        admin: {
          id: session.admin_id,
          username: session.username,
          email: session.email,
          fullName: session.full_name
        }
      };

    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false, message: 'Session validation failed' };
    }
  }

  // Change password
  async changePassword(adminId, currentPassword, newPassword) {
    try {
      const pool = await sql.connect(dbConfig);
      
      // Get current password hash
      const result = await pool.request()
        .input('adminId', sql.Int, adminId)
        .query(`
          SELECT password_hash FROM AdminUsers 
          WHERE id = @adminId AND is_active = 1
        `);

      if (result.recordset.length === 0) {
        return { success: false, message: 'Admin not found' };
      }

      const currentHash = result.recordset[0].password_hash;
      const isValidCurrentPassword = await this.verifyPassword(currentPassword, currentHash);

      if (!isValidCurrentPassword) {
        return { success: false, message: 'Current password is incorrect' };
      }

      // Validate new password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return { success: false, message: passwordValidation.message };
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password
      await pool.request()
        .input('adminId', sql.Int, adminId)
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
        .input('adminId', sql.Int, adminId)
        .query(`
          UPDATE AdminSessions 
          SET is_active = 0 
          WHERE admin_id = @adminId
        `);

      return { success: true, message: 'Password changed successfully' };

    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, message: 'Failed to change password' };
    }
  }

  // Validate password strength
  validatePasswordStrength(password) {
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

  // Generate password reset token
  async generatePasswordResetToken(username) {
    try {
      const pool = await sql.connect(dbConfig);
      
      // Find admin by username
      const adminResult = await pool.request()
        .input('username', sql.NVarChar, username)
        .query(`
          SELECT id, email FROM AdminUsers 
          WHERE username = @username AND is_active = 1
        `);

      if (adminResult.recordset.length === 0) {
        return { success: false, message: 'Admin not found' };
      }

      const admin = adminResult.recordset[0];
      const resetToken = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + this.resetTokenDuration);

      // Invalidate any existing reset tokens for this admin
      await pool.request()
        .input('adminId', sql.Int, admin.id)
        .query(`
          UPDATE AdminPasswordResetTokens 
          SET is_used = 1 
          WHERE admin_id = @adminId AND is_used = 0
        `);

      // Create new reset token
      await pool.request()
        .input('adminId', sql.Int, admin.id)
        .input('resetToken', sql.NVarChar, resetToken)
        .input('expiresAt', sql.DateTime2, expiresAt)
        .query(`
          INSERT INTO AdminPasswordResetTokens (admin_id, reset_token, expires_at)
          VALUES (@adminId, @resetToken, @expiresAt)
        `);

      return {
        success: true,
        resetToken,
        email: admin.email,
        message: 'Password reset token generated'
      };

    } catch (error) {
      console.error('Password reset token generation error:', error);
      return { success: false, message: 'Failed to generate reset token' };
    }
  }

  // Reset password with token
  async resetPasswordWithToken(resetToken, newPassword) {
    try {
      const pool = await sql.connect(dbConfig);
      
      // Validate reset token
      const tokenResult = await pool.request()
        .input('resetToken', sql.NVarChar, resetToken)
        .query(`
          SELECT admin_id, expires_at 
          FROM AdminPasswordResetTokens 
          WHERE reset_token = @resetToken 
            AND is_used = 0 
            AND expires_at > GETDATE()
        `);

      if (tokenResult.recordset.length === 0) {
        return { success: false, message: 'Invalid or expired reset token' };
      }

      const token = tokenResult.recordset[0];

      // Validate new password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return { success: false, message: passwordValidation.message };
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password
      await pool.request()
        .input('adminId', sql.Int, token.admin_id)
        .input('passwordHash', sql.NVarChar, newPasswordHash)
        .query(`
          UPDATE AdminUsers 
          SET password_hash = @passwordHash, 
              password_changed_at = GETDATE(),
              updated_at = GETDATE()
          WHERE id = @adminId
        `);

      // Mark reset token as used
      await pool.request()
        .input('resetToken', sql.NVarChar, resetToken)
        .query(`
          UPDATE AdminPasswordResetTokens 
          SET is_used = 1, used_at = GETDATE()
          WHERE reset_token = @resetToken
        `);

      // Invalidate all existing sessions for this admin
      await pool.request()
        .input('adminId', sql.Int, token.admin_id)
        .query(`
          UPDATE AdminSessions 
          SET is_active = 0 
          WHERE admin_id = @adminId
        `);

      return { success: true, message: 'Password reset successfully' };

    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, message: 'Failed to reset password' };
    }
  }

  // Logout (invalidate session)
  async logout(sessionToken) {
    try {
      const pool = await sql.connect(dbConfig);
      
      await pool.request()
        .input('sessionToken', sql.NVarChar, sessionToken)
        .query(`
          UPDATE AdminSessions 
          SET is_active = 0 
          WHERE session_token = @sessionToken
        `);

      return { success: true, message: 'Logged out successfully' };

    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Logout failed' };
    }
  }

  // Clean up expired sessions and tokens (should be run periodically)
  async cleanupExpiredData() {
    try {
      const pool = await sql.connect(dbConfig);
      
      // Clean up expired sessions
      await pool.request().query(`
        DELETE FROM AdminSessions 
        WHERE expires_at < GETDATE() OR is_active = 0
      `);

      // Clean up expired reset tokens
      await pool.request().query(`
        DELETE FROM AdminPasswordResetTokens 
        WHERE expires_at < GETDATE() OR is_used = 1
      `);

      return { success: true, message: 'Expired data cleaned up' };

    } catch (error) {
      console.error('Cleanup error:', error);
      return { success: false, message: 'Cleanup failed' };
    }
  }
}

export const adminAuthService = new AdminAuthService();