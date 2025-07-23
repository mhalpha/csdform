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

export async function POST(req) {
  const formData = await req.json();
  
  try {
    const pool = await sql.connect(dbConfig);

    console.log('Received Form Data:', JSON.stringify(formData, null, 2));
    const deliveryTypeConfigsJson = JSON.stringify(formData.deliveryTypeConfigs || {});
    const enrollmentOptionsJson = JSON.stringify(formData.enrollmentOptions || {});

    const insertQuery = `
      INSERT INTO CardiacServices (
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
        lng
      ) VALUES (
        @service_name,
        @website,
        @primary_coordinator,
        @street_address,
        @directions,
        @phone_number,
        @email,
        @fax,
        @program_type,
        @provider_certification,
        @program_certification,
        @provider_certification_submitted,
        @provider_certification_verified,
        @certificate_file_url,
        @verification_status,
        @program_types,
        @description,
        @attendance_info,
        @exercise_info,
        @education_info,
        @program_services,
        @delivery_type,
        @delivery_type_configs,
        @hybrid_description,
        @f2f_description,
        @telehealth_description,
        @individual_description,
        @enrollment_info,
        @enrollment_options,
        @interpreter_available,
        @special_conditions_support,
        @privacy_statement,
        @lat,
        @lng
      )
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

    // Handle provider certification logic
    const providerCertificationSubmitted = formData.providerCertificationSubmitted || false;
    const providerCertificationVerified = false; // Always false for new submissions
    const verificationStatus = providerCertificationSubmitted ? 'pending' : null;
    const certificateFileUrl = formData.certificateFileUrl || null;

    const inputs = {
      service_name: formData.serviceName?.trim() || null,
      website: formData.website?.trim() || null,
      primary_coordinator: formData.primaryCoordinator?.trim() || null,
      street_address: formData.streetAddress?.trim() || null,
      directions: formData.directions?.trim() || null,
      phone_number: formData.phone?.trim() || null,
      email: formData.email?.trim() || null,
      fax: formData.fax?.trim() || null,
      program_type: formData.programType || null,
      
      // Updated provider certification fields
      provider_certification: false, // This will only be true after admin verification
      program_certification: false, // Commented out in form, keeping as false
      provider_certification_submitted: providerCertificationSubmitted,
      provider_certification_verified: providerCertificationVerified,
      certificate_file_url: certificateFileUrl,
      verification_status: verificationStatus,
      
      description: formData.description?.trim() || null,
      attendance_info: attendanceInfoJson,
      exercise_info: formData.exercise?.trim() || null,
      education_info: formData.education?.trim() || null,
      program_services: programServicesJson,
      delivery_type: formData.deliveryTypes?.join(',') || null,
      
      // Add new field inputs
      hybrid_description: formData.deliveryTypes?.includes('Hybrid') ? formData.hybridDescription?.trim() : null,
      f2f_description: formData.deliveryTypes?.includes('F2F Group') ? formData.f2fDescription?.trim() : null,
      telehealth_description: formData.deliveryTypes?.includes('Telehealth') ? formData.telehealthDescription?.trim() : null,
      individual_description: formData.deliveryTypes?.includes('1:1') ? formData.individualDescription?.trim() : null,
      
      enrollment_info: formData.enrollment?.trim() || null,
      enrollment_options: enrollmentOptionsJson,
      interpreter_available: formData.interpreterAvailable || null,
      special_conditions_support: formData.specialConditionsSupport?.trim() || null,
      privacy_statement: formData.privacyStatement?.trim() || null, // Add privacy statement
      lat: formData.lat || null,
      lng: formData.lng || null
    };

    // Updated required fields - add privacy_statement to required fields
    const requiredFields = [
      'service_name', 'website', 'primary_coordinator', 'street_address', 
      'phone_number', 'email', 'program_type', 
      'description', 'attendance_info', 'program_services',
      'delivery_type', 'enrollment_info', 
      'interpreter_available', 'privacy_statement'  // Add privacy_statement as required
    ];

    // Add conditional required fields for delivery type descriptions
    if (formData.deliveryTypes?.includes('Hybrid')) {
      requiredFields.push('hybrid_description');
    }
    if (formData.deliveryTypes?.includes('F2F Group')) {
      requiredFields.push('f2f_description');
    }
    if (formData.deliveryTypes?.includes('Telehealth')) {
      requiredFields.push('telehealth_description');
    }
    if (formData.deliveryTypes?.includes('1:1')) {
      requiredFields.push('individual_description');
    }

    const missingFields = requiredFields.filter(field => inputs[field] === null);
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Verify privacy policy has been accepted
    if (!formData.privacyPolicyAccepted) {
      throw new Error('Privacy Policy must be accepted to submit the form');
    }

    // Verify privacy statement is provided
    if (!formData.privacyStatement || formData.privacyStatement.trim() === '') {
      throw new Error('Privacy Statement is required to submit the form');
    }

    await pool.request()
      .input('service_name', sql.NVarChar, inputs.service_name)
      .input('website', sql.NVarChar, inputs.website)
      .input('primary_coordinator', sql.NVarChar, inputs.primary_coordinator)
      .input('street_address', sql.NVarChar, inputs.street_address)
      .input('directions', sql.NVarChar, inputs.directions)
      .input('phone_number', sql.NVarChar, inputs.phone_number)
      .input('email', sql.NVarChar, inputs.email)
      .input('fax', sql.NVarChar, inputs.fax)
      .input('program_type', sql.NVarChar, inputs.program_type)
      
      // Updated provider certification inputs
      .input('provider_certification', sql.Bit, inputs.provider_certification)
      .input('program_certification', sql.Bit, inputs.program_certification)
      .input('provider_certification_submitted', sql.Bit, inputs.provider_certification_submitted)
      .input('provider_certification_verified', sql.Bit, inputs.provider_certification_verified)
      .input('certificate_file_url', sql.NVarChar, inputs.certificate_file_url)
      .input('verification_status', sql.NVarChar, inputs.verification_status)
      
      .input('description', sql.NVarChar, inputs.description)
      .input('program_types', sql.NVarChar, formData.programTypes.join(','))
      .input('attendance_info', sql.NVarChar, inputs.attendance_info)
      .input('exercise_info', sql.NVarChar, inputs.exercise_info)
      .input('education_info', sql.NVarChar, inputs.education_info)
      .input('program_services', sql.NVarChar, inputs.program_services)
      .input('delivery_type', sql.NVarChar, formData.deliveryTypes.join(','))
      .input('delivery_type_configs', sql.NVarChar, deliveryTypeConfigsJson)
      
      // Add inputs for the new description fields
      .input('hybrid_description', sql.NVarChar, inputs.hybrid_description)
      .input('f2f_description', sql.NVarChar, inputs.f2f_description)
      .input('telehealth_description', sql.NVarChar, inputs.telehealth_description)
      .input('individual_description', sql.NVarChar, inputs.individual_description)
      
      .input('enrollment_info', sql.NVarChar, inputs.enrollment_info)
      .input('enrollment_options', sql.NVarChar, enrollmentOptionsJson)
      .input('interpreter_available', sql.NVarChar, inputs.interpreter_available)
      .input('special_conditions_support', sql.NVarChar, inputs.special_conditions_support)
      .input('privacy_statement', sql.NVarChar, inputs.privacy_statement) // Add privacy statement input
      .input('lat', sql.Decimal(10, 8), inputs.lat)
      .input('lng', sql.Decimal(11, 8), inputs.lng)
      .query(insertQuery);

    const responseMessage = providerCertificationSubmitted 
      ? 'Service registered successfully. Provider certification submitted for review.'
      : 'Service registered successfully';

    return new Response(JSON.stringify({ 
      message: responseMessage,
      website: formData.website,
      providerCertificationSubmitted: providerCertificationSubmitted,
      verificationStatus: verificationStatus
    }), { status: 200 });
  } catch (err) {
    console.error("Full Error Details:", {
      message: err.message,
      name: err.name,
      stack: err.stack,
      number: err.number,
      originalError: err
    });
    
    let errorMessage = 'Error registering service';
    if (err.number === 2627) {
      errorMessage = 'A service with this name already exists';
    } else if (err.number === 547) {
      errorMessage = 'Invalid data provided for one or more fields';
    } else if (err.message.includes('Privacy Policy')) {
      errorMessage = 'Privacy Policy must be accepted to submit the form';
    } else if (err.message.includes('Privacy Statement')) {
      errorMessage = 'Privacy Statement is required to submit the form';
    }
    
    return new Response(JSON.stringify({ 
      message: errorMessage, 
      error: err.message,
      detailedError: err.toString()
    }), { status: 500 });
  }
}