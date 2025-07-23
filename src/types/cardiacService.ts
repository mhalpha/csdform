

export interface CardiacService {

  [key: string]: any; // Add index signature

  serviceName: string;

  website: string;

  primaryCoordinator: string;

  streetAddress: string;

  directions?: string;

  phone: string;

  email: string;

  fax?: string;

  programType: 'Public' | 'Private'; // Strictly typed

  certification: {

    providerCertification: boolean;

    programCertification: boolean;

  };

  silentListing: boolean;

  programTypes: string[];

  description: string;

  attendanceOptions: {

    coronaryHeartDisease?: boolean; // Made optional

    heartFailure?: boolean;

    heartRhythmProblems?: boolean;

    deviceInsertion?: boolean;

    other?: boolean;

    otherSpecify?: string | null;

  };

  programServices: {

    exerciseOnly?: boolean; // Made optional

    educationOnly?: boolean;

    exerciseAndEducation?: boolean;

    other?: boolean;

    otherSpecify?: string | null;

  };

  exercise?: string;

  education?: string;

  deliveryTypes: string[];

  deliveryTypeConfigs: Record<string, any>;

  hybridDescription?: string;

  f2fDescription?: string; // Added missing fields

  telehealthDescription?: string;

  individualDescription?: string;

  enrollmentOptions?: { // Added missing field

    selfReferral?: boolean;

    gpReferral?: boolean;

    hospitalReferral?: boolean;

    other?: boolean;

    otherSpecify?: string;

    notAcceptingReferrals?: boolean;

  };

  enrollment: string;

  interpreterAvailable: string;

  specialConditionsSupport?: string;

  privacyStatement?: string; // Added privacy statement

  lat?: number;

  lng?: number;

}

// Store interface for directory (matching your other file)

export interface Store {

  id: number;

  service_name: string; // Required

  website: string; // Required

  street_address: string; // Required

  phone_number: string; // Required

  email: string; // Required

  program_type: 'Public' | 'Private'; // Required and strictly typed

  lat: string; // Required

  lng: string; // Required

  distance?: number; // Optional - calculated field

  description?: string;

  primary_coordinator?: string;

}

export interface EditingField {

  row: number;

  field: string;

  originalValue: any;

}

export type CardiacServiceField = keyof CardiacService;

export type ProgramTypeFilter = 'all' | 'public' | 'private';
