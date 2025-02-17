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
        silent_listing,
        program_types,
        description,
        attendance_info,
        exercise_info,
        education_info,
        program_services,
        delivery_type,
        delivery_type_configs,
        hybrid_description,
        enrollment_info,
        interpreter_available,
        special_conditions_support,
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
        @silent_listing,
        @program_types,
        @description,
        @attendance_info,
        @exercise_info,
        @education_info,
        @program_services,
        @delivery_type,
        @delivery_type_configs,
        @hybrid_description,
        @enrollment_info,
        @interpreter_available,
        @special_conditions_support,
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
      provider_certification: formData.certification?.providerCertification ? 1 : 0,
      program_certification: formData.certification?.programCertification ? 1 : 0,
      silent_listing: formData.silentListing ? 1 : 0,
      description: formData.description?.trim() || null,
      attendance_info: attendanceInfoJson,
      exercise_info: formData.exercise?.trim() || null,
      education_info: formData.education?.trim() || null,
      program_services: programServicesJson,
      delivery_type: formData.deliveryTypes?.join(',') || null,
      hybrid_description: formData.deliveryTypes?.includes('Hybrid') ? formData.hybridDescription?.trim() : null,
      enrollment_info: formData.enrollment?.trim() || null,
      interpreter_available: formData.interpreterAvailable || null,
      special_conditions_support: formData.specialConditionsSupport?.trim() || null,
      lat: formData.lat || null,
      lng: formData.lng || null
    };

    const requiredFields = [
      'service_name', 'website', 'primary_coordinator', 'street_address', 
      'phone_number', 'email', 'program_type', 
      'description', 'attendance_info', 'program_services',
      'delivery_type', 'enrollment_info', 
      'interpreter_available'
    ];

    const missingFields = requiredFields.filter(field => inputs[field] === null);
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
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
      .input('provider_certification', sql.Bit, inputs.provider_certification)
      .input('program_certification', sql.Bit, inputs.program_certification)
      .input('silent_listing', sql.Bit, inputs.silent_listing)
      .input('description', sql.NVarChar, inputs.description)
      .input('program_types', sql.NVarChar, formData.programTypes.join(','))
      .input('attendance_info', sql.NVarChar, inputs.attendance_info)
      .input('exercise_info', sql.NVarChar, inputs.exercise_info)
      .input('education_info', sql.NVarChar, inputs.education_info)
      .input('program_services', sql.NVarChar, inputs.program_services)
      .input('delivery_type', sql.NVarChar, formData.deliveryTypes.join(','))
      .input('delivery_type_configs', sql.NVarChar, deliveryTypeConfigsJson)
      .input('hybrid_description', sql.NVarChar, 
        formData.deliveryTypes.includes('Hybrid') ? formData.hybridDescription : null)
      .input('enrollment_info', sql.NVarChar, inputs.enrollment_info)
      .input('interpreter_available', sql.NVarChar, inputs.interpreter_available)
      .input('special_conditions_support', sql.NVarChar, inputs.special_conditions_support)
      .input('lat', sql.Decimal(10, 8), inputs.lat)
      .input('lng', sql.Decimal(11, 8), inputs.lng)
      .query(insertQuery);

    return new Response(JSON.stringify({ 
      message: 'Service registered successfully',
      serviceName: formData.serviceName 
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
    }
    
    return new Response(JSON.stringify({ 
      message: errorMessage, 
      error: err.message,
      detailedError: err.toString()
    }), { status: 500 });
  }
}