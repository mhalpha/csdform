import sql from 'mssql';

const dbConfig = {
  user: 'nhf_azure',
  password: '29{w{u4637b7CdWK',
  server: 'nhfdev.database.windows.net',
  database: 'Cardiac-Services-Directory-New-Form',
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

const serviceTypesMapping = {
  'Cardiac Rehabilitation – Inpatient': 'centre_service_rehab_inpatient',
  'Cardiac Rehabilitation – Outpatient': 'centre_service_rehab_outpatient',
  'Cardiac Rehabilitation – Maintenance': 'centre_service_rehab_maintenance',
  'Heart Failure Management': 'centre_service_heartfail',
  'Chronic Disease Management (that caters for cardiac patients)': 'centre_service_chronic',
};

export async function GET(req, { params }) {
  // Awaiting params for dynamic API route
  const { serviceName } = await params;

  try {
    const pool = await sql.connect(dbConfig);

    // Fetch service data
    const result = await pool.request()
      .input('centre_name', sql.NVarChar, serviceName)
      .query(`
        SELECT * FROM FormServices
        WHERE centre_name = @centre_name
      `);

    if (result.recordset.length === 0) {
      return new Response(JSON.stringify({ message: 'Service not found' }), { status: 404 });
    }

    const dbRecord = result.recordset[0];
    const serviceTypes = [];
    const serviceDescriptions = {};

    for (const [key, column] of Object.entries(serviceTypesMapping)) {
      if (dbRecord[column]) {
        serviceTypes.push(key);
        serviceDescriptions[key] =
          dbRecord[column] === 'Yes' ? '' : dbRecord[column];
      }
    }

    const formattedData = {
      serviceName: dbRecord.centre_name,
      primaryCoordinator: dbRecord.centre_coordinator_primary,
      secondaryCoordinator: dbRecord.centre_coordinator_secondary || '',
      streetAddress: dbRecord.address,
      buildingName: dbRecord.centre_building_name || '',
      phone1: dbRecord.centre_phone_1,
      phone2: dbRecord.centre_phone_2 || '',
      fax1: dbRecord.centre_fax_1 || '',
      fax2: dbRecord.centre_fax_2 || '',
      primaryEmail: dbRecord.primary_email,
      secondaryEmail: dbRecord.centre_secondary_email || '',
      serviceDescription: dbRecord.centre_description,
      serviceTypes,
      serviceDescriptions,
      deliveryModes: dbRecord.centre_delivery_options
        ? dbRecord.centre_delivery_options.split(', ')
        : [],
      specialGroups: dbRecord.centre_population
        ? dbRecord.centre_population.split(', ')
        : [],
      diagnosisOptions: dbRecord.centre_diagnosis
        ? dbRecord.centre_diagnosis.split('|').filter((d) => !d.startsWith('Other:'))
        : [],
      otherDiagnosis: dbRecord.centre_diagnosis
        ? (dbRecord.centre_diagnosis.split('|').find((d) => d.startsWith('Other:')) || '').replace('Other: ', '')
        : '',
      procedureOptions: dbRecord.centre_procedure
        ? dbRecord.centre_procedure.split('|').filter((p) => !p.startsWith('Other:'))
        : [],
      otherProcedure: dbRecord.centre_procedure
        ? (dbRecord.centre_procedure.split('|').find((p) => p.startsWith('Other:')) || '').replace('Other: ', '')
        : '',
      lat: dbRecord.lat,
      lng: dbRecord.lng,
      serviceType: dbRecord.service_type || 'Public',
    };

    return new Response(JSON.stringify(formattedData), { status: 200 });
  } catch (err) {
    console.error("Database error:", err);
    return new Response(JSON.stringify({ message: 'Database error', error: err.message }), { status: 500 });
  }
}

export async function PUT(req, { params }) {
  // Awaiting params for dynamic API route
  const { serviceName } = await params;
  const formData = await req.json();

  try {
    const pool = await sql.connect(dbConfig);

    const serviceTypes = {};
    for (const type of formData.serviceTypes) {
      const columnName = serviceTypesMapping[type];
      const descriptionText = formData.serviceDescriptions[type];
      serviceTypes[columnName] = descriptionText && descriptionText.trim() !== '' ? descriptionText : 'Yes';
    }

    const updateQuery = `
      UPDATE FormServices
      SET
        centre_coordinator_primary = @centre_coordinator_primary,
        centre_coordinator_secondary = @centre_coordinator_secondary,
        address = @address,
        lat = @lat,
        lng = @lng,
        centre_building_name = @centre_building_name,
        centre_phone_1 = @centre_phone_1,
        centre_phone_2 = @centre_phone_2,
        centre_fax_1 = @centre_fax_1,
        primary_email = @primary_email,
        centre_secondary_email = @centre_secondary_email,
        centre_description = @centre_description,
        centre_service_rehab_inpatient = @centre_service_rehab_inpatient,
        centre_service_rehab_outpatient = @centre_service_rehab_outpatient,
        centre_service_rehab_maintenance = @centre_service_rehab_maintenance,
        centre_service_heartfail = @centre_service_heartfail,
        centre_service_chronic = @centre_service_chronic,
        centre_delivery_options = @centre_delivery_options,
        centre_population = @centre_population,
        centre_diagnosis = @centre_diagnosis,
        centre_procedure = @centre_procedure,
        service_type = @service_type
      WHERE centre_name = @centre_name
    `;

    await pool.request()
      .input('centre_name', sql.NVarChar, serviceName)
      .input('centre_coordinator_primary', sql.NVarChar, formData.primaryCoordinator)
      .input('centre_coordinator_secondary', sql.NVarChar, formData.secondaryCoordinator)
      .input('address', sql.NVarChar, formData.streetAddress)
      .input('lat', sql.Float, formData.lat)
      .input('lng', sql.Float, formData.lng)
      .input('centre_building_name', sql.NVarChar, formData.buildingName)
      .input('centre_phone_1', sql.NVarChar, formData.phone1)
      .input('centre_phone_2', sql.NVarChar, formData.phone2)
      .input('centre_fax_1', sql.NVarChar, formData.fax1)
      .input('primary_email', sql.NVarChar, formData.primaryEmail)
      .input('centre_secondary_email', sql.NVarChar, formData.secondaryEmail)
      .input('centre_description', sql.NVarChar, formData.serviceDescription)
      .input('centre_service_rehab_inpatient', sql.NVarChar, serviceTypes['centre_service_rehab_inpatient'] || null)
      .input('centre_service_rehab_outpatient', sql.NVarChar, serviceTypes['centre_service_rehab_outpatient'] || null)
      .input('centre_service_rehab_maintenance', sql.NVarChar, serviceTypes['centre_service_rehab_maintenance'] || null)
      .input('centre_service_heartfail', sql.NVarChar, serviceTypes['centre_service_heartfail'] || null)
      .input('centre_service_chronic', sql.NVarChar, serviceTypes['centre_service_chronic'] || null)
      .input('centre_delivery_options', sql.NVarChar, formData.deliveryModes.join(', '))
      .input('centre_population', sql.NVarChar, formData.specialGroups.join(', '))
      .input('centre_diagnosis', sql.NVarChar, [
        ...formData.diagnosisOptions,
        formData.otherDiagnosis ? `Other: ${formData.otherDiagnosis}` : null
      ].filter(Boolean).join('|'))
      .input('centre_procedure', sql.NVarChar, [
        ...formData.procedureOptions,
        formData.otherProcedure ? `Other: ${formData.otherProcedure}` : null
      ].filter(Boolean).join('|'))
      .input('service_type', sql.NVarChar, formData.serviceType)
      .query(updateQuery);

    return new Response(JSON.stringify({ message: 'Service updated successfully' }), { status: 200 });
  } catch (err) {
    console.error("Database error:", err);
    return new Response(JSON.stringify({ message: 'Database error', error: err.message }), { status: 500 });
  }
}