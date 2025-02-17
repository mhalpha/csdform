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

export async function GET(req, { params }) {
  const { serviceName } = params;

  try {
    const pool = await sql.connect(dbConfig);

    const result = await pool.request()
      .input('service_name', sql.NVarChar, serviceName)
      .query(`
        SELECT * FROM CardiacServices
        WHERE service_name = @service_name AND is_active = 1
      `);

    if (result.recordset.length === 0) {
      return new Response(JSON.stringify({ message: 'Service not found' }), { status: 404 });
    }

    const dbRecord = result.recordset[0];

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

    try {
      if (dbRecord.attendance_info) {
        attendanceOptions = JSON.parse(dbRecord.attendance_info);
      }
      if (dbRecord.program_services) {
        programServices = JSON.parse(dbRecord.program_services);
      }
    } catch (parseError) {
      console.error('Error parsing info:', parseError);
    }

    const formattedData = {
      serviceName: dbRecord.service_name,
      website: dbRecord.website,
      primaryCoordinator: dbRecord.primary_coordinator,
      streetAddress: dbRecord.street_address,
      directions: dbRecord.directions,
      phone: dbRecord.phone_number,
      email: dbRecord.email,
      fax: dbRecord.fax,
      programType: dbRecord.program_type,
      certification: {
        providerCertification: dbRecord.provider_certification,
        programCertification: dbRecord.program_certification,
      },
      silentListing: dbRecord.silent_listing,
      programTypes: dbRecord.program_types ? dbRecord.program_types.split(',') : [],
      description: dbRecord.description,
      attendanceOptions: attendanceOptions,
      programServices: programServices,
      exercise: dbRecord.exercise_info,
      education: dbRecord.education_info,
      deliveryTypes: dbRecord.delivery_type ? dbRecord.delivery_type.split(',') : [],
      deliveryTypeConfigs: deliveryTypeConfigs,
      hybridDescription: dbRecord.hybrid_description,
      enrollment: dbRecord.enrollment_info,
      interpreterAvailable: dbRecord.interpreter_available,
      specialConditionsSupport: dbRecord.special_conditions_support,
      lat: dbRecord.lat,
      lng: dbRecord.lng,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at
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
  const { serviceName } = params;
  const formData = await req.json();

  try {
    const pool = await sql.connect(dbConfig);

    const updateQuery = `
      UPDATE CardiacServices
      SET
        website = @website,
        primary_coordinator = @primary_coordinator,
        street_address = @street_address,
        directions = @directions,
        phone_number = @phone_number,
        email = @email,
        fax = @fax,
        program_type = @program_type,
        provider_certification = @provider_certification,
        program_certification = @program_certification,
        silent_listing = @silent_listing,
        program_types = @program_types,
        description = @description,
        attendance_info = @attendance_info,
        exercise_info = @exercise_info,
        education_info = @education_info,
        program_services = @program_services,
         delivery_type = @delivery_type,
        delivery_type_configs = @delivery_type_configs,
        hybrid_description = @hybrid_description,
        enrollment_info = @enrollment_info,
        interpreter_available = @interpreter_available,
        special_conditions_support = @special_conditions_support,
        lat = @lat,
        lng = @lng,
        updated_at = GETDATE()
      WHERE service_name = @service_name AND is_active = 1
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


    const result = await pool.request()
      .input('service_name', sql.NVarChar, serviceName)
      .input('website', sql.NVarChar, formData.website)
      .input('primary_coordinator', sql.NVarChar, formData.primaryCoordinator)
      .input('street_address', sql.NVarChar, formData.streetAddress)
      .input('directions', sql.NVarChar, formData.directions)
      .input('phone_number', sql.NVarChar, formData.phone)
      .input('email', sql.NVarChar, formData.email)
      .input('fax', sql.NVarChar, formData.fax)
      .input('program_type', sql.NVarChar, formData.programType)
      .input('provider_certification', sql.Bit, formData.certification.providerCertification)
      .input('program_certification', sql.Bit, formData.certification.programCertification)
      .input('silent_listing', sql.Bit, formData.silentListing)
      .input('program_types', sql.NVarChar, formData.programTypes.join(','))
      .input('description', sql.NVarChar, formData.description)
      .input('attendance_info', sql.NVarChar, attendanceInfoJson)
      .input('exercise_info', sql.NVarChar, formData.exercise)
      .input('education_info', sql.NVarChar, formData.education)
      .input('program_services', sql.NVarChar, programServicesJson)
      .input('delivery_type', sql.NVarChar, formData.deliveryTypes.join(','))
      .input('delivery_type_configs', sql.NVarChar, deliveryTypeConfigsJson)
      .input('hybrid_description', sql.NVarChar, 
        formData.deliveryTypes.includes('Hybrid') ? formData.hybridDescription : null)
      .input('enrollment_info', sql.NVarChar, formData.enrollment)
      .input('interpreter_available', sql.NVarChar, formData.interpreterAvailable)
      .input('special_conditions_support', sql.NVarChar, formData.specialConditionsSupport)
      .input('lat', sql.Decimal(10, 8), formData.lat)
      .input('lng', sql.Decimal(11, 8), formData.lng)
      .query(updateQuery);

    if (result.rowsAffected[0] === 0) {
      return new Response(JSON.stringify({ 
        message: 'Service not found or no changes made'
      }), { status: 404 });
    }

    return new Response(JSON.stringify({ 
      message: 'Service updated successfully',
      serviceName: serviceName
    }), { status: 200 });
  } catch (err) {
    console.error("Database error:", err);
    
    let errorMessage = 'Error updating service';
    if (err.number === 547) {
      errorMessage = 'Invalid data provided for one or more fields';
    }
    
    return new Response(JSON.stringify({ 
      message: errorMessage, 
      error: err.message 
    }), { status: 500 });
  }
}