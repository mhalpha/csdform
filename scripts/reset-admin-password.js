// scripts/reset-admin-password.js
// Run this to reset the admin password to a known value

import sql from 'mssql';
import bcrypt from 'bcryptjs';

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

async function resetAdminPassword() {
  console.log('🔐 Resetting admin password...');

  try {
    const pool = await sql.connect(dbConfig);
    
    // The new password you want to set
    const newPassword = 'admin123';
    
    console.log('📝 Hashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    console.log('🔍 New password hash:', hashedPassword);
    
    // Update the admin user's password
    const result = await pool.request()
      .input('username', sql.NVarChar, 'admin')
      .input('passwordHash', sql.NVarChar, hashedPassword)
      .query(`
        UPDATE AdminUsers 
        SET password_hash = @passwordHash,
            password_changed_at = GETDATE(),
            updated_at = GETDATE()
        WHERE username = @username
      `);
    
    if (result.rowsAffected[0] > 0) {
      console.log('✅ Password reset successfully!');
      console.log('');
      console.log('🔑 NEW CREDENTIALS:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('');
      console.log('🧪 Testing password verification...');
      
      // Test the password verification
      const testResult = await bcrypt.compare(newPassword, hashedPassword);
      console.log('✅ Password verification test:', testResult ? 'PASSED' : 'FAILED');
      
      // Also test with the old hash from your database
      const oldHash = '$2b$12$LQv3c1yqBwEHXkwsOmnSwO3nqqvZ7I6z5jtjXwEe.9EaKh5cZbgMC';
      const oldTest = await bcrypt.compare('admin123', oldHash);
      console.log('🔍 Old hash test with admin123:', oldTest ? 'PASSED' : 'FAILED');
      
      // Try some other common passwords with the old hash
      const commonPasswords = ['admin', 'password', 'admin123', 'Administrator'];
      console.log('🔍 Testing old hash with common passwords:');
      for (const pwd of commonPasswords) {
        const testOld = await bcrypt.compare(pwd, oldHash);
        console.log(`   "${pwd}": ${testOld ? 'MATCH' : 'no match'}`);
      }
      
    } else {
      console.log('❌ No admin user found to update');
    }
    
  } catch (error) {
    console.error('❌ Password reset failed:', error);
  }
}

resetAdminPassword();