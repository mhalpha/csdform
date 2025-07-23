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

// Enhanced website normalization function to match frontend
const normalizeWebsite = (website) => {
  if (!website) return '';
  
  // First normalize spaces and trim
  const normalized = website.replace(/\s+/g, ' ').trim();
  
  // Then format for URL
  return normalized
    .replace(/\s+/g, '-')
    .replace(/[\/\\?%*:|"<>]/g, '-') 
    .replace(/-+/g, '-') // Replace multiple consecutive hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .toLowerCase();
};
 
export async function GET(req, { params }) {
  // Await params before destructuring
  const { website } = await params;
 
  try {
    const pool = await sql.connect(dbConfig);
    
    // Normalize the website parameter for consistent comparison
    const normalizedWebsite = normalizeWebsite(decodeURIComponent(website));
    console.log('GET - Searching for website:', {
      original: website,
      normalized: normalizedWebsite
    });
 
    const result = await pool.request()
      .input('website', sql.NVarChar, normalizedWebsite)
      .query(`
        SELECT * FROM CardiacServices
        WHERE LOWER(LTRIM(RTRIM(website))) = LOWER(LTRIM(RTRIM(@website))) AND is_active = 1
      `);
 
    if (result.recordset.length === 0) {
      console.log('Service not found for website:', normalizedWebsite);
      return new Response(JSON.stringify({ message: 'Service not found' }), { status: 404 });
    }
 
    const dbRecord = result.recordset[0];
    
    console.log('Found service:', {
      id: dbRecord.id,
      serviceName: dbRecord.service_name,
      website: dbRecord.website
    });
 
    // Parse attendance info from JSON
    let attendanceOptions = {
      coronaryHeartDisease: false,
      heartFailure: false,
      heartRhythmProblems: false,
      deviceInsertion: false,
      other: false,
      otherSpecify: null
    };
 
    let deliveryTypeConfigs = {};
    try {
      if (dbRecord.delivery_type_configs) {
        deliveryTypeConfigs = JSON.parse(dbRecord.delivery_type_configs);
      }
    } catch (parseError) {
      console.error('Error parsing delivery type configs:', parseError);
    }
 
    let programServices = {
      exerciseOnly: false,
      educationOnly: false,
      exerciseAndEducation: false,
      other: false,
      otherSpecify: null
    };
 
    let enrollmentOptions = {
      selfReferral: false,
      gpReferral: false,
      hospitalReferral: false,
      other: false,
      otherSpecify: '',
      notAcceptingReferrals: false
    };
 
    try {
      if (dbRecord.attendance_info) {
        attendanceOptions = JSON.parse(dbRecord.attendance_info);
      }
      if (dbRecord.program_services) {
        programServices = JSON.parse(dbRecord.program_services);
      }
      if (dbRecord.enrollment_options) {
        enrollmentOptions = JSON.parse(dbRecord.enrollment_options);
      }
    } catch (parseError) {
      console.error('Error parsing info:', parseError);
    }
 
    const formattedData = {
      id: dbRecord.id,
      serviceName: dbRecord.service_name,
      website: dbRecord.website,
      primaryCoordinator: dbRecord.primary_coordinator,
      streetAddress: dbRecord.street_address,
      directions: dbRecord.directions,
      phone: dbRecord.phone_number,
      email: dbRecord.email,
      fax: dbRecord.fax,
      programType: dbRecord.program_type,
     
      // Updated certification fields for the new verification workflow
      certification: {
        providerCertification: Boolean(dbRecord.provider_certification),
        // programCertification: Boolean(dbRecord.program_certification), // COMMENTED OUT
      },
     
      // New provider certification verification fields
      providerCertificationSubmitted: Boolean(dbRecord.provider_certification_submitted),
      providerCertificationVerified: Boolean(dbRecord.provider_certification_verified),
      certificateFileUrl: dbRecord.certificate_file_url,
      verificationStatus: dbRecord.verification_status,
      verificationNotes: dbRecord.verification_notes,
      verifiedAt: dbRecord.verified_at,
      verifiedBy: dbRecord.verified_by,
     
      silentListing: false, // Default to false as we removed this field
      programTypes: dbRecord.program_types ? dbRecord.program_types.split(',') : [],
      description: dbRecord.description,
      attendanceOptions: attendanceOptions,
      programServices: programServices,
      exercise: dbRecord.exercise_info,
      education: dbRecord.education_info,
      deliveryTypes: dbRecord.delivery_type ? dbRecord.delivery_type.split(',') : [],
      deliveryTypeConfigs: deliveryTypeConfigs,
     
      // Add the new description fields
      hybridDescription: dbRecord.hybrid_description || '',
      f2fDescription: dbRecord.f2f_description || '',
      telehealthDescription: dbRecord.telehealth_description || '',
      individualDescription: dbRecord.individual_description || '',
     
      enrollment: dbRecord.enrollment_info,
      enrollmentOptions: enrollmentOptions,
      interpreterAvailable: dbRecord.interpreter_available,
      specialConditionsSupport: dbRecord.special_conditions_support,
      privacyStatement: dbRecord.privacy_statement || '', // Add privacy statement field
      lat: dbRecord.lat,
      lng: dbRecord.lng,
      isActive: dbRecord.is_active,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
      privacyPolicyAccepted: true // Default to true for existing records
    };
 
    return new Response(JSON.stringify(formattedData), { status: 200 });
  } catch (err) {
    console.error("Database error:", err);
    return new Response(JSON.stringify({
      message: 'Error retrieving service data',
      error: err.message
    }), { status: 500 });
  }
}
 
export async function PUT(req, { params }) {
  // Await params before destructuring
  const { website } = await params;
  const formData = await req.json();
 
  try {
    const pool = await sql.connect(dbConfig);
    
    // Normalize the website parameter for consistent comparison
    const normalizedOriginalWebsite = normalizeWebsite(decodeURIComponent(website));
    
    // Generate the new website from the service name
    const newWebsite = normalizeWebsite(formData.serviceName);
 
    // Add detailed logging for debugging
    console.log('PUT Request Debug Info:', {
      originalWebsite: website,
      normalizedOriginalWebsite: normalizedOriginalWebsite,
      newWebsite: newWebsite,
      serviceName: formData.serviceName,
      formDataKeys: Object.keys(formData),
      programTypes: formData.programTypes,
      providerCertificationSubmitted: formData.providerCertificationSubmitted,
      privacyStatement: formData.privacyStatement ? 'Present' : 'Missing'
    });

    // Check if the new website conflicts with an existing service (only if website is changing)
    if (normalizedOriginalWebsite !== newWebsite) {
      const conflictCheck = await pool.request()
        .input('newWebsite', sql.NVarChar, newWebsite)
        .query(`
          SELECT id, service_name FROM CardiacServices
          WHERE LOWER(LTRIM(RTRIM(website))) = LOWER(LTRIM(RTRIM(@newWebsite))) AND is_active = 1
        `);

      if (conflictCheck.recordset.length > 0) {
        const conflictingService = conflictCheck.recordset[0];
        console.log('Website conflict detected:', {
          newWebsite,
          conflictingServiceId: conflictingService.id,
          conflictingServiceName: conflictingService.service_name
        });
        
        return new Response(JSON.stringify({
          message: 'A service with this name already exists',
          conflictingService: conflictingService.service_name
        }), { status: 409 });
      }
    }

    // Validate privacy statement is provided
    if (!formData.privacyStatement || formData.privacyStatement.trim() === '') {
      return new Response(JSON.stringify({
        message: 'Privacy Statement is required to update the service'
      }), { status: 400 });
    }
 
    const updateQuery = `
      UPDATE CardiacServices
      SET
        service_name = @service_name,
        website = @new_website,
        primary_coordinator = @primary_coordinator,
        street_address = @street_address,
        directions = @directions,
        phone_number = @phone_number,
        email = @email,
        fax = @fax,
        program_type = @program_type,
        provider_certification = @provider_certification,
        program_certification = @program_certification,
        provider_certification_submitted = @provider_certification_submitted,
        provider_certification_verified = @provider_certification_verified,
        certificate_file_url = @certificate_file_url,
        verification_status = @verification_status,
        verification_notes = @verification_notes,
        verified_at = @verified_at,
        verified_by = @verified_by,
        program_types = @program_types,
        description = @description,
        attendance_info = @attendance_info,
        exercise_info = @exercise_info,
        education_info = @education_info,
        program_services = @program_services,
        delivery_type = @delivery_type,
        delivery_type_configs = @delivery_type_configs,
        hybrid_description = @hybrid_description,
        f2f_description = @f2f_description,
        telehealth_description = @telehealth_description,
        individual_description = @individual_description,
        enrollment_info = @enrollment_info,
        enrollment_options = @enrollment_options,
        interpreter_available = @interpreter_available,
        special_conditions_support = @special_conditions_support,
        privacy_statement = @privacy_statement,
        lat = @lat,
        lng = @lng,
        updated_at = GETDATE()
      WHERE LOWER(LTRIM(RTRIM(website))) = LOWER(LTRIM(RTRIM(@website))) AND is_active = 1
    `;
 
    // Serialize attendance options
    const attendanceInfoJson = JSON.stringify({
      coronaryHeartDisease: formData.attendanceOptions?.coronaryHeartDisease || false,
      heartFailure: formData.attendanceOptions?.heartFailure || false,
      heartRhythmProblems: formData.attendanceOptions?.heartRhythmProblems || false,
      deviceInsertion: formData.attendanceOptions?.deviceInsertion || false,
      other: formData.attendanceOptions?.other || false,
      otherSpecify: formData.attendanceOptions?.otherSpecify || null
    });
 
    // Serialize program services
    const programServicesJson = JSON.stringify({
      exerciseOnly: formData.programServices?.exerciseOnly || false,
      educationOnly: formData.programServices?.educationOnly || false,
      exerciseAndEducation: formData.programServices?.exerciseAndEducation || false,
      other: formData.programServices?.other || false,
      otherSpecify: formData.programServices?.otherSpecify || null
    });
 
    const deliveryTypeConfigsJson = JSON.stringify(formData.deliveryTypeConfigs || {});
    const enrollmentOptionsJson = JSON.stringify(formData.enrollmentOptions || {});
 
    // Handle provider certification logic for updates
    const providerCertificationSubmitted = formData.providerCertificationSubmitted || false;
   
    // For updates, preserve existing verification status unless new file is uploaded
    // If new certification is submitted, reset verification to pending
    let providerCertificationVerified = formData.providerCertificationVerified || false;
    let verificationStatus = formData.verificationStatus || null;
    let certificateFileUrl = formData.certificateFileUrl || null;
   
    // If provider certification is newly submitted or file is updated, reset verification
    if (providerCertificationSubmitted && formData.certificateFileUrl) {
      providerCertificationVerified = false;
      verificationStatus = 'pending';
      certificateFileUrl = formData.certificateFileUrl;
    }
 
    const result = await pool.request()
      .input('website', sql.NVarChar, normalizedOriginalWebsite)
      .input('new_website', sql.NVarChar, newWebsite)
      .input('service_name', sql.NVarChar, formData.serviceName.replace(/\s+/g, ' ').trim()) // Normalize service name
      .input('primary_coordinator', sql.NVarChar, formData.primaryCoordinator)
      .input('street_address', sql.NVarChar, formData.streetAddress)
      .input('directions', sql.NVarChar, formData.directions)
      .input('phone_number', sql.NVarChar, formData.phone)
      .input('email', sql.NVarChar, formData.email)
      .input('fax', sql.NVarChar, formData.fax)
      .input('program_type', sql.NVarChar, formData.programType)
     
      // Updated provider certification inputs
      .input('provider_certification', sql.Bit, providerCertificationVerified) // Only true if verified by admin
      .input('program_certification', sql.Bit, false) // Always false since it's commented out
      .input('provider_certification_submitted', sql.Bit, providerCertificationSubmitted)
      .input('provider_certification_verified', sql.Bit, providerCertificationVerified)
      .input('certificate_file_url', sql.NVarChar, certificateFileUrl)
      .input('verification_status', sql.NVarChar, verificationStatus)
      .input('verification_notes', sql.NVarChar, formData.verificationNotes || null)
      .input('verified_at', sql.DateTime, formData.verifiedAt || null)
      .input('verified_by', sql.NVarChar, formData.verifiedBy || null)
     
      .input('program_types', sql.NVarChar, formData.programTypes?.join(',') || '')
      .input('description', sql.NVarChar, formData.description)
      .input('attendance_info', sql.NVarChar, attendanceInfoJson)
      .input('exercise_info', sql.NVarChar, formData.exercise || null)
      .input('education_info', sql.NVarChar, formData.education || null)
      .input('program_services', sql.NVarChar, programServicesJson)
      .input('delivery_type', sql.NVarChar, formData.deliveryTypes?.join(',') || '')
      .input('delivery_type_configs', sql.NVarChar, deliveryTypeConfigsJson)
      .input('hybrid_description', sql.NVarChar,
        formData.deliveryTypes?.includes('Hybrid') ? formData.hybridDescription : null)
      .input('f2f_description', sql.NVarChar,
        formData.deliveryTypes?.includes('F2F Group') ? formData.f2fDescription : null)
      .input('telehealth_description', sql.NVarChar,
        formData.deliveryTypes?.includes('Telehealth') ? formData.telehealthDescription : null)
      .input('individual_description', sql.NVarChar,
        formData.deliveryTypes?.includes('1:1') ? formData.individualDescription : null)
      .input('enrollment_info', sql.NVarChar, formData.enrollment)
      .input('enrollment_options', sql.NVarChar, enrollmentOptionsJson)
      .input('interpreter_available', sql.NVarChar, formData.interpreterAvailable)
      .input('special_conditions_support', sql.NVarChar, formData.specialConditionsSupport)
      .input('privacy_statement', sql.NVarChar, formData.privacyStatement?.trim() || null) // Add privacy statement input
      .input('lat', sql.Decimal(10, 8), formData.lat)
      .input('lng', sql.Decimal(11, 8), formData.lng)
      .query(updateQuery);
 
    console.log('Update result:', result);
 
    if (result.rowsAffected[0] === 0) {
      return new Response(JSON.stringify({
        message: 'Service not found or no changes made'
      }), { status: 404 });
    }
 
    const responseMessage = providerCertificationSubmitted && formData.certificateFileUrl
      ? 'Service updated successfully. Provider certification submitted for review.'
      : 'Service updated successfully';
 
    return new Response(JSON.stringify({
      message: responseMessage,
      website: newWebsite,
      providerCertificationSubmitted: providerCertificationSubmitted,
      verificationStatus: verificationStatus
    }), { status: 200 });
  } catch (err) {
    console.error("Database error:", err);
    console.error("Error details:", {
      message: err.message,
      number: err.number,
      state: err.state,
      class: err.class,
      serverName: err.serverName,
      procName: err.procName,
      lineNumber: err.lineNumber
    });
   
    let errorMessage = 'Error updating service';
    if (err.number === 547) {
      errorMessage = 'Invalid data provided for one or more fields';
    } else if (err.number === 8152) {
      errorMessage = 'Data too long for one or more fields';
    } else if (err.number === 2627) {
      errorMessage = 'A service with this name already exists';
    }
   
    return new Response(JSON.stringify({
      message: errorMessage,
      error: err.message,
      errorNumber: err.number
    }), { status: 500 });
  }
}