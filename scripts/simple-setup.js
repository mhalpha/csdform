// scripts/simple-setup.js
// Run this once to set up the authentication system: node scripts/simple-setup.js

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

async function setupAuth() {
  console.log('🚀 Setting up admin authentication...');

  try {
    const pool = await sql.connect(dbConfig);

    // Create AdminUsers table
    console.log('📋 Creating AdminUsers table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AdminUsers' AND xtype='U')
      CREATE TABLE AdminUsers (
          id INT IDENTITY(1,1) PRIMARY KEY,
          username NVARCHAR(50) NOT NULL UNIQUE,
          password_hash NVARCHAR(255) NOT NULL,
          email NVARCHAR(255),
          full_name NVARCHAR(100),
          is_active BIT DEFAULT 1,
          last_login DATETIME2,
          password_changed_at DATETIME2 DEFAULT GETDATE(),
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
      );
    `);

    // Create AdminSessions table
    console.log('📋 Creating AdminSessions table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AdminSessions' AND xtype='U')
      CREATE TABLE AdminSessions (
          id INT IDENTITY(1,1) PRIMARY KEY,
          session_token NVARCHAR(255) NOT NULL UNIQUE,
          admin_id INT NOT NULL,
          created_at DATETIME2 DEFAULT GETDATE(),
          expires_at DATETIME2 NOT NULL,
          last_accessed DATETIME2 DEFAULT GETDATE(),
          ip_address NVARCHAR(45),
          user_agent NVARCHAR(500),
          is_active BIT DEFAULT 1,
          FOREIGN KEY (admin_id) REFERENCES AdminUsers(id)
      );
    `);

    // Create AdminPasswordResetTokens table
    console.log('📋 Creating AdminPasswordResetTokens table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AdminPasswordResetTokens' AND xtype='U')
      CREATE TABLE AdminPasswordResetTokens (
          id INT IDENTITY(1,1) PRIMARY KEY,
          admin_id INT NOT NULL,
          reset_token NVARCHAR(255) NOT NULL UNIQUE,
          created_at DATETIME2 DEFAULT GETDATE(),
          expires_at DATETIME2 NOT NULL,
          used_at DATETIME2 NULL,
          is_used BIT DEFAULT 0,
          FOREIGN KEY (admin_id) REFERENCES AdminUsers(id)
      );
    `);

    // Check if default admin exists
    const existingAdmin = await pool.request()
      .input('username', sql.NVarChar, 'admin')
      .query('SELECT id FROM AdminUsers WHERE username = @username');

    if (existingAdmin.recordset.length === 0) {
      console.log('👤 Creating default admin user...');
      
      const defaultPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);

      await pool.request()
        .input('username', sql.NVarChar, 'admin')
        .input('passwordHash', sql.NVarChar, hashedPassword)
        .input('email', sql.NVarChar, 'admin@example.com')
        .input('fullName', sql.NVarChar, 'System Administrator')
        .query(`
          INSERT INTO AdminUsers (username, password_hash, email, full_name) 
          VALUES (@username, @passwordHash, @email, @fullName)
        `);

      console.log('✅ Default admin user created');
      console.log('');
      console.log('🔐 DEFAULT CREDENTIALS:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('');
      console.log('⚠️  IMPORTANT: Change this password immediately!');
    } else {
      console.log('ℹ️  Default admin user already exists');
    }

    // Add verification columns if they don't exist
    console.log('📋 Adding verification columns to CardiacServices...');
    
    const columns = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'CardiacServices'
    `);

    const existingColumns = columns.recordset.map(row => row.COLUMN_NAME);

    if (!existingColumns.includes('provider_certification_submitted')) {
      await pool.request().query(`ALTER TABLE CardiacServices ADD provider_certification_submitted BIT DEFAULT 0`);
      console.log('✅ Added provider_certification_submitted');
    }

    if (!existingColumns.includes('provider_certification_verified')) {
      await pool.request().query(`ALTER TABLE CardiacServices ADD provider_certification_verified BIT DEFAULT 0`);
      console.log('✅ Added provider_certification_verified');
    }

    if (!existingColumns.includes('certificate_file_url')) {
      await pool.request().query(`ALTER TABLE CardiacServices ADD certificate_file_url NVARCHAR(500)`);
      console.log('✅ Added certificate_file_url');
    }

    if (!existingColumns.includes('verification_status')) {
      await pool.request().query(`ALTER TABLE CardiacServices ADD verification_status NVARCHAR(20)`);
      console.log('✅ Added verification_status');
    }

    if (!existingColumns.includes('verification_notes')) {
      await pool.request().query(`ALTER TABLE CardiacServices ADD verification_notes NVARCHAR(1000)`);
      console.log('✅ Added verification_notes');
    }

    if (!existingColumns.includes('verified_at')) {
      await pool.request().query(`ALTER TABLE CardiacServices ADD verified_at DATETIME2`);
      console.log('✅ Added verified_at');
    }

    if (!existingColumns.includes('verified_by')) {
      await pool.request().query(`ALTER TABLE CardiacServices ADD verified_by NVARCHAR(100)`);
      console.log('✅ Added verified_by');
    }

    console.log('');
    console.log('🎉 Setup completed successfully!');
    console.log('You can now use the admin dashboard with authentication.');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupAuth();