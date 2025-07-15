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

// Simple authentication check (same as admin services)
function checkAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }

  const credentials = authHeader.slice(6);
  const [username, password] = Buffer.from(credentials, 'base64').toString().split(':');
  
  // Simple credential check - replace with your actual admin credentials
  return username === 'admin' && password === 'admin';
}

export async function POST(req: Request) {
  // Check authentication
  if (!checkAuth(req)) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { 
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
      return new Response(JSON.stringify({ 
        message: 'Service not found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const service = checkResult.recordset[0];

    if (!service.provider_certification_submitted) {
      return new Response(JSON.stringify({ 
        message: 'Service has not submitted provider certification' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
    const verifiedBy = 'admin'; // You might want to track which admin user did this

    const updateResult = await pool.request()
      .input('serviceId', sql.Int, serviceId)
      .input('verified', sql.Bit, isVerified)
      .input('providerCertification', sql.Bit, isVerified) // Only true if verified
      .input('verificationStatus', sql.NVarChar, verificationStatus)
      .input('verificationNotes', sql.NVarChar, notes || null)
      .input('verifiedBy', sql.NVarChar, verifiedBy)
      .query(updateQuery);

    if (updateResult.rowsAffected[0] === 0) {
      return new Response(JSON.stringify({ 
        message: 'Failed to update verification status' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Log the verification action
    console.log(`Provider certification ${action}d for service ${serviceId} (${service.service_name}) by ${verifiedBy}`, {
      serviceId,
      serviceName: service.service_name,
      action,
      notes,
      verifiedBy,
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
      notes: notes
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("Verification error:", err);
    
    let errorMessage = 'Error processing verification';
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    
    return new Response(JSON.stringify({ 
      message: errorMessage,
      error: err instanceof Error ? err.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Optional: GET endpoint to retrieve verification history
export async function GET(req: Request) {
  // Check authentication
  if (!checkAuth(req)) {
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