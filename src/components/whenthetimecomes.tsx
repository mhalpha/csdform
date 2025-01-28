interface FormData {
  // Step 1: Contact Information
  serviceName: string;
  originalServiceName?: string;
  primaryCoordinator: string;
  streetAddress: string;
  directions: string | null;
  phone: string;
  email: string;
  fax: string | null;
  programType: 'Public' | 'Private';
  certification: {
    providerCertification: boolean;
    programCertification: boolean;
  };
  silentListing: boolean;
  lat?: number;
  lng?: number;
  website?: string; // Added website field



  // Step 2: Service Information
  description: string;
  attendance: string;
  exercise: string;
  education: string;
  deliveryTypes: ('F2F Group' | 'Telehealth' | '1:1' | 'Hybrid')[];
  hybridDescription: string;
  enrollment: string;
  interpreterAvailable: 'Yes' | 'No';
  specialConditionsSupport: string | null;
}



const initialValues: FormData = {
  serviceName: '',
  originalServiceName: '',
  primaryCoordinator: '',
  streetAddress: '',
  directions: '',
  phone: '',
  email: '',
  fax: '',
  programType: 'Public',
  certification: {
    providerCertification: false,
    programCertification: false,
  },
  silentListing: false,
  website: '', // Added website field
  description: '',
  attendance: '',
  exercise: '',
  education: '',
  deliveryTypes: [],
  hybridDescription: '',
  enrollment: '',
  interpreterAvailable: 'No',
  specialConditionsSupport: ''
};



// Updated function to use underscores
const formatWebsite = (serviceName: string): string => {
  if (!serviceName) return '';
  // Replace spaces with underscores and prepend service/
  return `service/${serviceName.replace(/\s+/g, '_').toLowerCase()}`;
};



// Update the Step1 component to handle website generation
const Step1: React.FC<StepProps> = ({ formik }) => {
  // ... (keep existing useLoadScript and autocomplete setup)



  // Add effect to update website when serviceName changes
  useEffect(() => {
    const website = formatWebsite(formik.values.serviceName);
    formik.setFieldValue('website', website);
  }, [formik.values.serviceName]);



  // Rest of the Step1 component remains the same
  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div>
          <Label htmlFor="serviceName">Service Name *</Label>
          <Input
            id="serviceName"
            {...formik.getFieldProps('serviceName')}
            onChange={(e) => {
              formik.handleChange(e);
              const website = formatWebsite(e.target.value);
              formik.setFieldValue('website', website);
            }}
          />
          {formik.touched.serviceName && formik.errors.serviceName && (
            <div className="text-red-500 text-sm mt-1">{formik.errors.serviceName}</div>
          )}
        </div>



        {/* Show the generated website field (optional, for debugging) */}
        <div>
          <Label htmlFor="website">Generated Website Path</Label>
          <Input
            id="website"
            value={formik.values.website}
            disabled
            className="bg-gray-100"
          />
        </div>



        {/* Rest of the form fields remain the same */}
        {/* ... */}
      </div>
    </div>
  );
};



// Rest of the code remains the same