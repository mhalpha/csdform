// src/app/api/admin/test-email/route.js
import { emailService } from '@/lib/power-automate-email-service';
import { cookies } from 'next/headers';
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

// Authentication check
async function checkAuth(req) {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('admin_session')?.value;
    
    if (sessionToken) {
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

      if (result.recordset.length > 0) {
        return { valid: true, admin: result.recordset[0] };
      }
    }

    return { valid: false };
  } catch (error) {
    console.error('Auth check error:', error);
    return { valid: false };
  }
}

export async function POST(req) {
  // Check authentication
  const authResult = await checkAuth(req);
  
  if (!authResult.valid) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { testEmail } = await req.json();

    if (!testEmail) {
      return new Response(JSON.stringify({ 
        message: 'Test email address is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return new Response(JSON.stringify({ 
        message: 'Please provide a valid email address' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🧪 Testing Power Automate email service with:', testEmail);

    // Test the configuration first
    const configStatus = await emailService.validateConfiguration();
    if (!configStatus.valid) {
      return new Response(JSON.stringify({
        message: 'Power Automate email service not configured properly',
        error: configStatus.error,
        instructions: configStatus.instructions,
        troubleshooting: {
          step1: 'Create Power Automate flow with HTTP trigger',
          step2: 'Add Office 365 Outlook "Send an email" action',
          step3: 'Copy the HTTP trigger URL to POWER_AUTOMATE_WEBHOOK_URL',
          step4: 'Ensure the flow is turned ON in Power Automate'
        }
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Send test email via Power Automate
    const result = await emailService.sendTestEmail(testEmail);

    if (result.success) {
      console.log('✅ Test email sent successfully via Power Automate');
      
      return new Response(JSON.stringify({
        message: 'Test email sent successfully via Power Automate! Check your inbox.',
        details: {
          provider: result.provider,
          sentTo: result.sentTo,
          sentAt: result.sentAt,
          testToken: result.testToken,
          estimatedDelivery: '1-2 minutes'
        },
        nextSteps: {
          checkInbox: 'Check your email inbox (and spam folder)',
          testResetLink: 'The email contains a test reset link you can click',
          verifyFlow: 'Verify your Power Automate flow shows successful run'
        }
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      console.error('❌ Test email failed via Power Automate:', result.error);
      
      return new Response(JSON.stringify({
        message: 'Failed to send test email via Power Automate',
        error: result.error,
        details: result.details,
        troubleshooting: {
          checkFlow: 'Verify your Power Automate flow is enabled and running',
          checkUrl: 'Ensure POWER_AUTOMATE_WEBHOOK_URL is correct',
          checkTrigger: 'Verify HTTP trigger accepts POST requests',
          checkEmail: 'Ensure Office 365 email action is configured correctly',
          testManually: 'Test the flow manually in Power Automate portal',
          checkLogs: 'Check Power Automate run history for errors'
        }
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ Test email API error:', error);
    
    let errorMessage = 'Power Automate email service error';
    let troubleshooting = {};

    if (error.message.includes('POWER_AUTOMATE_WEBHOOK_URL')) {
      errorMessage = 'Power Automate webhook URL not configured';
      troubleshooting = {
        step1: 'Add POWER_AUTOMATE_WEBHOOK_URL to your .env.local file',
        step2: 'Get the URL from Power Automate flow HTTP trigger',
        step3: 'Restart your development server',
        step4: 'Ensure the Power Automate flow is turned ON'
      };
    } else if (error.message.includes('fetch')) {
      errorMessage = 'Network error connecting to Power Automate';
      troubleshooting = {
        checkInternet: 'Verify internet connection',
        checkUrl: 'Ensure webhook URL is correct',
        checkFlow: 'Verify Power Automate flow is running',
        checkFirewall: 'Check if firewall is blocking requests'
      };
    }
    
    return new Response(JSON.stringify({ 
      message: errorMessage,
      error: error.message,
      troubleshooting
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(req) {
  // Check authentication
  const authResult = await checkAuth(req);
  
  if (!authResult.valid) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get Power Automate email service status
    const serviceStatus = await emailService.getServiceStatus();
    
    return new Response(JSON.stringify({
      service: 'Power Automate Email',
      status: serviceStatus,
      environment: {
        webhookConfigured: !!process.env.POWER_AUTOMATE_WEBHOOK_URL,
        appUrlConfigured: !!process.env.NEXT_PUBLIC_APP_URL,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'Not configured',
        webhookUrl: process.env.POWER_AUTOMATE_WEBHOOK_URL ? 
          process.env.POWER_AUTOMATE_WEBHOOK_URL.substring(0, 50) + '...' : 
          'Not configured'
      },
      instructions: {
        setup: 'Create Power Automate flow with HTTP trigger and Office 365 email action',
        test: 'POST to this endpoint with { "testEmail": "your@email.com" }',
        webhook: 'Copy HTTP trigger URL to POWER_AUTOMATE_WEBHOOK_URL environment variable',
        production: 'Set NEXT_PUBLIC_APP_URL for correct reset links'
      },
      advantages: {
        cost: 'Free (750 runs/month with Power Automate)',
        integration: 'Uses existing Office 365 infrastructure',
        reliability: 'Microsoft enterprise email delivery',
        maintenance: 'No API keys to manage',
        monitoring: 'Built-in Power Automate monitoring'
      }
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      message: 'Failed to get Power Automate email service status',
      error: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}