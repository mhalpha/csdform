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

export async function POST(req) {
  const formData = await req.json(); // Parse request body in App Router
  
  try {
    const pool = await sql.connect(dbConfig);

    const serviceTypesMapping = {
      'Cardiac Rehabilitation – Inpatient': 'centre_service_rehab_inpatient',
      'Cardiac Rehabilitation – Outpatient': 'centre_service_rehab_outpatient',
      'Cardiac Rehabilitation – Maintenance': 'centre_service_rehab_maintenance',
      'Heart Failure Management': 'centre_service_heartfail',
      'Chronic Disease Management (that caters for cardiac patients)': 'centre_service_chronic',
    };

    const serviceTypes = {};
    for (const type of formData.serviceTypes) {
      const columnName = serviceTypesMapping[type];
      const descriptionText = formData.serviceDescriptions[type];
      serviceTypes[columnName] = descriptionText && descriptionText.trim() !== '' ? descriptionText : 'Yes';
    }

    const insertQuery = `
      INSERT INTO FormServices (
        centre_name, centre_coordinator_primary, centre_coordinator_secondary, address, lat, lng,
        centre_building_name, centre_phone_1, centre_phone_2, centre_fax_1, primary_email, centre_secondary_email,
        centre_description, centre_service_rehab_inpatient, centre_service_rehab_outpatient,
        centre_service_rehab_maintenance, centre_service_heartfail, centre_service_chronic,
        centre_delivery_options, centre_population, centre_diagnosis, centre_procedure, website, service_type
      ) VALUES (
        @centre_name, @centre_coordinator_primary, @centre_coordinator_secondary, @address, @lat, @lng,
        @centre_building_name, @centre_phone_1, @centre_phone_2, @centre_fax_1, @primary_email, @centre_secondary_email,
        @centre_description, @centre_service_rehab_inpatient, @centre_service_rehab_outpatient,
        @centre_service_rehab_maintenance, @centre_service_heartfail, @centre_service_chronic,
        @centre_delivery_options, @centre_population, @centre_diagnosis, @centre_procedure, @website, @service_type
      )
    `;

    await pool.request()
      .input('centre_name', sql.NVarChar, formData.serviceName)
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
      .input('centre_service_rehab_inpatient', sql.NVarChar, serviceTypes['centre_service_rehab_inpatient'])
      .input('centre_service_rehab_outpatient', sql.NVarChar, serviceTypes['centre_service_rehab_outpatient'])
      .input('centre_service_rehab_maintenance', sql.NVarChar, serviceTypes['centre_service_rehab_maintenance'])
      .input('centre_service_heartfail', sql.NVarChar, serviceTypes['centre_service_heartfail'])
      .input('centre_service_chronic', sql.NVarChar, serviceTypes['centre_service_chronic'])
      .input('centre_delivery_options', sql.NVarChar, formData.deliveryModes.join(', '))
      .input('centre_population', sql.NVarChar, formData.specialGroups.join(', '))
      .input('centre_diagnosis', sql.NVarChar, [...formData.diagnosisOptions, formData.otherDiagnosis].join(', '))
      .input('centre_procedure', sql.NVarChar, [...formData.procedureOptions, formData.otherProcedure].join(', '))
      .input('website', sql.NVarChar, `service.php?${formData.serviceName.replace(/\s+/g, '_')}`)
      .input('service_type', sql.NVarChar, formData.serviceType)
      .query(insertQuery);

    return new Response(JSON.stringify({ message: 'Form submitted successfully' }), { status: 200 });
  } catch (err) {
    console.error("Database error:", err);
    return new Response(JSON.stringify({ message: 'Error submitting form', error: err.message }), { status: 500 });
  }
}
