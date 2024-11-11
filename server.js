require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors'); // Import CORS
const app = express();

// Middleware to parse JSON
app.use(express.json());
app.use(cors()); // Use CORS middleware

// Database configuration with direct values
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

// Helper function to map form data to SQL schema and insert data
async function insertFormData(formData) {
    try {
        const pool = await sql.connect(dbConfig);

        // Map data for `serviceTypes`
        const serviceTypesMapping = {
            'Cardiac Rehabilitation – Inpatient': 'centre_service_rehab_inpatient',
            'Cardiac Rehabilitation – Outpatient': 'centre_service_rehab_outpatient',
            'Cardiac Rehabilitation – Maintenance': 'centre_service_rehab_maintenance',
            'Heart Failure Management': 'centre_service_heartfail',
            'Chronic Disease Management (that caters for cardiac patients)': 'centre_service_chronic',
        };

        // Transform serviceTypes into individual columns, checking for description content
        const serviceTypes = {};
        for (const type of formData.serviceTypes) {
            const columnName = serviceTypesMapping[type];
            const descriptionText = formData.serviceDescriptions[type];

            // If description text is provided, use that, otherwise use 'Yes'
            serviceTypes[columnName] = descriptionText && descriptionText.trim() !== '' ? descriptionText : 'Yes';
        }

        // Determine service_type based on the serviceType array
        const serviceType = formData.serviceType; // Assume this is already 'Public' or 'Private'

        // Create a SQL insert query
        const insertQuery = `
            INSERT INTO FormServices 
            (centre_name, centre_coordinator_primary, centre_coordinator_secondary, address, lat, lng, 
            centre_building_name, centre_phone_1, centre_phone_2, centre_fax_1, primary_email, centre_secondary_email, 
            centre_description, centre_service_rehab_inpatient, centre_service_rehab_outpatient, 
            centre_service_rehab_maintenance, centre_service_heartfail, centre_service_chronic, 
            centre_delivery_options, centre_population, centre_diagnosis, centre_procedure, website, service_type)
            VALUES (@centre_name, @centre_coordinator_primary, @centre_coordinator_secondary, @address, @lat, @lng, 
            @centre_building_name, @centre_phone_1, @centre_phone_2, @centre_fax_1, @primary_email, @centre_secondary_email, 
            @centre_description, @centre_service_rehab_inpatient, @centre_service_rehab_outpatient, 
            @centre_service_rehab_maintenance, @centre_service_heartfail, @centre_service_chronic, 
            @centre_delivery_options, @centre_population, @centre_diagnosis, @centre_procedure, @website, @service_type);
        `;

        // Execute the query
        await pool.request()
            .input('centre_name', sql.NVarChar, formData.serviceName)
            .input('centre_coordinator_primary', sql.NVarChar, formData.primaryCoordinator)
            .input('centre_coordinator_secondary', sql.NVarChar, formData.secondaryCoordinator)
            .input('address', sql.NVarChar, formData.streetAddress)
            .input('lat', sql.Float, formData.lat) // Ensure lat and lng are available in formData
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
            .input('service_type', sql.NVarChar, serviceType) // Send 'Public' or 'Private'
            .query(insertQuery);

        return { success: true };
    } catch (err) {
        console.error("Database error: ", err);
        return { success: false, error: err.message };
    }
}

// Endpoint to receive form submission
app.post('/submit-form', async (req, res) => {
    const formData = req.body;
    const result = await insertFormData(formData);

    if (result.success) {
        res.status(200).json({ message: 'Form submitted successfully' });
    } else {
        res.status(500).json({ message: 'Error submitting form', error: result.error });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
