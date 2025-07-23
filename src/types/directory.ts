export interface Store {
  service_name: string;
  street_address: string;
  phone_number: string;
  email: string;
  lat: string;
  lng: string;
  website: string;
  program_type: 'Public' | 'Private';
  distance?: number;
}

export type ProgramTypeFilter = 'all' | 'public' | 'private';