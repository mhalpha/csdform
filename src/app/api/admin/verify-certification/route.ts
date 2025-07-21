// /api/admin/verify-certification/route.ts
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

// Updated authentication to check session from cookie header
async function checkAuth(request: Request): Promise<{ valid: boolean; adminUsername?: string }> {
  try {
    // Extract session token from cookie header
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      console.log('❌ No cookie header found');
      return { valid: false };
    }

    // Parse the admin_session cookie
    const sessionMatch = cookieHeader.match(/admin_session=([^;]+)/);
    if (!sessionMatch) {
      console.log('❌ No admin_session cookie found');
      return { valid: false };
    }

    const sessionToken = sessionMatch[1];
    console.log('🔍 Found session token');

    const pool = await sql.connect(dbConfig);
    
    const result = await pool.request()
      .input('sessionToken', sql.NVarChar, sessionToken)
      .query(`
        SELECT s.admin_id, a.username
        FROM AdminSessions s
        INNER JOIN AdminUsers a ON s.admin_id = a.id
        WHERE s.session_token = @sessionToken 
          AND s.is_active = 1 
          AND s.expires_at > GETDATE()
          AND a.is_active = 1
      `);

    if (result.recordset.length === 0) {
      console.log('❌ Invalid or expired session');
      return { valid: false };
    }

    console.log('✅ Session validated for admin:', result.recordset[0].username);
    return { 
      valid: true, 
      adminUsername: result.recordset[0].username 
    };
    
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false };
  }
}

export async function POST(req: Request) {
  // Check authentication using session cookies
  const authResult = await checkAuth(req);
  if (!authResult.valid) {
    console.log('❌ Authentication failed for verification request');
    return new Response(JSON.stringify({ 
      message: 'Unauthorized - Please log in again',
      requireLogin: true 
    }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { serviceId, action, notes } = await req.json();

    // Validate input
    if (!serviceId || !action) {
      return new Response(JSON.stringify({ 
        message: 'Service ID and action are required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!['verify', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ 
        message: 'Action must be either "verify" or "reject"' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const pool = await sql.connect(dbConfig);

    // First, check if the service exists and has submitted provider certification
    const checkQuery = `
      SELECT 
        id, 
        service_name, 
        provider_certification_submitted,
        verification_status,
        certificate_file_url
      FROM CardiacServices 
      WHERE id = @serviceId AND is_active = 1
    `;

    const checkResult = await pool.request()
      .input('serviceId', sql.Int, serviceId)
      .query(checkQuery);

    if (checkResult.recordset.length === 0) {
      console.log('❌ Service not found:', serviceId);
      return new Response(JSON.stringify({ 
        message: 'Service not found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const service = checkResult.recordset[0];

    if (!service.provider_certification_submitted) {
      console.log('❌ Service has not submitted certification:', serviceId);
      return new Response(JSON.stringify({ 
        message: 'Service has not submitted provider certification' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Updating verification for service:', {
      serviceId,
      serviceName: service.service_name,
      currentStatus: service.verification_status,
      newAction: action,
      admin: authResult.adminUsername
    });

    // Update the verification status
    const updateQuery = `
      UPDATE CardiacServices
      SET
        provider_certification_verified = @verified,
        provider_certification = @providerCertification,
        verification_status = @verificationStatus,
        verification_notes = @verificationNotes,
        verified_at = GETDATE(),
        verified_by = @verifiedBy,
        updated_at = GETDATE()
      WHERE id = @serviceId AND is_active = 1
    `;

    const isVerified = action === 'verify';
    const verificationStatus = action === 'verify' ? 'verified' : 'rejected';

    const updateResult = await pool.request()
      .input('serviceId', sql.Int, serviceId)
      .input('verified', sql.Bit, isVerified)
      .input('providerCertification', sql.Bit, isVerified)
      .input('verificationStatus', sql.NVarChar, verificationStatus)
      .input('verificationNotes', sql.NVarChar, notes || null)
      .input('verifiedBy', sql.NVarChar, authResult.adminUsername || 'admin')
      .query(updateQuery);

    console.log('📊 Update result:', {
      rowsAffected: updateResult.rowsAffected[0],
      serviceId,
      newStatus: verificationStatus
    });

    if (updateResult.rowsAffected[0] === 0) {
      console.log('❌ No rows updated for service:', serviceId);
      return new Response(JSON.stringify({ 
        message: 'Failed to update verification status - service may have been deleted or modified',
        success: false
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify the update by querying the service again
    const verifyUpdateResult = await pool.request()
      .input('serviceId', sql.Int, serviceId)
      .query(`
        SELECT verification_status, provider_certification_verified, provider_certification
        FROM CardiacServices 
        WHERE id = @serviceId
      `);

    const updatedService = verifyUpdateResult.recordset[0];
    console.log('✅ Database update confirmed:', {
      serviceId,
      finalStatus: updatedService.verification_status,
      certified: updatedService.provider_certification,
      verified: updatedService.provider_certification_verified
    });

    // Log the verification action
    console.log(`✅ Provider certification ${action}d for service ${serviceId} (${service.service_name}) by ${authResult.adminUsername}`, {
      serviceId,
      serviceName: service.service_name,
      action,
      notes,
      verifiedBy: authResult.adminUsername,
      timestamp: new Date().toISOString()
    });

    // Return success response with updated service data
    const responseMessage = action === 'verify' 
      ? `Provider certification verified successfully for ${service.service_name}`
      : `Provider certification rejected for ${service.service_name}`;

    return new Response(JSON.stringify({
      message: responseMessage,
      serviceId: serviceId,
      serviceName: service.service_name,
      action: action,
      verificationStatus: verificationStatus,
      verifiedAt: new Date().toISOString(),
      notes: notes,
      success: true,
      updatedService: {
        id: serviceId,
        providerCertification: updatedService.provider_certification,
        providerCertificationVerified: updatedService.provider_certification_verified,
        verificationStatus: updatedService.verification_status
      }
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("❌ Verification error:", err);
    
    let errorMessage = 'Error processing verification';
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    
    return new Response(JSON.stringify({ 
      message: errorMessage,
      error: err instanceof Error ? err.message : 'Unknown error',
      success: false
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Optional: GET endpoint to retrieve verification history  
export async function GET(req: Request) {
  // Check authentication
  const authResult = await checkAuth(req);
  if (!authResult.valid) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('serviceId');

    const pool = await sql.connect(dbConfig);

    if (serviceId) {
      // Get verification details for a specific service
      const query = `
        SELECT 
          id,
          service_name,
          provider_certification_submitted,
          provider_certification_verified,
          verification_status,
          verification_notes,
          verified_at,
          verified_by,
          certificate_file_url
        FROM CardiacServices 
        WHERE id = @serviceId AND is_active = 1
      `;

      const result = await pool.request()
        .input('serviceId', sql.Int, parseInt(serviceId))
        .query(query);

      if (result.recordset.length === 0) {
        return new Response(JSON.stringify({ 
          message: 'Service not found' 
        }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        service: result.recordset[0]
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Get verification statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_submitted,
          SUM(CASE WHEN verification_status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified,
          SUM(CASE WHEN verification_status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM CardiacServices 
        WHERE provider_certification_submitted = 1 AND is_active = 1
      `;

      const statsResult = await pool.request().query(statsQuery);

      return new Response(JSON.stringify({
        statistics: statsResult.recordset[0]
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (err) {
    console.error("Error retrieving verification data:", err);
    
    return new Response(JSON.stringify({ 
      message: 'Error retrieving verification data',
      error: err instanceof Error ? err.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}