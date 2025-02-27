// src/types/cardiacService.ts
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
  programType: string;
  certification: {
    providerCertification: boolean;
    programCertification: boolean;
  };
  silentListing: boolean;
  programTypes: string[];
  description: string;
  attendanceOptions: {
    coronaryHeartDisease: boolean;
    heartFailure: boolean;
    heartRhythmProblems: boolean;
    deviceInsertion: boolean;
    other: boolean;
    otherSpecify: string | null;
  };
  programServices: {
    exerciseOnly: boolean;
    educationOnly: boolean;
    exerciseAndEducation: boolean;
    other: boolean;
    otherSpecify: string | null;
  };
  exercise?: string;
  education?: string;
  deliveryTypes: string[];
  deliveryTypeConfigs: Record<string, any>;
  hybridDescription?: string;
  enrollment: string;
  interpreterAvailable: string;
  specialConditionsSupport?: string;
  lat?: number;
  lng?: number;
}

export interface EditingField {
  row: number;
  field: string;
  originalValue: any;
}

export type CardiacServiceField = keyof CardiacService;