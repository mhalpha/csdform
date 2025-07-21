// src/app/api/admin/services/route.js
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

// Authentication middleware
async function validateAdminAuth(req) {
  try {
    // Try cookie-based authentication first (preferred)
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
        const session = result.recordset[0];
        return { 
          valid: true, 
          admin: {
            id: session.admin_id,
            username: session.username,
            email: session.email,
            fullName: session.full_name
          }
        };
      }
    }

    // Fallback to Basic Auth for API clients
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Basic ')) {
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [username, password] = credentials.split(':');

      // For backwards compatibility with hardcoded credentials
      if (username === 'admin' && password === 'admin') {
        return { 
          valid: true, 
          admin: { 
            id: 1, 
            username: 'admin', 
            email: 'admin@example.com', 
            fullName: 'Legacy Admin' 
          } 
        };
      }
    }

    return { valid: false, message: 'Authentication required' };
  } catch (error) {
    console.error('Auth validation error:', error);
    return { valid: false, message: 'Authentication failed' };
  }
}

export async function GET(req) {
  // Check admin authentication
  const authResult = await validateAdminAuth(req);
  
  if (!authResult.valid) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { 
      status: 401,
      headers: { 
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Basic realm="Admin Dashboard"' 
      }
    });
  }

  try {
    const pool = await sql.connect(dbConfig);

    const result = await pool.request()
      .query(`
        SELECT 
          id,
          service_name,
          website,
          primary_coordinator,
          street_address,
          directions,
          phone_number,
          email,
          fax,
          program_type,
          provider_certification,
          program_certification,
          provider_certification_submitted,
          provider_certification_verified,
          certificate_file_url,
          verification_status,
          verification_notes,
          verified_at,
          verified_by,
          program_types,
          description,
          attendance_info,
          exercise_info,
          education_info,
          program_services,
          delivery_type,
          delivery_type_configs,
          hybrid_description,
          f2f_description,
          telehealth_description,
          individual_description,
          enrollment_info,
          enrollment_options,
          interpreter_available,
          special_conditions_support,
          lat,
          lng,
          is_active,
          created_at,
          updated_at
        FROM CardiacServices
        ORDER BY created_at DESC
      `);

    // Process the data to parse JSON fields and format it for display
    const processedData = result.recordset.map(record => {
      let attendanceOptions = {};
      let programServices = {};
      let enrollmentOptions = {};
      let deliveryTypeConfigs = {};

      try {
        if (record.attendance_info) {
          attendanceOptions = JSON.parse(record.attendance_info);
        }
        if (record.program_services) {
          programServices = JSON.parse(record.program_services);
        }
        if (record.enrollment_options) {
          enrollmentOptions = JSON.parse(record.enrollment_options);
        }
        if (record.delivery_type_configs) {
          deliveryTypeConfigs = JSON.parse(record.delivery_type_configs);
        }
      } catch (parseError) {
        console.error('Error parsing JSON fields:', parseError);
      }

      return {
        id: record.id,
        serviceName: record.service_name,
        website: record.website,
        primaryCoordinator: record.primary_coordinator,
        streetAddress: record.street_address,
        directions: record.directions,
        phone: record.phone_number,
        email: record.email,
        fax: record.fax,
        programType: record.program_type,
        providerCertification: record.provider_certification,
        programCertification: record.program_certification,
        
        // Provider certification verification fields
        providerCertificationSubmitted: Boolean(record.provider_certification_submitted),
        providerCertificationVerified: Boolean(record.provider_certification_verified),
        certificateFileUrl: record.certificate_file_url,
        verificationStatus: record.verification_status,
        verificationNotes: record.verification_notes,
        verifiedAt: record.verified_at,
        verifiedBy: record.verified_by,
        
        programTypes: record.program_types ? record.program_types.split(',') : [],
        description: record.description,
        attendanceOptions,
        exerciseInfo: record.exercise_info,
        educationInfo: record.education_info,
        programServices,
        deliveryTypes: record.delivery_type ? record.delivery_type.split(',') : [],
        deliveryTypeConfigs,
        hybridDescription: record.hybrid_description,
        f2fDescription: record.f2f_description,
        telehealthDescription: record.telehealth_description,
        individualDescription: record.individual_description,
        enrollmentInfo: record.enrollment_info,
        enrollmentOptions,
        interpreterAvailable: record.interpreter_available,
        specialConditionsSupport: record.special_conditions_support,
        lat: record.lat,
        lng: record.lng,
        isActive: record.is_active,
        createdAt: record.created_at,
        updatedAt: record.updated_at
      };
    });

    // Generate summary statistics for the dashboard
    const totalServices = processedData.length;
    const activeServices = processedData.filter(s => s.isActive).length;
    const providerCertificationSubmitted = processedData.filter(s => s.providerCertificationSubmitted).length;
    const pendingVerifications = processedData.filter(s => s.providerCertificationSubmitted && s.verificationStatus === 'pending').length;
    const verifiedServices = processedData.filter(s => s.verificationStatus === 'verified').length;
    const rejectedCertifications = processedData.filter(s => s.verificationStatus === 'rejected').length;

    console.log('Admin Dashboard Access:', {
      admin: authResult.admin.username,
      timestamp: new Date().toISOString(),
      stats: {
        totalServices,
        activeServices,
        pendingVerifications
      }
    });

    return new Response(JSON.stringify({ 
      services: processedData,
      total: processedData.length,
      admin: authResult.admin,
      statistics: {
        totalServices,
        activeServices,
        providerCertificationSubmitted,
        pendingVerifications,
        verifiedServices,
        rejectedCertifications,
        verificationStats: {
          submitted: providerCertificationSubmitted,
          pending: pendingVerifications,
          verified: verifiedServices,
          rejected: rejectedCertifications
        }
      }
    }), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (err) {
    console.error("Database error:", err);
    return new Response(JSON.stringify({ 
      message: 'Error retrieving services data', 
      error: err.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}