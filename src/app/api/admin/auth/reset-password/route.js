// src/app/api/admin/auth/reset-password/route.js
// Updated to use Power Automate for email sending

import sql from 'mssql';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { emailService } from '@/lib/power-automate-email-service';

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
    const { action, username, email, resetToken, newPassword, confirmPassword } = await req.json();

    if (action === 'generate') {
      // Generate reset token and send email via Power Automate
      if (!username && !email) {
        return new Response(JSON.stringify({ 
          message: 'Username or email is required' 
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const pool = await sql.connect(dbConfig);
      
      // Find admin by username or email
      let query = `
        SELECT id, username, email, full_name FROM AdminUsers 
        WHERE is_active = 1 AND 
      `;
      let searchValue = '';
      
      if (email) {
        query += 'email = @searchValue';
        searchValue = email;
      } else {
        query += 'username = @searchValue';
        searchValue = username;
      }

      const adminResult = await pool.request()
        .input('searchValue', sql.NVarChar, searchValue)
        .query(query);

      if (adminResult.recordset.length === 0) {
        // For security, don't reveal whether user exists or not
        // Always return success to prevent user enumeration
        return new Response(JSON.stringify({ 
          message: 'If an account with that information exists, a password reset email has been sent.',
          sent: true
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const admin = adminResult.recordset[0];

      // Check if admin has email address
      if (!admin.email) {
        return new Response(JSON.stringify({ 
          message: 'No email address associated with this account. Please contact the system administrator.' 
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Generate secure reset token
      const resetTokenValue = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour

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
        .input('resetToken', sql.NVarChar, resetTokenValue)
        .input('expiresAt', sql.DateTime2, expiresAt)
        .query(`
          INSERT INTO AdminPasswordResetTokens (admin_id, reset_token, expires_at)
          VALUES (@adminId, @resetToken, @expiresAt)
        `);

      // Send password reset email via Power Automate
      console.log('📧 Sending password reset email via Power Automate to:', admin.email);
      
      try {
        const emailResult = await emailService.sendPasswordResetEmail(
          admin.email,
          resetTokenValue,
          admin.full_name || admin.username
        );

        if (emailResult.success) {
          console.log('✅ Password reset email sent successfully via Power Automate');
          
          // Log the reset request
          console.log('🔐 Password reset requested:', {
            adminId: admin.id,
            username: admin.username,
            email: admin.email,
            timestamp: new Date().toISOString(),
            provider: 'Power Automate',
            sentAt: emailResult.sentAt
          });

          return new Response(JSON.stringify({
            message: 'Password reset email sent successfully! Please check your email for instructions.',
            sent: true,
            email: admin.email.replace(/(.{2}).*(@.*)/, '$1****$2'), // Partially hide email
            provider: 'Power Automate',
            estimatedDelivery: '1-2 minutes'
          }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          console.error('❌ Failed to send email via Power Automate:', emailResult.error);
          
          // Clean up the token since email failed
          await pool.request()
            .input('resetToken', sql.NVarChar, resetTokenValue)
            .query(`
              UPDATE AdminPasswordResetTokens 
              SET is_used = 1 
              WHERE reset_token = @resetToken
            `);

          return new Response(JSON.stringify({ 
            message: 'Failed to send password reset email. Please try again or contact the system administrator.',
            error: 'Email delivery failed',
            details: emailResult.details,
            troubleshooting: {
              checkPowerAutomate: 'Verify your Power Automate flow is enabled and running',
              checkWebhook: 'Ensure POWER_AUTOMATE_WEBHOOK_URL is configured correctly',
              checkEmail: 'Verify the email address is correct'
            }
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (emailError) {
        console.error('❌ Power Automate email service error:', emailError);
        
        // Clean up the token since email failed
        await pool.request()
          .input('resetToken', sql.NVarChar, resetTokenValue)
          .query(`
            UPDATE AdminPasswordResetTokens 
            SET is_used = 1 
            WHERE reset_token = @resetToken
          `);

        return new Response(JSON.stringify({ 
          message: 'Email service is temporarily unavailable. Please try again later or contact the system administrator.',
          error: 'Power Automate service error',
          details: emailError.message
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

    } else if (action === 'reset') {
      // Reset password with token
      if (!resetToken || !newPassword || !confirmPassword) {
        return new Response(JSON.stringify({ 
          message: 'Reset token and password fields are required' 
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (newPassword !== confirmPassword) {
        return new Response(JSON.stringify({ 
          message: 'Passwords do not match' 
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
      
      // Validate reset token
      const tokenResult = await pool.request()
        .input('resetToken', sql.NVarChar, resetToken)
        .query(`
          SELECT rt.admin_id, rt.expires_at, au.username, au.email, au.full_name
          FROM AdminPasswordResetTokens rt
          INNER JOIN AdminUsers au ON rt.admin_id = au.id
          WHERE rt.reset_token = @resetToken 
            AND rt.is_used = 0 
            AND rt.expires_at > GETDATE()
            AND au.is_active = 1
        `);

      if (tokenResult.recordset.length === 0) {
        return new Response(JSON.stringify({ 
          message: 'Invalid or expired reset token. Please request a new password reset.',
          expired: true
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const token = tokenResult.recordset[0];

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update password in database
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

      // Invalidate all existing sessions for security
      await pool.request()
        .input('adminId', sql.Int, token.admin_id)
        .query(`
          UPDATE AdminSessions 
          SET is_active = 0 
          WHERE admin_id = @adminId
        `);

      // Log successful password reset
      console.log('🔐 Password reset completed successfully:', {
        adminId: token.admin_id,
        username: token.username,
        timestamp: new Date().toISOString(),
        method: 'Power Automate Email'
      });

      return new Response(JSON.stringify({
        message: 'Password reset successfully! You can now log in with your new password.',
        username: token.username,
        success: true,
        redirectTo: '/admin'
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({ 
        message: 'Invalid action. Use "generate" to request reset or "reset" to change password.' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ Password reset error:', error);
    
    return new Response(JSON.stringify({ 
      message: 'Password reset failed. Please try again later or contact the system administrator.',
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}