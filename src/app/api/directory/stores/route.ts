import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';

const config = {
    user: 'nhf_azure',
    password: 'w=%Y6^yEjZKHnWMi!7HVueYr*',
    server: 'nhfdev.database.windows.net',
    database: 'Cardiac-Services-Directory-New-Form_NewVersion',
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
};

export async function GET() {
    let pool: sql.ConnectionPool | undefined;
    
    try {
        pool = new sql.ConnectionPool(config);
        await pool.connect();
        
        const result = await pool.request().query`SELECT * FROM [dbo].[CardiacServices] WHERE is_active = 1`; 
        
        // Transform database records to match Store interface
        const transformedStores = result.recordset.map((dbRecord: any) => {
            let enrollmentOptions = {
                notAcceptingReferrals: false
            };
            
            try {
                if (dbRecord.enrollment_options) {
                    const parsed = JSON.parse(dbRecord.enrollment_options);
                    enrollmentOptions = {
                        notAcceptingReferrals: parsed.notAcceptingReferrals || false
                    };
                }
            } catch (parseError) {
                console.error('Error parsing enrollment options:', parseError);
            }
            
            return {
                service_name: dbRecord.service_name,
                street_address: dbRecord.street_address,
                phone_number: dbRecord.phone_number,
                email: dbRecord.email,
                lat: dbRecord.lat?.toString() || '',
                lng: dbRecord.lng?.toString() || '',
                website: dbRecord.website,
                program_type: dbRecord.program_type,
                enrollment_options: enrollmentOptions
            };
        });
        
        return NextResponse.json(transformedStores);
    } catch (err: any) {
        console.error('Database error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}