// src/app/api/admin/services/route.js
// Enhanced version with comprehensive filtering and export capabilities

import sql from 'mssql';
import { cookies } from 'next/headers';
import { getPool } from '@/lib/db';


// Authentication middleware
async function validateAdminAuth(req) {
  try {
    // Try cookie-based authentication first (preferred)
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session')?.value;

    if (sessionToken) {
          const pool = await getPool(); // { changed code }
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

// Helper function to build WHERE clause based on filters
function buildFilterQuery(filters) {
  const conditions = ['is_active = 1']; // Always filter active services
  const parameters = {};

  // State filter (extracted from street_address) - match whole word only
  if (filters.state && filters.state !== 'all') {
    // Use word boundary pattern to match state as separate word
    // This prevents "NT" from matching "MONT" or "BLVD"
    // Patterns: " NT ", " NT,", " NT 3" (with postcode), or ends with " NT"
    conditions.push(`(
      street_address LIKE @stateWithSpaces OR 
      street_address LIKE @stateWithComma OR 
      street_address LIKE @stateAtEnd
    )`);
    parameters.stateWithSpaces = `% ${filters.state} %`; // Space before and after
    parameters.stateWithComma = `% ${filters.state},%`; // Space before, comma after
    parameters.stateAtEnd = `% ${filters.state}`; // Space before, end of string
  }

  // Program Type filter
  if (filters.programType && filters.programType !== 'all') {
    if (filters.programType === 'cardiac_rehab') {
      conditions.push(`(program_types LIKE '%Cardiac Rehab%' OR program_types LIKE '%Cardiac Rehabilitation%')`);
    } else if (filters.programType === 'heart_failure') {
      conditions.push(`program_types LIKE '%Heart Failure%'`);
    } else if (filters.programType === 'both') {
      conditions.push(`(
        (program_types LIKE '%Cardiac Rehab%' OR program_types LIKE '%Cardiac Rehabilitation%') 
        AND program_types LIKE '%Heart Failure%'
      )`);
    }
  }

  // Delivery Type filter
  if (filters.deliveryType && filters.deliveryType !== 'all') {
    const deliveryMap = {
      'f2f': 'F2F Group',
      'hybrid': 'Hybrid',
      'telehealth': 'Telehealth',
      'individual': '1:1'
    };
    
    if (deliveryMap[filters.deliveryType]) {
      conditions.push(`delivery_type LIKE @deliveryType`);
      parameters.deliveryType = `%${deliveryMap[filters.deliveryType]}%`;
    }
  }

  // Public vs Private filter (based on program_type field)
  if (filters.sector && filters.sector !== 'all') {
    if (filters.sector === 'public') {
      conditions.push(`program_type = 'Public'`);
    } else if (filters.sector === 'private') {
      conditions.push(`program_type = 'Private'`);
    }
  }

  // Services Offered filter (based on program_services JSON)
  if (filters.servicesOffered && filters.servicesOffered !== 'all') {
    if (filters.servicesOffered === 'exercise_only') {
      conditions.push(`program_services LIKE '%"exerciseOnly":true%'`);
    } else if (filters.servicesOffered === 'education_only') {
      conditions.push(`program_services LIKE '%"educationOnly":true%'`);
    } else if (filters.servicesOffered === 'both') {
      conditions.push(`program_services LIKE '%"exerciseAndEducation":true%'`);
    }
  }

  // Verification Status filter
  if (filters.verificationStatus && filters.verificationStatus !== 'all') {
    if (filters.verificationStatus === 'pending') {
      conditions.push(`verification_status = 'pending'`);
    } else if (filters.verificationStatus === 'verified') {
      conditions.push(`verification_status = 'verified'`);
    } else if (filters.verificationStatus === 'rejected') {
      conditions.push(`verification_status = 'rejected'`);
    } else if (filters.verificationStatus === 'not_submitted') {
      conditions.push(`(provider_certification_submitted = 0 OR provider_certification_submitted IS NULL)`);
    }
  }

  // Interpreter Available filter
  if (filters.interpreterAvailable && filters.interpreterAvailable !== 'all') {
    conditions.push(`interpreter_available = @interpreterAvailable`);
    parameters.interpreterAvailable = filters.interpreterAvailable;
  }

  // Privacy Statement filter
  if (filters.privacyStatement && filters.privacyStatement !== 'all') {
    if (filters.privacyStatement === 'yes') {
      conditions.push(`privacy_statement IS NOT NULL AND privacy_statement != ''`);
    } else if (filters.privacyStatement === 'no') {
      conditions.push(`(privacy_statement IS NULL OR privacy_statement = '')`);
    }
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    parameters
  };
}

// Helper function to extract unique states from addresses
function extractStates(services) {
  const statesSet = new Set();
  const australianStates = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
  
  services.forEach(service => {
    if (service.streetAddress) {
      const address = service.streetAddress.toUpperCase();
      australianStates.forEach(state => {
        // Match state as whole word only
        const regex = new RegExp(`\\b${state}\\b`, 'i');
        if (regex.test(address)) {
          statesSet.add(state);
        }
      });
    }
  });
  
  return Array.from(statesSet).sort();
}

// Helper function to get available filter options from data
function getFilterOptions(services) {
  const programTypes = new Set();
  const deliveryTypes = new Set();
  const sectors = new Set();
  const servicesOffered = new Set();
  const states = new Set();

  services.forEach(service => {
    // Program types
    if (service.programTypes && service.programTypes.length > 0) {
      service.programTypes.forEach(type => programTypes.add(type));
    }

    // Delivery types
    if (service.deliveryTypes && service.deliveryTypes.length > 0) {
      service.deliveryTypes.forEach(type => deliveryTypes.add(type));
    }

    // Sectors (Public/Private)
    if (service.programType) {
      sectors.add(service.programType);
    }

    // Services offered
    if (service.programServices) {
      if (service.programServices.exerciseOnly) servicesOffered.add('Exercise Only');
      if (service.programServices.educationOnly) servicesOffered.add('Education Only');
      if (service.programServices.exerciseAndEducation) servicesOffered.add('Exercise and Education');
      if (service.programServices.other) servicesOffered.add('Other');
    }

    // Extract state from address - match whole word only
    if (service.streetAddress) {
      const address = service.streetAddress.toUpperCase();
      const australianStates = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
      australianStates.forEach(state => {
        // Use word boundary regex to match state as whole word
        const regex = new RegExp(`\\b${state}\\b`, 'i');
        if (regex.test(address)) {
          states.add(state);
        }
      });
    }
  });

  return {
    states: Array.from(states).sort(),
    programTypes: Array.from(programTypes).sort(),
    deliveryTypes: Array.from(deliveryTypes).sort(),
    sectors: Array.from(sectors).sort(),
    servicesOffered: Array.from(servicesOffered).sort()
  };
}

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (data.length === 0) return '';

  // Define headers
  const headers = [
    'ID',
    'Service Name',
    'State',
    'Street Address',
    'Website',
    'Primary Coordinator',
    'Phone',
    'Email',
    'Fax',
    'Program Type (Public/Private)',
    'Program Types',
    'Delivery Types',
    'Services Offered',
    'Provider Certification',
    'Verification Status',
    'Verified By',
    'Verified At',
    'Interpreter Available',
    'Privacy Statement Provided',
    'Description',
    'Enrollment Info',
    'Special Conditions Support',
    'Latitude',
    'Longitude',
    'Created At',
    'Updated At'
  ];

  // Convert data to CSV rows
  const rows = data.map(service => {
    // Extract state from address - match whole word only
    let state = '';
    if (service.streetAddress) {
      const address = service.streetAddress.toUpperCase();
      const australianStates = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
      for (const st of australianStates) {
        const regex = new RegExp(`\\b${st}\\b`, 'i');
        if (regex.test(address)) {
          state = st;
          break;
        }
      }
    }

    // Extract services offered
    let servicesOffered = [];
    if (service.programServices) {
      if (service.programServices.exerciseOnly) servicesOffered.push('Exercise Only');
      if (service.programServices.educationOnly) servicesOffered.push('Education Only');
      if (service.programServices.exerciseAndEducation) servicesOffered.push('Exercise and Education');
      if (service.programServices.other) servicesOffered.push(`Other: ${service.programServices.otherSpecify || ''}`);
    }

    return [
      service.id || '',
      service.serviceName || '',
      state,
      service.streetAddress || '',
      service.website || '',
      service.primaryCoordinator || '',
      service.phone || '',
      service.email || '',
      service.fax || '',
      service.programType || '',
      service.programTypes?.join('; ') || '',
      service.deliveryTypes?.join('; ') || '',
      servicesOffered.join('; '),
      service.providerCertification ? 'Yes' : 'No',
      service.verificationStatus || 'Not Submitted',
      service.verifiedBy || '',
      service.verifiedAt ? new Date(service.verifiedAt).toISOString() : '',
      service.interpreterAvailable || '',
      service.privacyStatement ? 'Yes' : 'No',
      `"${(service.description || '').replace(/"/g, '""')}"`,
      `"${(service.enrollmentInfo || '').replace(/"/g, '""')}"`,
      `"${(service.specialConditionsSupport || '').replace(/"/g, '""')}"`,
      service.lat || '',
      service.lng || '',
      service.createdAt ? new Date(service.createdAt).toISOString() : '',
      service.updatedAt ? new Date(service.updatedAt).toISOString() : ''
    ].map(field => {
      // Escape fields that contain commas
      const fieldStr = String(field);
      if (fieldStr.includes(',') || fieldStr.includes('\n') || fieldStr.includes('"')) {
        return `"${fieldStr.replace(/"/g, '""')}"`;
      }
      return fieldStr;
    }).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// Helper function to process service data
function processServiceData(record) {
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
    privacyStatement: record.privacy_statement || '',
    lat: record.lat,
    lng: record.lng,
    isActive: record.is_active,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
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
    const { searchParams } = new URL(req.url);
    
    // Extract filter parameters
    const filters = {
      state: searchParams.get('state'),
      programType: searchParams.get('programType'),
      deliveryType: searchParams.get('deliveryType'),
      sector: searchParams.get('sector'),
      servicesOffered: searchParams.get('servicesOffered'),
      verificationStatus: searchParams.get('verificationStatus'),
      interpreterAvailable: searchParams.get('interpreterAvailable'),
      privacyStatement: searchParams.get('privacyStatement')
    };

    // Export format parameter
    const exportFormat = searchParams.get('export'); // csv, json
    const getFiltersOnly = searchParams.get('filtersOnly') === 'true';

    const pool = await getPool(); // { changed code }


    // Build dynamic query based on filters
    const { whereClause, parameters } = buildFilterQuery(filters);

    const query = `
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
        privacy_statement,
        lat,
        lng,
        is_active,
        created_at,
        updated_at
      FROM CardiacServices
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const request = pool.request();

    // Add parameters to the request
    Object.entries(parameters).forEach(([key, value]) => {
      request.input(key, sql.NVarChar, value);
    });

    const result = await request.query(query);

    // Process the data
    const processedData = result.recordset.map(processServiceData);

    // Generate statistics
    const totalServices = processedData.length;
    const activeServices = processedData.filter(s => s.isActive).length;
    const providerCertificationSubmitted = processedData.filter(s => s.providerCertificationSubmitted).length;
    const pendingVerifications = processedData.filter(s => s.providerCertificationSubmitted && s.verificationStatus === 'pending').length;
    const verifiedServices = processedData.filter(s => s.verificationStatus === 'verified').length;
    const rejectedCertifications = processedData.filter(s => s.verificationStatus === 'rejected').length;
    const servicesWithPrivacyStatement = processedData.filter(s => s.privacyStatement && s.privacyStatement.trim() !== '').length;
    const servicesWithoutPrivacyStatement = processedData.filter(s => !s.privacyStatement || s.privacyStatement.trim() === '').length;

    // Get available filter options
    const filterOptions = getFilterOptions(processedData);

    // If only requesting filter options
    if (getFiltersOnly) {
      return new Response(JSON.stringify({
        filterOptions,
        totalServices
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle export formats
    if (exportFormat === 'csv') {
      const csv = convertToCSV(processedData);
      const filename = `cardiac-services-${new Date().toISOString().split('T')[0]}.csv`;
      
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    if (exportFormat === 'json') {
      const filename = `cardiac-services-${new Date().toISOString().split('T')[0]}.json`;
      
      return new Response(JSON.stringify(processedData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    // Log admin dashboard access
    console.log('Admin Dashboard Access:', {
      admin: authResult.admin.username,
      timestamp: new Date().toISOString(),
      filters: filters,
      resultsCount: totalServices,
      stats: {
        totalServices,
        activeServices,
        pendingVerifications,
        privacyStatementCompliance: {
          withStatement: servicesWithPrivacyStatement,
          withoutStatement: servicesWithoutPrivacyStatement
        }
      }
    });

    // Return regular JSON response with data
    return new Response(JSON.stringify({ 
      services: processedData,
      total: processedData.length,
      admin: authResult.admin,
      appliedFilters: filters,
      filterOptions,
      statistics: {
        totalServices,
        activeServices,
        providerCertificationSubmitted,
        pendingVerifications,
        verifiedServices,
        rejectedCertifications,
        servicesWithPrivacyStatement,
        servicesWithoutPrivacyStatement,
        verificationStats: {
          submitted: providerCertificationSubmitted,
          pending: pendingVerifications,
          verified: verifiedServices,
          rejected: rejectedCertifications
        },
        privacyComplianceStats: {
          withPrivacyStatement: servicesWithPrivacyStatement,
          withoutPrivacyStatement: servicesWithoutPrivacyStatement,
          complianceRate: totalServices > 0 ? Math.round((servicesWithPrivacyStatement / totalServices) * 100) : 0
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