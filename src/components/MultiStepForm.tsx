'use client'
import React, { useEffect, useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLoadScript } from '@react-google-maps/api';
import { Library as GoogleMapsLibrary } from '@googlemaps/js-api-loader';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, AlertCircle, ExternalLink, Download } from "lucide-react";
import axios from 'axios';
import { useParams } from 'next/navigation';
import { DeliveryType, DeliveryTypeConfig, DeliveryTypesSection } from './DeliveryTypesSection';
import PrivacyPolicySection from './PrivacyPolicySection';

export interface EnrollmentOptions {
  selfReferral: boolean;
  gpReferral: boolean;
  hospitalReferral: boolean;
  other: boolean;
  otherSpecify: string;
  notAcceptingReferrals: boolean;
}

// Enhanced caching with better key generation
const serviceNameValidationCache = new Map<string, boolean>();

// Improved cache key generation
const getCacheKey = (website: string, originalWebsite?: string) => {
  const normalizedWebsite = website.toLowerCase().trim();
  const normalizedOriginal = originalWebsite?.toLowerCase().trim() || 'new';
  return `${normalizedWebsite}|${normalizedOriginal}`;
};

// Enhanced formatWebsite function with proper normalization
const formatWebsite = (serviceName: string): string => {
  if (!serviceName) return '';
  
  // First normalize spaces and trim
  const normalized = serviceName.replace(/\s+/g, ' ').trim();
  
  // Then format for URL
  return normalized
    .replace(/\s+/g, '-')
    .replace(/[\/\\?%*:|"<>]/g, '-') 
    .replace(/-+/g, '-') // Replace multiple consecutive hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .toLowerCase();
};

// Enhanced debounced validation with better error handling
const checkServiceNameExistsDebounced = (() => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (website: string, currentWebsite?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Normalize inputs for consistent comparison
      const normalizedWebsite = website.toLowerCase().trim();
      const normalizedCurrent = currentWebsite?.toLowerCase().trim();
      
      const cacheKey = getCacheKey(normalizedWebsite, normalizedCurrent);
      
      // Check cache first
      if (serviceNameValidationCache.has(cacheKey)) {
        resolve(serviceNameValidationCache.get(cacheKey)!);
        return;
      }
      
      // If in edit mode and website hasn't changed, no conflict
      if (normalizedCurrent && normalizedWebsite === normalizedCurrent) {
        serviceNameValidationCache.set(cacheKey, false);
        resolve(false);
        return;
      }
      
      // Empty website check
      if (!normalizedWebsite) {
        resolve(false);
        return;
      }
      
      timeoutId = setTimeout(async () => {
        try {
          const encodedWebsite = encodeURIComponent(normalizedWebsite);
          const response = await axios.get(`/api/1241029013026-service/${encodedWebsite}`);
          
          // Service exists
          serviceNameValidationCache.set(cacheKey, true);
          resolve(true);
        } catch (error: any) {
          if (error.response?.status === 404) {
            // Service doesn't exist
            serviceNameValidationCache.set(cacheKey, false);
            resolve(false);
          } else {
            // Network error - assume no conflict to avoid blocking user
            console.warn('Service validation error:', error);
            serviceNameValidationCache.set(cacheKey, false);
            resolve(false);
          }
        }
      }, 300);
    });
  };
})();

// Updated validation function with proper normalization
const checkServiceNameExists = async (serviceName: string, currentServiceName?: string) => {
 if (!serviceName) return false;
 try {
   // Normalize service name for comparison
   const normalizedServiceName = serviceName.replace(/\s+/g, ' ').trim();
   // If in edit mode and service name hasn't changed, no conflict
   if (currentServiceName && normalizedServiceName.toLowerCase() === currentServiceName.toLowerCase()) {
     return false;
   }
   // Check against actual service_name in database
   const encodedServiceName = encodeURIComponent(normalizedServiceName);
   const response = await axios.get(`/api/check-service-name/${encodedServiceName}`);
   return true; // Service name exists
 } catch (error: any) {
   if (error.response?.status === 404) {
     return false; // Service name doesn't exist
   }
   return false;
 }
};

interface FormData {
  // Step 1: Contact Information
  serviceName: string;
  originalWebsite?: string; // Changed from originalServiceName to originalWebsite
  primaryCoordinator: string;
  streetAddress: string;
  directions: string | null;
  phone: string;
  email: string;
  fax: string | null;
  programType: 'Public' | 'Private';
  certification: {
    providerCertification: boolean;
    // programCertification: boolean; // COMMENTED OUT as requested
  };
  // New fields for provider certification verification
  providerCertificationFile?: File | null;
  providerCertificationSubmitted?: boolean;
  certificateFileUrl?: string; // Add this to store existing file URL
  silentListing: boolean;
  lat?: number;
  lng?: number;
  website?: string; 

  // Step 2: Service Information
  programTypes: ('Cardiac Rehabilitation Program' | 'Heart Failure Program' | 'Cardiac Rehabilitation & Heart Failure Program')[];
  description: string;
  attendanceOptions: {
    coronaryHeartDisease: boolean;
    heartFailure: boolean;
    heartRhythmProblems: boolean;
    deviceInsertion: boolean;
    other: boolean;
    otherSpecify: string;
  };
  programServices: {
    exerciseOnly: boolean;
    educationOnly: boolean;
    exerciseAndEducation: boolean;
    other: boolean;
    otherSpecify: string;
  };
  exercise: string;
  education: string;
  deliveryTypes: DeliveryType[];
  hybridDescription: string;
  f2fDescription: string;
  telehealthDescription: string;
  individualDescription: string;
  enrollment: string;
  enrollmentOptions: EnrollmentOptions;
  interpreterAvailable: 'Yes' | 'No';
  deliveryTypeConfigs: {
    [key in DeliveryType]?: DeliveryTypeConfig;
  };
  specialConditionsSupport: string | null;
  privacyPolicyAccepted: boolean;
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyAm-eP8b7-FH2A8nzYucTG9NcPTz0OiAX0';
const LIBRARIES: GoogleMapsLibrary[] = ["places"];

const initialValues: FormData = {
  serviceName: '',
  originalWebsite: '', // Changed from originalServiceName
  primaryCoordinator: '',
  streetAddress: '',
  directions: '',
  phone: '',
  email: '',
  fax: '',
  programType: 'Public',
  certification: {
    providerCertification: false,
    // programCertification: false, // COMMENTED OUT
  },
  providerCertificationFile: null,
  providerCertificationSubmitted: false,
  certificateFileUrl: '', // Add this
  silentListing: false,
  programTypes: [],
  description: '',
  attendanceOptions: {
    coronaryHeartDisease: false,
    heartFailure: false,
    heartRhythmProblems: false,
    deviceInsertion: false,
    other: false,
    otherSpecify: ''
  },
  programServices: {
    exerciseOnly: false,
    educationOnly: false,
    exerciseAndEducation: false,
    other: false,
    otherSpecify: ''
  },
  exercise: '', 
  education: '', 
  deliveryTypes: [],
  hybridDescription: '',
  f2fDescription: '',
  telehealthDescription: '',
  individualDescription: '',
  enrollmentOptions: {
    selfReferral: false,
    gpReferral: false,
    hospitalReferral: false,
    other: false,
    otherSpecify: '',
    notAcceptingReferrals: false
  },
  deliveryTypeConfigs: {},
  interpreterAvailable: 'No',
  specialConditionsSupport: '',
  website: '',
  enrollment: '',
  privacyPolicyAccepted: false
};

// Enhanced validation schemas with better error handling
const validationSchemas = [
  // Step 1
  Yup.object({
    serviceName: Yup.string()
      .required('Service name is required')
      .test(
        'no-forward-slashes',
        'Service name cannot contain forward slashes (/)',
        function(value) {
          return !value || !value.includes('/');
        }
      )
      .test({
        name: 'unique-service-name',
        message: 'A service with this name already exists',
        test: async function(value: any) {
          if (!value || typeof value !== 'string') return true;
          
          // Get the formatted website value for this service name
          const website = formatWebsite(value);
          // Get the original website for comparison (in edit mode)
          const originalWebsite = this.parent.originalWebsite;
          
          // If in edit mode and the website hasn't changed, validation passes
          if (originalWebsite && website.toLowerCase() === originalWebsite.toLowerCase()) {
            return true;
          }
          
          try {
            // Check if a service with this website exists
            const exists = await checkServiceNameExists(value, originalWebsite);
            return !exists;
          } catch (error) {
            console.warn('Validation error:', error);
            return true; // Don't block submission on validation errors
          }
        }
      }),
    primaryCoordinator: Yup.string().required('Primary coordinator is required'),
    streetAddress: Yup.string().required('Street address is required'),
    directions: Yup.string(),
    phone: Yup.string()
      .matches(/^\d+$/, 'Phone number must contain only numbers')
      .required('Phone is required'),
    email: Yup.string()
      .email('Invalid email format')
      .required('Email is required'),
    fax: Yup.string()
      .matches(/^\d+$/, 'Fax number must contain only numbers'),
    programType: Yup.string()
       .oneOf(['Public', 'Private'], 'Please select either Public or Private')
      .required('Program type is required'),
    // Updated provider certification validation
    providerCertificationFile: Yup.mixed().when('certification.providerCertification', {
      is: true,
      then: (schema) => schema.test(
        'file-required',
        'Please upload your provider certification document',
        function(value) {
          // In edit mode, if there's an existing file URL and no new file selected, that's okay
          if (this.parent.certificateFileUrl && !value) {
            return true;
          }
          // Otherwise, require a file
          return !!value;
        }
      ),
      otherwise: (schema) => schema.notRequired()
    })
  }),

  // Step 2
  Yup.object({
    programTypes: Yup.array()
    .min(1, 'Please select at least one program type')
    .of(
      Yup.string().oneOf([
        'Cardiac Rehabilitation Program',
        'Heart Failure Program',
        'Cardiac Rehabilitation & Heart Failure Program',
      ])
    ),
    description: Yup.string().required('Description is required'),
    attendanceOptions: Yup.object({
      coronaryHeartDisease: Yup.boolean(),
      heartFailure: Yup.boolean(),
      heartRhythmProblems: Yup.boolean(),
      deviceInsertion: Yup.boolean(),
      other: Yup.boolean(),
      otherSpecify: Yup.string().when('other', {
        is: true,
        then: (schema) => schema.required('Please specify the other condition'),
        otherwise: (schema) => schema.notRequired()
      })
    }).test(
      'at-least-one-selected', 
      'Please select at least one attendance option', 
      (value) => {
        return value.coronaryHeartDisease || 
               value.heartFailure || 
               value.heartRhythmProblems || 
               value.deviceInsertion || 
               value.other;
      }
    ),
    programServices: Yup.object({
      exerciseOnly: Yup.boolean(),
      educationOnly: Yup.boolean(),
      exerciseAndEducation: Yup.boolean(),
      other: Yup.boolean(),
      otherSpecify: Yup.string().when('other', {
        is: true,
        then: (schema) => schema.required('Please specify other services'),
        otherwise: (schema) => schema.notRequired()
      })
    }).test(
      'at-least-one-selected', 
      'Please select at least one service type', 
      (value) => {
        return value.exerciseOnly || 
               value.educationOnly || 
               value.exerciseAndEducation || 
               value.other;
      }
    ),
    exercise: Yup.string().when('programServices.exerciseOnly', {
      is: true,
      then: (schema) => schema.required('Please provide exercise details'),
      otherwise: (schema) => schema.notRequired()
    }),
    education: Yup.string().when('programServices.educationOnly', {
      is: true,
      then: (schema) => schema.required('Please provide education details'),
      otherwise: (schema) => schema.notRequired()
    }),
    deliveryTypes: Yup.array()
          .min(1, 'At least one delivery type is required')
          .of(Yup.string().oneOf(['F2F Group', 'Telehealth', '1:1', 'Hybrid'])),
        hybridDescription: Yup.string()
          .when('deliveryTypes', {
            is: (deliveryTypes: string[]) => deliveryTypes.includes('Hybrid'),
            then: (schema) => schema.required('Hybrid description is required when Hybrid is selected'),
            otherwise: (schema) => schema.default('')
          }),
          f2fDescription: Yup.string()
          .when('deliveryTypes', {
            is: (deliveryTypes: string[]) => deliveryTypes.includes('F2F Group'),
            then: (schema) => schema.required('Face to face program description is required'),
            otherwise: (schema) => schema.default('')
          }),
        telehealthDescription: Yup.string()
          .when('deliveryTypes', {
            is: (deliveryTypes: string[]) => deliveryTypes.includes('Telehealth'),
            then: (schema) => schema.required('Telehealth program description is required'),
            otherwise: (schema) => schema.default('')
          }),
        individualDescription: Yup.string()
          .when('deliveryTypes', {
            is: (deliveryTypes: string[]) => deliveryTypes.includes('1:1'),
            then: (schema) => schema.required('Individual program description is required'),
            otherwise: (schema) => schema.default('')
          }),
          deliveryTypeConfigs: Yup.object().test(
            'delivery-configs',
            'Configuration required for selected delivery types',
            function(value: { [key in DeliveryType]?: DeliveryTypeConfig }, context) {
              const deliveryTypes = context.parent.deliveryTypes as DeliveryType[];
              if (!deliveryTypes?.length) return true;
          
              for (const type of deliveryTypes) {
                const config = value[type as DeliveryType];
                
                if (!config?.duration) {
                  return this.createError({
                    message: `Program length is required for ${type}`
                  });
                }
                
                if (config.duration === 'Other' && !config.customDuration) {
                  return this.createError({
                    message: `Custom program length is required when "Other" is selected`
                  });
                }
                
                if (!config.schedule || Object.keys(config.schedule).length === 0) {
                  return this.createError({
                    message: `Please select at least one day for ${type}`
                  });
                }
                
                for (const day in config.schedule) {
                  const timeInfo = config.schedule[day];
                  if (!timeInfo.startHour || !timeInfo.startMinute || !timeInfo.startAmPm ||
                      !timeInfo.endHour || !timeInfo.endMinute || !timeInfo.endAmPm) {
                    return this.createError({
                      message: `Please provide complete time information for ${day} in ${type}`
                    });
                  }
                }
              }
              
              return true;
            }
          ),
enrollmentOptions: Yup.object().test(
  'at-least-one-selected', 
  'Please select at least one enrolment option', 
  function(value: any) {
    const options = value as EnrollmentOptions;
    
    if (options.notAcceptingReferrals) {
      return true;
    }
    
    return options.selfReferral || 
           options.gpReferral || 
           options.hospitalReferral || 
           options.other;
  }
).shape({
  selfReferral: Yup.boolean(),
  gpReferral: Yup.boolean(),
  hospitalReferral: Yup.boolean(),
  other: Yup.boolean(),
  notAcceptingReferrals: Yup.boolean(),
  otherSpecify: Yup.string().when('other', {
    is: true,
    then: (schema) => schema.required('Please specify other enrolment options'),
    otherwise: (schema) => schema.notRequired()
  })
}),
          
      
          enrollment: Yup.string().required('Enrolment information is required'),
    interpreterAvailable: Yup.string()
          .oneOf(['Yes', 'No'])
          .required('Please specify interpreter availability'),

          privacyPolicyAccepted: Yup.boolean()
          .oneOf([true], 'You must accept the privacy policy')
          .required('You must accept the privacy policy')
      }),
];

interface StepProps {
  formik: any;
}

// Updated File Upload Component with existing file display
const FileUpload: React.FC<{
  file: File | null;
  existingFileUrl?: string;
  onFileSelect: (file: File | null) => void;
  error?: string;
  required?: boolean;
  isEditMode?: boolean;
}> = ({ file, existingFileUrl, onFileSelect, error, required, isEditMode }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    onFileSelect(selectedFile);
  };

  const getFileName = (url: string) => {
    return url.split('/').pop() || 'certificate-file';
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="certificationFile" className="flex items-center gap-2">
        Upload Provider Certification Document {required && '*'}
        <Upload className="w-4 h-4" />
      </Label>
      
      {/* Show existing file in edit mode */}
      {isEditMode && existingFileUrl && !file && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Current Certificate File</p>
                <p className="text-sm text-blue-700">{getFileName(existingFileUrl)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open(existingFileUrl, '_blank')}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                View
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = existingFileUrl;
                  link.download = getFileName(existingFileUrl);
                  link.click();
                }}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Upload a new file below to replace the current certificate
          </p>
        </div>
      )}

      {/* File upload area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
        <input
          id="certificationFile"
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept="*/*"
        />
        <label htmlFor="certificationFile" className="cursor-pointer">
          {file ? (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <FileText className="w-5 h-5" />
              <span className="font-medium">{file.name}</span>
              <span className="text-sm text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          ) : (
            <div className="text-gray-500">
              <Upload className="w-8 h-8 mx-auto mb-2" />
              <p>{isEditMode && existingFileUrl ? 'Upload new file to replace current certificate' : 'Click to upload or drag and drop'}</p>
              <p className="text-sm">Any file type accepted</p>
            </div>
          )}
        </label>
      </div>
      
      {file && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onFileSelect(null)}
          className="mt-2"
        >
          Remove new file
        </Button>
      )}
      
      {error && (
        <div className="text-red-500 text-sm mt-1">{error}</div>
      )}
    </div>
  );
};

const Step1: React.FC<StepProps> = ({ formik }) => {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [hasSelectedAddress, setHasSelectedAddress] = useState(false);
  const params = useParams();
  const isEditMode = Boolean(params?.website);

  // Update website field when service name changes with proper normalization
  useEffect(() => {
    const website = formatWebsite(formik.values.serviceName);
    formik.setFieldValue('website', website);
  }, [formik.values.serviceName]);

  useEffect(() => {
    if (isLoaded && !autocomplete && window.google) {
      const input = document.getElementById('streetAddress') as HTMLInputElement;
      if (input) {
        const autocompleteInstance = new google.maps.places.Autocomplete(input, {
          types: ['address'],
          componentRestrictions: { country: 'au' },
        });
        setAutocomplete(autocompleteInstance);

        autocompleteInstance.addListener('place_changed', () => {
          const place = autocompleteInstance.getPlace();
          if (place.geometry) {
            const address = place.formatted_address;
            const lat = place.geometry.location?.lat();
            const lng = place.geometry.location?.lng();

            if (address && lat !== undefined && lng !== undefined) {
              formik.setFieldValue('streetAddress', address);
              formik.setFieldValue('lat', lat);
              formik.setFieldValue('lng', lng);
              setHasSelectedAddress(true);
              formik.setFieldTouched('streetAddress', true);
            }
          }
        });
      }
    }
  }, [isLoaded, autocomplete, formik]);

  // UPDATED: Enhanced service name change handler with proper spacing control
  const handleServiceNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Remove forward slashes completely
    value = value.replace(/\//g, '-');
    
    // Prevent leading spaces
    if (value.startsWith(' ')) {
      value = value.trimStart();
    }
    
    // Replace multiple consecutive spaces with single space, but don't trim end yet
    // This allows user to type but prevents multiple spaces
    value = value.replace(/  +/g, ' ');
    
    // Set the cleaned value
    formik.setFieldValue('serviceName', value);
    
    // Update the website field with the formatted service name (this will handle final trimming)
    const website = formatWebsite(value);
    formik.setFieldValue('website', website);
    
    // Clear validation cache for this field to ensure fresh validation
    const cacheKey = getCacheKey(website, formik.values.originalWebsite);
    serviceNameValidationCache.delete(cacheKey);
  };

  if (!isLoaded) return <div>Loading Google Maps...</div>;
  
  return (
    <div className="space-y-4">
      <div className="grid gap-4">
      <div>
  <Label htmlFor="serviceName">Service name *</Label>
  <div className="text-sm text-muted-foreground opacity-70 -mt-1 mb-1">
    (If you have multiple services with the same name, please include location in the service name. 
    Do not use forward slashes (/) in service names.)
  </div>
  <Input
    id="serviceName"
    value={formik.values.serviceName}
    onChange={handleServiceNameChange}
    onBlur={(e) => {
      // On blur, trim the final value to remove trailing spaces
      const trimmedValue = e.target.value.trim();
      formik.setFieldValue('serviceName', trimmedValue);
      formik.handleBlur(e);
    }}
    name="serviceName"
  />
  {formik.touched.serviceName && formik.errors.serviceName && (
    <div className="text-red-500 text-sm mt-1">{formik.errors.serviceName}</div>
  )}
</div>

        <div>
          <Label htmlFor="primaryCoordinator">Program coordinator name: *</Label>
          <Input
            id="primaryCoordinator"
            {...formik.getFieldProps('primaryCoordinator')}
          />
          {formik.touched.primaryCoordinator && formik.errors.primaryCoordinator && (
            <div className="text-red-500 text-sm mt-1">{formik.errors.primaryCoordinator}</div>
          )}
        </div>

        <div>
          <Label htmlFor="streetAddress">Street address: *</Label>
          <div className="text-sm text-muted-foreground opacity-70 -mt-1 mb-1">
            (No PO Box)
          </div>
          <Input
            id="streetAddress"
            {...formik.getFieldProps('streetAddress')}
          />
        </div>

        <div>
          <Label htmlFor="directions">Directions</Label>
          <div className="text-sm text-muted-foreground opacity-70 -mt-1 mb-1">
            (How to find/where to park etc)
          </div>
          <Textarea
            id="directions"
            {...formik.getFieldProps('directions')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
  <Label htmlFor="phone">Phone number: *</Label>
<div className="text-sm text-muted-foreground opacity-70 -mt-1 mb-1">
  (Please include area code, numbers only)
</div>
<Input
  id="phone"
  type="tel"
  {...formik.getFieldProps('phone')}
  onChange={(e) => {
    // Allow only numeric input and limit to 10 digits
    let numericValue = e.target.value.replace(/\D/g, '');
    if (numericValue.length > 10) {
      numericValue = numericValue.slice(0, 10);
    }
    formik.setFieldValue('phone', numericValue);
  }}
  inputMode="numeric" 
  placeholder="e.g. 0412345678"
/>
{formik.touched.phone && formik.errors.phone && (
  <div className="text-red-500 text-sm mt-1">{formik.errors.phone}</div>
)}
</div>
          <div>
            <Label htmlFor="fax">Fax:</Label>
            
            <Input
              id="fax"
              className='mt-5'
              {...formik.getFieldProps('fax')}
            />
            {formik.touched.fax && formik.errors.fax && (
              <div className="text-red-500 text-sm mt-1">{formik.errors.fax}</div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email: *</Label>
          <div className="text-sm text-muted-foreground opacity-70 -mt-1 mb-1">
            (Generic email preferred)
          </div>
          <Input
            id="email"
            type="email"
            {...formik.getFieldProps('email')}
          />
          {formik.touched.email && formik.errors.email && (
            <div className="text-red-500 text-sm mt-1">{formik.errors.email}</div>
          )}
        </div>

        <div>
  <Label>Program type: *</Label>
  <Select
    value={formik.values.programType}
    onValueChange={(value: any) => formik.setFieldValue('programType', value)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select program type" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="Public">Public</SelectItem>
      <SelectItem value="Private">Private</SelectItem>
    </SelectContent>
  </Select>
  {formik.touched.programType && formik.errors.programType && (
    <div className="text-red-500 text-sm mt-1">{formik.errors.programType}</div>
  )}
</div>

        {/* Updated ACRA/ICCPR certification section */}
        <div>
          <Label>ACRA/ICCPR certification status:</Label>
          
          {/* Information Alert */}
          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Important:</strong> All service information will be submitted and accessible to end users immediately. 
              Provider certification will be reviewed by our team before being verified and displayed.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="providerCertification"
                checked={formik.values.certification.providerCertification}
                onCheckedChange={(checked: boolean | 'indeterminate') => {
                  formik.setFieldValue('certification.providerCertification', checked);
                  formik.setFieldValue('providerCertificationSubmitted', checked);
                  // Clear file if unchecked
                  if (!checked) {
                    formik.setFieldValue('providerCertificationFile', null);
                  }
                }}
              />
              <Label htmlFor="providerCertification">
                I want my service to be ACRA/ICCPR verified (Provider certification)
              </Label>
            </div>
            
            {formik.values.certification.providerCertification && (
              <div className="ml-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="mb-3">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>To get ACRA/ICCPR verification:</strong>
                  </p>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                    <li>Upload your provider certification document</li>
                    <li>Our team will review and verify your certification</li>
                    <li>Your service will show as "ACRA/ICCPR Verified" once approved</li>
                  </ul>
                </div>
                
                <FileUpload
                  file={formik.values.providerCertificationFile}
                  existingFileUrl={formik.values.certificateFileUrl}
                  isEditMode={isEditMode}
                  onFileSelect={(file) => {
                    formik.setFieldValue('providerCertificationFile', file);
                    formik.setFieldTouched('providerCertificationFile', true);
                  }}
                  error={
                    formik.touched.providerCertificationFile && formik.errors.providerCertificationFile
                      ? formik.errors.providerCertificationFile
                      : undefined
                  }
                  required={true}
                />
              </div>
            )}

            {/* COMMENTED OUT PROGRAM CERTIFICATION */}
            {/* <div className="flex items-center space-x-2">
              <Checkbox
                id="programCertification"
                checked={formik.values.certification.programCertification}
                onCheckedChange={(checked: boolean | 'indeterminate') => {
                  formik.setFieldValue('certification.programCertification', checked);
                }}
              />
              <Label htmlFor="programCertification">Program certification</Label>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}

const Step2: React.FC<StepProps> = ({ formik }) => {
  return (
    <div className="space-y-4">
      <div>
        <Label>Program type: *</Label>
        <div className="space-y-2">
          {[
            'Cardiac Rehabilitation Program',
            'Heart Failure Program',
            'Cardiac Rehabilitation & Heart Failure Program',
          ].map((programType) => (
            <div key={programType} className="flex items-center space-x-2">
              <Checkbox
                id={programType}
                checked={formik.values.programTypes.includes(programType)}
                onCheckedChange={(checked: boolean | 'indeterminate') => {
                  const currentTypes = formik.values.programTypes;
                  const newTypes = checked
                    ? [...currentTypes, programType]
                    : currentTypes.filter((type: string) => type !== programType);
                  formik.setFieldValue('programTypes', newTypes);
                }}
              />
              <Label htmlFor={programType}>{programType}</Label>
            </div>
          ))}
        </div>
        {formik.touched.programTypes && formik.errors.programTypes && (
          <div className="text-red-500 text-sm mt-1">
            {formik.errors.programTypes}
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="description">Program description: *</Label>
        <Textarea
          id="description"
          placeholder="Please describe your program and the benefits to heart health; eg. This program is here to support you as you regain confidence and step back into life after a cardiac event."
          className="placeholder:italic placeholder:text-muted-foreground placeholder:opacity-70"
          {...formik.getFieldProps('description')}
        />
        {formik.touched.description && formik.errors.description && (
          <div className="text-red-500 text-sm mt-1">{formik.errors.description}</div>
        )}
      </div>

      <div>
        <Label>Who can attend? *</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="coronaryHeartDisease"
              checked={formik.values.attendanceOptions.coronaryHeartDisease}
              onCheckedChange={(checked: boolean | 'indeterminate') => {
                formik.setFieldValue('attendanceOptions.coronaryHeartDisease', checked);
              }}
            />
            <Label htmlFor="coronaryHeartDisease">
              Coronary heart disease; angina, heart attack, stent, bypass surgery
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="heartFailure"
              checked={formik.values.attendanceOptions.heartFailure}
              onCheckedChange={(checked: boolean | 'indeterminate') => {
                formik.setFieldValue('attendanceOptions.heartFailure', checked);
              }}
            />
            <Label htmlFor="heartFailure">
              Heart Failure or cardiomyopathy
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="heartRhythmProblems"
              checked={formik.values.attendanceOptions.heartRhythmProblems}
              onCheckedChange={(checked: boolean | 'indeterminate') => {
                formik.setFieldValue('attendanceOptions.heartRhythmProblems', checked);
              }}
            />
            <Label htmlFor="heartRhythmProblems">
              Heart electrical rhythm conditions e.g. Atrial fibrillation
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="deviceInsertion"
              checked={formik.values.attendanceOptions.deviceInsertion}
              onCheckedChange={(checked: boolean | 'indeterminate') => {
                formik.setFieldValue('attendanceOptions.deviceInsertion', checked);
              }}
            />
            <Label htmlFor="deviceInsertion">
              People after a device insertion; e.g. Pacemaker, ICD (Implantable Cardioverter Defibrillator)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="other"
              checked={formik.values.attendanceOptions.other}
              onCheckedChange={(checked: boolean | 'indeterminate') => {
                formik.setFieldValue('attendanceOptions.other', checked);
                if (!checked) {
                  formik.setFieldValue('attendanceOptions.otherSpecify', '');
                }
              }}
            />
            <Label htmlFor="other">Other, please specify.</Label>
          </div>

          {formik.values.attendanceOptions.other && (
            <div className="mt-2">
              <Textarea
                id="otherSpecify"
                placeholder="Please specify other conditions"
                {...formik.getFieldProps('attendanceOptions.otherSpecify')}
              />
              {formik.touched.attendanceOptions?.otherSpecify && 
               formik.errors.attendanceOptions?.otherSpecify && (
                <div className="text-red-500 text-sm mt-1">
                  {formik.errors.attendanceOptions.otherSpecify}
                </div>
              )}
            </div>
          )}
        </div>
        
        {formik.touched.attendanceOptions && 
         formik.errors.attendanceOptions && 
         typeof formik.errors.attendanceOptions === 'string' && (
          <div className="text-red-500 text-sm mt-1">
            {formik.errors.attendanceOptions}
          </div>
        )}
      </div>

      <div>
        <Label>What services are offered? *</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="exerciseOnly"
              checked={formik.values.programServices.exerciseOnly}
              onCheckedChange={(checked: boolean | 'indeterminate') => {
                formik.setFieldValue('programServices.exerciseOnly', checked);
               
                if (checked) {
                  formik.setFieldValue('programServices.educationOnly', false);
                  formik.setFieldValue('programServices.exerciseAndEducation', false);
                }
              }}
            />
            <Label htmlFor="exerciseOnly">Exercise only program</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="educationOnly"
              checked={formik.values.programServices.educationOnly}
              onCheckedChange={(checked: boolean | 'indeterminate') => {
                formik.setFieldValue('programServices.educationOnly', checked);
          
                if (checked) {
                  formik.setFieldValue('programServices.exerciseOnly', false);
                  formik.setFieldValue('programServices.exerciseAndEducation', false);
                }
              }}
            />
            <Label htmlFor="educationOnly">Education only program</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="exerciseAndEducation"
              checked={formik.values.programServices.exerciseAndEducation}
              onCheckedChange={(checked: boolean | 'indeterminate') => {
                formik.setFieldValue('programServices.exerciseAndEducation', checked);
        
                if (checked) {
                  formik.setFieldValue('programServices.exerciseOnly', false);
                  formik.setFieldValue('programServices.educationOnly', false);
                }
              }}
            />
            <Label htmlFor="exerciseAndEducation">Exercise and Education included in program</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="otherServices"
              checked={formik.values.programServices.other}
              onCheckedChange={(checked: boolean | 'indeterminate') => {
                formik.setFieldValue('programServices.other', checked);
                if (!checked) {
                  formik.setFieldValue('programServices.otherSpecify', '');
                }
              }}
            />
            <Label htmlFor="otherServices">Other services provided, please specify</Label>
          </div>

          {formik.values.programServices.other && (
            <div className="mt-2">
              <Textarea
                id="otherSpecify"
                placeholder="Please provide more information"
                {...formik.getFieldProps('programServices.otherSpecify')}
              />
              {formik.touched.programServices?.otherSpecify && 
               formik.errors.programServices?.otherSpecify && (
                <div className="text-red-500 text-sm mt-1">
                  {formik.errors.programServices.otherSpecify}
                </div>
              )}
            </div>
          )}
        </div>
        
        {formik.touched.programServices && 
         formik.errors.programServices && 
         typeof formik.errors.programServices === 'string' && (
          <div className="text-red-500 text-sm mt-1">
            {formik.errors.programServices}
          </div>
        )}
      </div>

      {(formik.values.programServices.exerciseOnly || 
  formik.values.programServices.exerciseAndEducation) && (
  <div>
    <Label htmlFor="exercise">Exercise Details *</Label>
    <Textarea
      id="exercise"
      placeholder="Please provide details about the exercise program"
      value={formik.values.exercise || ''}
      onChange={(e) => formik.setFieldValue('exercise', e.target.value)}
      onBlur={formik.handleBlur}
      name="exercise"
    />
    {formik.touched.exercise && formik.errors.exercise && (
      <div className="text-red-500 text-sm mt-1">{formik.errors.exercise}</div>
    )}
  </div>
)}

{(formik.values.programServices.educationOnly || 
  formik.values.programServices.exerciseAndEducation) && (
  <div>
    <Label htmlFor="education">Education Details *</Label>
    <Textarea
      id="education"
      placeholder="Please provide details about the education program"
      value={formik.values.education || ''} 
      onChange={(e) => formik.setFieldValue('education', e.target.value)}
      onBlur={formik.handleBlur}
      name="education"
    />
    {formik.touched.education && formik.errors.education && (
      <div className="text-red-500 text-sm mt-1">{formik.errors.education}</div>
    )}
  </div>
)}
<DeliveryTypesSection formik={formik} />


<EnrollmentSection formik={formik} />
      <div>
              <Label>Interpreter services available? *</Label>
              <RadioGroup
                value={formik.values.interpreterAvailable}
                onValueChange={(value: string) => formik.setFieldValue('interpreterAvailable', value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Yes" id="interpreterYes" />
                  <Label htmlFor="interpreterYes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="No" id="interpreterNo" />
                  <Label htmlFor="interpreterNo">No</Label>
                </div>
              </RadioGroup>
              {formik.touched.interpreterAvailable && formik.errors.interpreterAvailable && (
                <div className="text-red-500 text-sm mt-1">{formik.errors.interpreterAvailable}</div>
              )}
            </div>

      <div>
        <Label htmlFor="specialConditionsSupport">More information</Label>
        <Textarea
          id="specialConditionsSupport"
           placeholder="If you would like to include any additional information about your service."
           className="placeholder:italic placeholder:text-muted-foreground placeholder:opacity-70"
           {...formik.getFieldProps('specialConditionsSupport')}
        />
      </div>

      <PrivacyPolicySection formik={formik} />
    </div>
  );
};

const SuccessPage: React.FC<{ isEditMode: boolean; resetForm: () => void; hasProviderCertification: boolean }> = ({ isEditMode, resetForm, hasProviderCertification }) => (
  <div className="text-center py-8 space-y-6">
    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
      <svg
        className="w-8 h-8 text-green-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M5 13l4 4L19 7"
        />
      </svg>
    </div>
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold text-gray-900">
        {isEditMode ? 'Service updated successfully!' : 'Registration submitted successfully!'}
      </h3>
      <p className="text-gray-600">
        {isEditMode 
          ? 'Your service information has been successfully updated.'
          : 'Thank you for registering your service. Your service is now live and accessible to users.'}
      </p>
      
      {/* Provider certification status message */}
      {hasProviderCertification && !isEditMode && (
        <Alert className="border-amber-200 bg-amber-50 text-left max-w-md mx-auto">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Provider Certification:</strong> Your certification document has been submitted for review. 
            You'll be contacted once our team has verified your provider certification.
          </AlertDescription>
        </Alert>
      )}
      
      {!isEditMode && (
        <div className="mt-8">
          <Button
            type="button"
            onClick={resetForm}
            className="bg-[#C8102E] hover:bg-opacity-80"
          >
            Register another service
          </Button>
        </div>
      )}
    </div>
  </div>
);

const EnrollmentSection: React.FC<{ formik: any }> = ({ formik }) => {

  const updateEnrollmentString = (options: EnrollmentOptions) => {
    let enrollmentText = '';
    
    if (options.notAcceptingReferrals) {
      enrollmentText = 'Currently not accepting external referrals.';
    } else {
      const enrollmentMethods = [];
      
      if (options.selfReferral) enrollmentMethods.push('Self-referral');
      if (options.gpReferral) enrollmentMethods.push('General Practitioner (GP) referral');
      if (options.hospitalReferral) enrollmentMethods.push('Hospital referral');
      if (options.other && options.otherSpecify) enrollmentMethods.push(`Other: ${options.otherSpecify}`);
      
      enrollmentText = `Enrollment methods: ${enrollmentMethods.join(', ')}`;
    }
    
    formik.setFieldValue('enrollment', enrollmentText);
  };

  const handleOptionChange = (field: string, checked: boolean) => {

    if (field === 'notAcceptingReferrals' && checked) {
      const newOptions = {
        selfReferral: false,
        gpReferral: false,
        hospitalReferral: false,
        other: false,
        otherSpecify: '',
        notAcceptingReferrals: true
      };
      formik.setFieldValue('enrollmentOptions', newOptions);
      formik.setFieldTouched('enrollmentOptions', true, false); 
      updateEnrollmentString(newOptions);
      
 
      setTimeout(() => {
        formik.validateField('enrollmentOptions');
      }, 0);
      return;
    }
    
   
    const newOptions = { 
      ...formik.values.enrollmentOptions,
      [field]: checked 
    };
    
    if (field !== 'notAcceptingReferrals' && checked) {
      newOptions.notAcceptingReferrals = false;
    }
    
    
    if (field === 'other' && !checked) {
      newOptions.otherSpecify = '';
    }
    
    formik.setFieldValue('enrollmentOptions', newOptions);
    formik.setFieldTouched('enrollmentOptions', true, false); 
    updateEnrollmentString(newOptions);
    

    setTimeout(() => {
      formik.validateField('enrollmentOptions');
    }, 0);
  };

  return (
    <div>
      <Label>How Do I Enrol in the Program? *</Label>
      <div className="space-y-2 mt-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="selfReferral"
            checked={formik.values.enrollmentOptions.selfReferral}
            onCheckedChange={(checked: boolean | 'indeterminate') => handleOptionChange('selfReferral', checked as boolean)}
          />
          <Label htmlFor="selfReferral">Self-referral</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="gpReferral"
            checked={formik.values.enrollmentOptions.gpReferral}
            onCheckedChange={(checked: boolean | 'indeterminate') => handleOptionChange('gpReferral', checked as boolean)}
          />
          <Label htmlFor="gpReferral">General Practitioner (GP) referral</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="hospitalReferral"
            checked={formik.values.enrollmentOptions.hospitalReferral}
            onCheckedChange={(checked: boolean | 'indeterminate') => handleOptionChange('hospitalReferral', checked as boolean)}
          />
          <Label htmlFor="hospitalReferral">Hospital referral</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="other"
            checked={formik.values.enrollmentOptions.other}
            onCheckedChange={(checked: boolean | 'indeterminate') => handleOptionChange('other', checked as boolean)}
          />
          <Label htmlFor="other">Other</Label>
        </div>

        {formik.values.enrollmentOptions.other && (
          <div className="ml-6 mt-2">
            <Textarea
              id="otherEnrollmentSpecify"
              placeholder="Please specify other enrollment options"
              value={formik.values.enrollmentOptions.otherSpecify}
              onChange={(e) => {
                const newOptions = {
                  ...formik.values.enrollmentOptions,
                  otherSpecify: e.target.value
                };
                formik.setFieldValue('enrollmentOptions', newOptions);
                formik.setFieldTouched('enrollmentOptions.otherSpecify', true, true);
                updateEnrollmentString(newOptions);
              }}
            />
            {formik.touched.enrollmentOptions?.otherSpecify && 
             formik.errors.enrollmentOptions?.otherSpecify && (
              <div className="text-red-500 text-sm mt-1">
                {formik.errors.enrollmentOptions.otherSpecify}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox
            id="notAcceptingReferrals"
            checked={formik.values.enrollmentOptions.notAcceptingReferrals}
            onCheckedChange={(checked: boolean | 'indeterminate') => handleOptionChange('notAcceptingReferrals', checked as boolean)}
          />
          <Label htmlFor="notAcceptingReferrals" className="text-amber-700">
            Currently not accepting external referrals 
            <span className="block text-sm text-muted-foreground opacity-70 mt-1">
              (This option is available to services that are currently not accepting external referrals. 
              This allows your service to be listed and inform consumers you are unable to take on new referrals)
            </span>
          </Label>
        </div>
      </div>
      
      {formik.touched.enrollmentOptions && 
       formik.errors.enrollmentOptions && 
       typeof formik.errors.enrollmentOptions === 'string' && (
        <div className="text-red-500 text-sm mt-1">
          {formik.errors.enrollmentOptions}
        </div>
      )}
    </div>
  );
};

// Function to upload file to SharePoint (placeholder - you'll need to implement this based on your SharePoint setup)
const uploadToAzureBlob = async (file: File, serviceName: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('serviceName', serviceName);
  
  try {
    const response = await fetch('/api/upload-certificate', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Upload failed');
    }
    
    const result = await response.json();
    return result.fileUrl;
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};

export const MultiStepForm: React.FC = () => {
  const params = useParams();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [initialFormData, setInitialFormData] = useState(initialValues);
  const [isLoading, setIsLoading] = useState(true);
  const isEditMode = Boolean(params?.website); // Now this param is actually the website

  useEffect(() => {
    const fetchServiceData = async () => {
      if (isEditMode && params?.website) {
        try {
          // This is now the website parameter
          const decodedWebsite = decodeURIComponent(String(params.website));
          const encodedWebsite = encodeURIComponent(decodedWebsite);
          
          console.log('Fetching service:', {
            original: params.website,
            decodedWebsite: decodedWebsite,
            encodedWebsite: encodedWebsite
          });
  
          // Use the website as the parameter for fetching
          const response = await axios.get(`/api/1241029013026-service/${encodedWebsite}`);
          
          const normalizedServiceName = response.data.serviceName?.replace(/\s+/g, ' ').trim() || '';
          // Set initial form data
          setInitialFormData({
            ...response.data,
            serviceName: normalizedServiceName,
            originalWebsite: response.data.website, // Store original website for comparison
            hybridDescription: response.data.hybridDescription || '',
            f2fDescription: response.data.f2fDescription || '',
            email: response.data.email ? response.data.email.trim() : '',
            telehealthDescription: response.data.telehealthDescription || '',
            individualDescription: response.data.individualDescription || '',
            directions: response.data.directions || '',
            fax: response.data.fax || '',
            specialConditionsSupport: response.data.specialConditionsSupport || '',
            exercise: response.data.exercise || '', 
            education: response.data.education || '', 
            // Handle provider certification fields
            providerCertificationSubmitted: response.data.providerCertificationSubmitted || false,
            certificateFileUrl: response.data.certificateFileUrl || '', // Add this
            certification: {
              providerCertification: response.data.providerCertificationSubmitted || false,
              // programCertification: response.data.certification?.programCertification || false, // COMMENTED OUT
            },
            attendanceOptions: {
              coronaryHeartDisease: Boolean(response.data.attendanceOptions?.coronaryHeartDisease),
              heartFailure: Boolean(response.data.attendanceOptions?.heartFailure),
              heartRhythmProblems: Boolean(response.data.attendanceOptions?.heartRhythmProblems),
              deviceInsertion: Boolean(response.data.attendanceOptions?.deviceInsertion),
              other: Boolean(response.data.attendanceOptions?.other),
              otherSpecify: response.data.attendanceOptions?.otherSpecify || ''
            },
            
            programServices: {
              exerciseOnly: Boolean(response.data.programServices?.exerciseOnly),
              educationOnly: Boolean(response.data.programServices?.educationOnly),
              exerciseAndEducation: Boolean(response.data.programServices?.exerciseAndEducation),
              other: Boolean(response.data.programServices?.other),
              otherSpecify: response.data.programServices?.otherSpecify || ''
            },
            
            enrollmentOptions: {
              selfReferral: false,
              gpReferral: false,
              hospitalReferral: false,
              other: false,
              otherSpecify: '',
              notAcceptingReferrals: false,
              ...response.data.enrollmentOptions
            },
            privacyPolicyAccepted: true
          });
        } catch (error) {
          console.error('Error fetching service data:', error);
        }
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    };
    fetchServiceData();
  }, [isEditMode, params?.website]);

  const handleSubmit = async (
    values: FormData, 
    { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void, resetForm: () => void }
  ) => {
    try {
      // Enhanced normalization for submission
      const normalizedValues = {
        ...values,
        serviceName: values.serviceName.replace(/\s+/g, ' ').trim(),
        website: formatWebsite(values.serviceName) // Ensure consistent formatting
      };
  
      if (step === validationSchemas.length - 1 && !normalizedValues.privacyPolicyAccepted) {
        setSubmitting(false);
        return;
      }

      if (step === validationSchemas.length - 1 && !values.privacyPolicyAccepted) {
        setSubmitting(false);
        return;
      }
      if (step < validationSchemas.length - 1) {
        setStep(step + 1);
        setSubmitting(false);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
  
      console.log('Starting submit...', { isEditMode, values: normalizedValues });
  
      setIsSubmitting(true);
      setSubmitting(true);

      // Handle file upload if provider certification is selected and new file provided
      let certificateFileUrl = values.certificateFileUrl || ''; // Keep existing URL if no new file
      if (values.certification.providerCertification && values.providerCertificationFile) {
        try {
          certificateFileUrl = await uploadToAzureBlob(values.providerCertificationFile, values.serviceName);
        } catch (uploadError) {
          console.error('File upload failed:', uploadError);
          alert('Failed to upload certification file. Please try again.');
          setIsSubmitting(false);
          setSubmitting(false);
          return;
        }
      }

      // Prepare submission data
      const submissionData = {
        ...normalizedValues,
        providerCertificationSubmitted: values.certification.providerCertification,
        certificateFileUrl: certificateFileUrl,
        verificationStatus: values.certification.providerCertification ? 'pending' : null,
        // Remove the file object before sending to API
        providerCertificationFile: undefined,
      };
  
      let response;
      if (isEditMode && params?.website) {
        // Now using website as the identifier instead of service name
        const decodedWebsite = decodeURIComponent(String(params.website));
        const encodedWebsite = encodeURIComponent(decodedWebsite);
        
        console.log('Making PUT request to:', `/api/1241029013026-service/${encodedWebsite}`);
        response = await axios.put(`/api/1241029013026-service/${encodedWebsite}`, submissionData);
      } else {
        console.log('Making POST request to: /api/submit');
        response = await axios.post('/api/submit', submissionData);
      }
      
      console.log('Response:', response);
  
      if (response.status === 200) {
        setIsSubmitted(true);
        if (!isEditMode) {
          resetForm();
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      alert(error.response?.data?.message || 'Error updating service');
    } finally {
      setIsSubmitting(false);
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setStep(0);
    // Clear validation cache when resetting form
    serviceNameValidationCache.clear();
  };

  const getStepContent = (formik: any) => {
    if (isSubmitted) {
      return (
        <SuccessPage 
          isEditMode={isEditMode} 
          resetForm={resetForm} 
          hasProviderCertification={formik.values.certification.providerCertification}
        />
      );
    }

    switch (step) {
      case 0: return <Step1 formik={formik} />;
      case 1: return <Step2 formik={formik} />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
    <Card style={{ backgroundColor: '#f2f1f0' }} className="w-full max-w-3xl mx-auto bg-background">
      <CardHeader>
        <CardTitle className="text-2xl">
          {isSubmitted ? '' :
            isEditMode ? `Edit Service: ${decodeURIComponent(String(params?.website))}` : 'Service Registration'}
        </CardTitle>
        
        {!isSubmitted && (
          <>
            <div className="text-sm text-muted-foreground">
              Step {step + 1} of 2: {step === 0 ? 'Contact Information' : 'Service Information'}
            </div>
            <div className="mt-6">
              <div className="flex justify-between">
                {Array.from({ length: 2 }, (_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-1/2 rounded-full mx-1 ${i <= step ? 'custom-bg' : 'bg-gray-200'}`}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </CardHeader>

      <CardContent>
        <Formik
          initialValues={initialFormData}
          validationSchema={validationSchemas[step]}
          onSubmit={(values, actions) => {
            console.log('Formik onSubmit called', values);
            return handleSubmit(values, actions);
          }}
          validateOnMount={false}
          validateOnChange={true}
          validateOnBlur={true}
          enableReinitialize={true}
          validate={(values) => {
            console.log('Validating:', values);
            return {};
          }}
        >
          {(formik) => (
            <Form className="space-y-6">
              {getStepContent(formik)}

              {!isSubmitted && (
                <div className="flex justify-between pt-6 border-t">
                  {step > 0 && (
                   <Button
                   type="button"
                   onClick={handleBack}
                   disabled={isSubmitting}
                   className="bg-[#C8102E] border-gray-300 hover:bg-opacity-80" 
                 >
                   Back
                 </Button>
                  )}
                  <div className={step === 0 ? 'ml-auto' : ''}>
                  <Button
                    type="submit"
                    disabled={isSubmitting} 
                    className="custom-bg hover:bg-opacity-80"
                    onClick={() => {
                      console.log('Form State:', {
                        isValid: formik.isValid,
                        errors: formik.errors,
                        values: formik.values,
                        isSubmitting,
                        dirty: formik.dirty
                      });
                    }}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <span className="mr-2">Processing...</span>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      </div>
                    ) : step === 1 ? (
                      isEditMode ? 'Update Service' : 'Submit Registration'
                    ) : (
                      'Continue'
                    )}
                  </Button>
                  </div>
                </div>
              )}
            </Form>
          )}
        </Formik>
      </CardContent>
    </Card>
    </div>
  );
};

export default MultiStepForm;