// src/app/api/admin/services/route.js
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

// Simple admin credentials - you should change these
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin' // Change this to your preferred password
};

function validateAdminAuth(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  return username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password;
}

export async function GET(req) {
  // Check admin authentication
  if (!validateAdminAuth(req)) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { 
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Dashboard"' }
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
        
        // NEW: Provider certification verification fields
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

    console.log('Admin Dashboard Stats:', {
      totalServices,
      activeServices,
      providerCertificationSubmitted,
      pendingVerifications,
      verifiedServices,
      rejectedCertifications
    });

    return new Response(JSON.stringify({ 
      services: processedData,
      total: processedData.length,
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
    }), { status: 500 });
  }
}