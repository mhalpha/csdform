import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
    try {
        const pool = await getPool();

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
    }
}