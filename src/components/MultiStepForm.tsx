'use client'
import React, { useEffect, useState } from 'react';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { PrivacyPolicySection } from './PrivacyPolicySection';

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

// Zod Schema Definitions
const dayScheduleSchema = z.object({
  startHour: z.string().min(1, 'Start hour is required'),
  startMinute: z.string().min(1, 'Start minute is required'),
  startAmPm: z.string().min(1, 'AM/PM is required'),
  endHour: z.string().min(1, 'End hour is required'),
  endMinute: z.string().min(1, 'End minute is required'),
  endAmPm: z.string().min(1, 'AM/PM is required'),
});

const deliveryTypeConfigSchema = z.object({
  duration: z.string().min(1, 'Program length is required'),
  customDuration: z.string().optional(),
  frequency: z.string().default('scheduled'),
  customFrequency: z.string().optional(),
  description: z.string().optional(),
  schedule: z.record(dayScheduleSchema).optional(),
}).refine((data) => {
  if (data.duration === 'Other' && !data.customDuration) {
    return false;
  }
  return true;
}, {
  message: 'Custom program length is required when "Other" is selected',
  path: ['customDuration']
}).refine((data) => {
  if (!data.schedule || Object.keys(data.schedule).length === 0) {
    return false;
  }
  return true;
}, {
  message: 'Please select at least one day',
  path: ['schedule']
});

// Step 1 Schema - simplified to avoid build errors
const step1Schema = z.object({
  serviceName: z.string()
    .min(1, 'Service name is required')
    .refine((value) => !value.includes('/'), {
      message: 'Service name cannot contain forward slashes (/)'
    }),
  originalWebsite: z.string().optional(),
  primaryCoordinator: z.string().min(1, 'Primary coordinator is required'),
  streetAddress: z.string().min(1, 'Street address is required'),
  directions: z.string().optional().nullable(),
  phone: z.string()
    .min(1, 'Phone is required')
    .refine((value) => /^\d+$/.test(value), {
      message: 'Phone number must contain only numbers'
    }),
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  fax: z.string()
    .optional()
    .refine((value) => !value || /^\d*$/.test(value), {
      message: 'Fax number must contain only numbers'
    }),
  programType: z.enum(['Public', 'Private']).refine((value) => value, {
    message: 'Program type is required'
  }),
  certification: z.object({
    providerCertification: z.boolean().default(false),
  }),
  providerCertificationFile: z.any().optional(),
  providerCertificationSubmitted: z.boolean().default(false),
  certificateFileUrl: z.string().optional(),
  silentListing: z.boolean().default(false),
  lat: z.number().optional(),
  lng: z.number().optional(),
  website: z.string().optional(),
});

// Step 2 Schema
const step2Schema = z.object({
  programTypes: z.array(z.enum([
    'Cardiac Rehabilitation Program',
    'Heart Failure Program',
    'Cardiac Rehabilitation & Heart Failure Program'
  ])).min(1, 'Please select at least one program type'),
  description: z.string().min(1, 'Description is required'),
  attendanceOptions: z.object({
    coronaryHeartDisease: z.boolean().default(false),
    heartFailure: z.boolean().default(false),
    heartRhythmProblems: z.boolean().default(false),
    deviceInsertion: z.boolean().default(false),
    other: z.boolean().default(false),
    otherSpecify: z.string().default('')
  }).refine((data) => {
    return data.coronaryHeartDisease || data.heartFailure || data.heartRhythmProblems || data.deviceInsertion || data.other;
  }, {
    message: 'Please select at least one attendance option'
  }).refine((data) => {
    if (data.other && !data.otherSpecify) {
      return false;
    }
    return true;
  }, {
    message: 'Please specify the other condition',
    path: ['otherSpecify']
  }),
  programServices: z.object({
    exerciseOnly: z.boolean().default(false),
    educationOnly: z.boolean().default(false),
    exerciseAndEducation: z.boolean().default(false),
    other: z.boolean().default(false),
    otherSpecify: z.string().default('')
  }).refine((data) => {
    return data.exerciseOnly || data.educationOnly || data.exerciseAndEducation || data.other;
  }, {
    message: 'Please select at least one service type'
  }).refine((data) => {
    if (data.other && !data.otherSpecify) {
      return false;
    }
    return true;
  }, {
    message: 'Please specify other services',
    path: ['otherSpecify']
  }),
  exercise: z.string().optional(),
  education: z.string().optional(),
  deliveryTypes: z.array(z.enum(['F2F Group', 'Telehealth', '1:1', 'Hybrid'] as const))
    .min(1, 'At least one delivery type is required'),
  hybridDescription: z.string().optional(),
  f2fDescription: z.string().optional(),
  telehealthDescription: z.string().optional(),
  individualDescription: z.string().optional(),
  enrollmentOptions: z.object({
    selfReferral: z.boolean().default(false),
    gpReferral: z.boolean().default(false),
    hospitalReferral: z.boolean().default(false),
    other: z.boolean().default(false),
    otherSpecify: z.string().default(''),
    notAcceptingReferrals: z.boolean().default(false)
  }).refine((data) => {
    if (data.notAcceptingReferrals) {
      return true;
    }
    return data.selfReferral || data.gpReferral || data.hospitalReferral || data.other;
  }, {
    message: 'Please select at least one enrolment option'
  }).refine((data) => {
    if (data.other && !data.otherSpecify) {
      return false;
    }
    return true;
  }, {
    message: 'Please specify other enrolment options',
    path: ['otherSpecify']
  }),
  deliveryTypeConfigs: z.record(deliveryTypeConfigSchema).optional(),
  interpreterAvailable: z.enum(['Yes', 'No'] as const).refine((value) => value, {
    message: 'Please specify interpreter availability'
  }),
  specialConditionsSupport: z.string().optional().nullable(),
  enrollment: z.string().optional(),
  privacyStatement: z.string().min(1, 'You must accept the privacy statement'),
  privacyPolicyAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the privacy policy'
  })
});

// Combined schema with conditional validation
const formSchema = step1Schema.merge(step2Schema).refine((data) => {
  // Exercise details validation
  if ((data.programServices.exerciseOnly || data.programServices.exerciseAndEducation) && !data.exercise) {
    return false;
  }
  return true;
}, {
  message: 'Please provide exercise details',
  path: ['exercise']
}).refine((data) => {
  // Education details validation
  if ((data.programServices.educationOnly || data.programServices.exerciseAndEducation) && !data.education) {
    return false;
  }
  return true;
}, {
  message: 'Please provide education details',
  path: ['education']
}).refine((data) => {
  // Delivery type descriptions validation
  if (data.deliveryTypes.includes('Hybrid') && !data.hybridDescription) {
    return false;
  }
  if (data.deliveryTypes.includes('F2F Group') && !data.f2fDescription) {
    return false;
  }
  if (data.deliveryTypes.includes('Telehealth') && !data.telehealthDescription) {
    return false;
  }
  if (data.deliveryTypes.includes('1:1') && !data.individualDescription) {
    return false;
  }
  return true;
}, {
  message: 'Description is required for selected delivery types'
}).refine((data) => {
  // Provider certification file validation
  if (data.certification.providerCertification) {
    // In edit mode, if there's an existing file URL and no new file selected, that's okay
    if (data.certificateFileUrl && !data.providerCertificationFile) {
      return true;
    }
    // Otherwise, require a file
    return !!data.providerCertificationFile;
  }
  return true;
}, {
  message: 'Please upload your provider certification document',
  path: ['providerCertificationFile']
});

type FormData = z.infer<typeof formSchema>;

const GOOGLE_MAPS_API_KEY = 'AIzaSyAm-eP8b7-FH2A8nzYucTG9NcPTz0OiAX0';
const LIBRARIES: GoogleMapsLibrary[] = ["places"];

const initialValues: FormData = {
  serviceName: '',
  originalWebsite: '',
  primaryCoordinator: '',
  streetAddress: '',
  directions: '',
  phone: '',
  email: '',
  fax: '',
  programType: 'Public',
  certification: {
    providerCertification: false,
  },
  providerCertificationFile: null,
  providerCertificationSubmitted: false,
  certificateFileUrl: '',
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
  privacyPolicyAccepted: false,
  privacyStatement: '',
};

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

const Step1: React.FC<{ methods: any }> = ({ methods }) => {
  const { control, watch, setValue, formState: { errors }, trigger } = methods;
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [hasSelectedAddress, setHasSelectedAddress] = useState(false);
  const params = useParams();
  const isEditMode = Boolean(params?.website);

  const serviceName = watch('serviceName');
  const providerCertification = watch('certification.providerCertification');
  const providerCertificationFile = watch('providerCertificationFile');
  const certificateFileUrl = watch('certificateFileUrl');

  // Update website field when service name changes with proper normalization
  useEffect(() => {
    const website = formatWebsite(serviceName || '');
    setValue('website', website);
  }, [serviceName, setValue]);

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
              setValue('streetAddress', address);
              setValue('lat', lat);
              setValue('lng', lng);
              setHasSelectedAddress(true);
              trigger('streetAddress');
            }
          }
        });
      }
    }
  }, [isLoaded, autocomplete, setValue, trigger]);

  // Enhanced service name change handler with proper spacing control
  const handleServiceNameChange = (value: string) => {
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
    setValue('serviceName', value);
    
    // Update the website field with the formatted service name (this will handle final trimming)
    const website = formatWebsite(value);
    setValue('website', website);
    
    // Clear validation cache for this field to ensure fresh validation
    const originalWebsite = watch('originalWebsite');
    const cacheKey = getCacheKey(website, originalWebsite);
    serviceNameValidationCache.delete(cacheKey);
    
    // Trigger validation
    trigger('serviceName');
  };

  const handleServiceNameBlur = (value: string) => {
    // On blur, trim the final value to remove trailing spaces
    const trimmedValue = value.trim();
    setValue('serviceName', trimmedValue);
    trigger('serviceName');
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
          <Controller
            name="serviceName"
            control={control}
            render={({ field }) => (
              <Input
                id="serviceName"
                value={field.value}
                onChange={(e) => handleServiceNameChange(e.target.value)}
                onBlur={(e) => handleServiceNameBlur(e.target.value)}
              />
            )}
          />
          {errors.serviceName && (
            <div className="text-red-500 text-sm mt-1">{errors.serviceName.message}</div>
          )}
        </div>

        <div>
          <Label htmlFor="primaryCoordinator">Program coordinator name: *</Label>
          <Controller
            name="primaryCoordinator"
            control={control}
            render={({ field }) => (
              <Input id="primaryCoordinator" {...field} />
            )}
          />
          {errors.primaryCoordinator && (
            <div className="text-red-500 text-sm mt-1">{errors.primaryCoordinator.message}</div>
          )}
        </div>

        <div>
          <Label htmlFor="streetAddress">Street address: *</Label>
          <div className="text-sm text-muted-foreground opacity-70 -mt-1 mb-1">
            (No PO Box)
          </div>
          <Controller
            name="streetAddress"
            control={control}
            render={({ field }) => (
              <Input id="streetAddress" {...field} />
            )}
          />
          {errors.streetAddress && (
            <div className="text-red-500 text-sm mt-1">{errors.streetAddress.message}</div>
          )}
        </div>

        <div>
          <Label htmlFor="directions">Directions</Label>
          <div className="text-sm text-muted-foreground opacity-70 -mt-1 mb-1">
            (How to find/where to park etc)
          </div>
          <Controller
            name="directions"
            control={control}
            render={({ field }) => (
              <Textarea id="directions" {...field} value={field.value || ''} />
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Phone number: *</Label>
            <div className="text-sm text-muted-foreground opacity-70 -mt-1 mb-1">
              (Please include area code, numbers only)
            </div>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <Input
                  id="phone"
                  type="tel"
                  value={field.value}
                  onChange={(e) => {
                    // Allow only numeric input and limit to 10 digits
                    let numericValue = e.target.value.replace(/\D/g, '');
                    if (numericValue.length > 10) {
                      numericValue = numericValue.slice(0, 10);
                    }
                    field.onChange(numericValue);
                  }}
                  inputMode="numeric" 
                  placeholder="e.g. 0412345678"
                />
              )}
            />
            {errors.phone && (
              <div className="text-red-500 text-sm mt-1">{errors.phone.message}</div>
            )}
          </div>
          <div>
            <Label htmlFor="fax">Fax:</Label>
            <Controller
              name="fax"
              control={control}
              render={({ field }) => (
                <Input
                  id="fax"
                  className='mt-5'
                  {...field}
                  value={field.value || ''}
                />
              )}
            />
            {errors.fax && (
              <div className="text-red-500 text-sm mt-1">{errors.fax.message}</div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email: *</Label>
          <div className="text-sm text-muted-foreground opacity-70 -mt-1 mb-1">
            (Generic email preferred)
          </div>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input id="email" type="email" {...field} />
            )}
          />
          {errors.email && (
            <div className="text-red-500 text-sm mt-1">{errors.email.message}</div>
          )}
        </div>

        <div>
          <Label>Program type: *</Label>
          <Controller
            name="programType"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select program type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Public">Public</SelectItem>
                  <SelectItem value="Private">Private</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.programType && (
            <div className="text-red-500 text-sm mt-1">{errors.programType.message}</div>
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
              <Controller
                name="certification.providerCertification"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="providerCertification"
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      setValue('providerCertificationSubmitted', checked);
                      // Clear file if unchecked
                      if (!checked) {
                        setValue('providerCertificationFile', null);
                      }
                    }}
                  />
                )}
              />
              <Label htmlFor="providerCertification">
                I want my service to be ACRA/ICCPR verified (Provider certification)
              </Label>
            </div>
            
            {providerCertification && (
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
                  file={providerCertificationFile}
                  existingFileUrl={certificateFileUrl}
                  isEditMode={isEditMode}
                  onFileSelect={(file) => {
                    setValue('providerCertificationFile', file);
                    trigger('providerCertificationFile');
                  }}
                  error={errors.providerCertificationFile?.message}
                  required={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const Step2: React.FC<{ methods: any }> = ({ methods }) => {
  const { control, watch, setValue, formState: { errors }, trigger } = methods;
  
  const programServices = watch('programServices');
  const deliveryTypes = watch('deliveryTypes');
  const attendanceOptions = watch('attendanceOptions');
  const enrollmentOptions = watch('enrollmentOptions');

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
    
    setValue('enrollment', enrollmentText);
  };

  const handleEnrollmentOptionChange = (field: string, checked: boolean) => {
    const currentOptions = enrollmentOptions;
    
    if (field === 'notAcceptingReferrals' && checked) {
      const newOptions = {
        selfReferral: false,
        gpReferral: false,
        hospitalReferral: false,
        other: false,
        otherSpecify: '',
        notAcceptingReferrals: true
      };
      setValue('enrollmentOptions', newOptions);
      updateEnrollmentString(newOptions);
      trigger('enrollmentOptions');
      return;
    }
    
    const newOptions = { 
      ...currentOptions,
      [field]: checked 
    };
    
    if (field !== 'notAcceptingReferrals' && checked) {
      newOptions.notAcceptingReferrals = false;
    }
    
    if (field === 'other' && !checked) {
      newOptions.otherSpecify = '';
    }
    
    setValue('enrollmentOptions', newOptions);
    updateEnrollmentString(newOptions);
    trigger('enrollmentOptions');
  };

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
              <Controller
                name="programTypes"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id={programType}
                    checked={field.value.includes(programType)}
                    onCheckedChange={(checked) => {
                      const currentTypes = field.value;
                      const newTypes = checked
                        ? [...currentTypes, programType]
                        : currentTypes.filter((type: string) => type !== programType);
                      field.onChange(newTypes);
                    }}
                  />
                )}
              />
              <Label htmlFor={programType}>{programType}</Label>
            </div>
          ))}
        </div>
        {errors.programTypes && (
          <div className="text-red-500 text-sm mt-1">
            {errors.programTypes.message}
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="description">Program description: *</Label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              id="description"
              placeholder="Please describe your program and the benefits to heart health; eg. This program is here to support you as you regain confidence and step back into life after a cardiac event."
              className="placeholder:italic placeholder:text-muted-foreground placeholder:opacity-70"
              {...field}
            />
          )}
        />
        {errors.description && (
          <div className="text-red-500 text-sm mt-1">{errors.description.message}</div>
        )}
      </div>

      <div>
        <Label>Who can attend? *</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Controller
              name="attendanceOptions.coronaryHeartDisease"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="coronaryHeartDisease"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="coronaryHeartDisease">
              Coronary heart disease; angina, heart attack, stent, bypass surgery
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="attendanceOptions.heartFailure"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="heartFailure"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="heartFailure">
              Heart Failure or cardiomyopathy
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="attendanceOptions.heartRhythmProblems"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="heartRhythmProblems"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="heartRhythmProblems">
              Heart electrical rhythm conditions e.g. Atrial fibrillation
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="attendanceOptions.deviceInsertion"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="deviceInsertion"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="deviceInsertion">
              People after a device insertion; e.g. Pacemaker, ICD (Implantable Cardioverter Defibrillator)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="attendanceOptions.other"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="other"
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (!checked) {
                      setValue('attendanceOptions.otherSpecify', '');
                    }
                  }}
                />
              )}
            />
            <Label htmlFor="other">Other, please specify.</Label>
          </div>

          {attendanceOptions.other && (
            <div className="mt-2">
              <Controller
                name="attendanceOptions.otherSpecify"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="otherSpecify"
                    placeholder="Please specify other conditions"
                    {...field}
                  />
                )}
              />
              {errors.attendanceOptions?.otherSpecify && (
                <div className="text-red-500 text-sm mt-1">
                  {errors.attendanceOptions.otherSpecify.message}
                </div>
              )}
            </div>
          )}
        </div>
        
        {errors.attendanceOptions && typeof errors.attendanceOptions.message === 'string' && (
          <div className="text-red-500 text-sm mt-1">
            {errors.attendanceOptions.message}
          </div>
        )}
      </div>

      <div>
        <Label>What services are offered? *</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Controller
              name="programServices.exerciseOnly"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="exerciseOnly"
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (checked) {
                      setValue('programServices.educationOnly', false);
                      setValue('programServices.exerciseAndEducation', false);
                    }
                  }}
                />
              )}
            />
            <Label htmlFor="exerciseOnly">Exercise only program</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="programServices.educationOnly"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="educationOnly"
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (checked) {
                      setValue('programServices.exerciseOnly', false);
                      setValue('programServices.exerciseAndEducation', false);
                    }
                  }}
                />
              )}
            />
            <Label htmlFor="educationOnly">Education only program</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="programServices.exerciseAndEducation"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="exerciseAndEducation"
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (checked) {
                      setValue('programServices.exerciseOnly', false);
                      setValue('programServices.educationOnly', false);
                    }
                  }}
                />
              )}
            />
            <Label htmlFor="exerciseAndEducation">Exercise and Education included in program</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="programServices.other"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="otherServices"
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (!checked) {
                      setValue('programServices.otherSpecify', '');
                    }
                  }}
                />
              )}
            />
            <Label htmlFor="otherServices">Other services provided, please specify</Label>
          </div>

          {programServices.other && (
            <div className="mt-2">
              <Controller
                name="programServices.otherSpecify"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="otherSpecify"
                    placeholder="Please provide more information"
                    {...field}
                  />
                )}
              />
              {errors.programServices?.otherSpecify && (
                <div className="text-red-500 text-sm mt-1">
                  {errors.programServices.otherSpecify.message}
                </div>
              )}
            </div>
          )}
        </div>
        
        {errors.programServices && typeof errors.programServices.message === 'string' && (
          <div className="text-red-500 text-sm mt-1">
            {errors.programServices.message}
          </div>
        )}
      </div>

      {(programServices.exerciseOnly || programServices.exerciseAndEducation) && (
        <div>
          <Label htmlFor="exercise">Exercise Details *</Label>
          <Controller
            name="exercise"
            control={control}
            render={({ field }) => (
              <Textarea
                id="exercise"
                placeholder="Please provide details about the exercise program"
                {...field}
                value={field.value || ''}
              />
            )}
          />
          {errors.exercise && (
            <div className="text-red-500 text-sm mt-1">{errors.exercise.message}</div>
          )}
        </div>
      )}

      {(programServices.educationOnly || programServices.exerciseAndEducation) && (
        <div>
          <Label htmlFor="education">Education Details *</Label>
          <Controller
            name="education"
            control={control}
            render={({ field }) => (
              <Textarea
                id="education"
                placeholder="Please provide details about the education program"
                {...field}
                value={field.value || ''}
              />
            )}
          />
          {errors.education && (
            <div className="text-red-500 text-sm mt-1">{errors.education.message}</div>
          )}
        </div>
      )}

      <DeliveryTypesSection methods={methods} />

      <div>
        <Label>How Do I Enrol in the Program? *</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="selfReferral"
              checked={enrollmentOptions.selfReferral}
              onCheckedChange={(checked) => handleEnrollmentOptionChange('selfReferral', checked as boolean)}
            />
            <Label htmlFor="selfReferral">Self-referral</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="gpReferral"
              checked={enrollmentOptions.gpReferral}
              onCheckedChange={(checked) => handleEnrollmentOptionChange('gpReferral', checked as boolean)}
            />
            <Label htmlFor="gpReferral">General Practitioner (GP) referral</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hospitalReferral"
              checked={enrollmentOptions.hospitalReferral}
              onCheckedChange={(checked) => handleEnrollmentOptionChange('hospitalReferral', checked as boolean)}
            />
            <Label htmlFor="hospitalReferral">Hospital referral</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="otherEnrollment"
              checked={enrollmentOptions.other}
              onCheckedChange={(checked) => handleEnrollmentOptionChange('other', checked as boolean)}
            />
            <Label htmlFor="otherEnrollment">Other</Label>
          </div>

          {enrollmentOptions.other && (
            <div className="ml-6 mt-2">
              <Controller
                name="enrollmentOptions.otherSpecify"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="otherEnrollmentSpecify"
                    placeholder="Please specify other enrollment options"
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      const newOptions = {
                        ...enrollmentOptions,
                        otherSpecify: e.target.value
                      };
                      updateEnrollmentString(newOptions);
                    }}
                  />
                )}
              />
              {errors.enrollmentOptions?.otherSpecify && (
                <div className="text-red-500 text-sm mt-1">
                  {errors.enrollmentOptions.otherSpecify.message}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="notAcceptingReferrals"
              checked={enrollmentOptions.notAcceptingReferrals}
              onCheckedChange={(checked) => handleEnrollmentOptionChange('notAcceptingReferrals', checked as boolean)}
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
        
        {errors.enrollmentOptions && typeof errors.enrollmentOptions.message === 'string' && (
          <div className="text-red-500 text-sm mt-1">
            {errors.enrollmentOptions.message}
          </div>
        )}
      </div>

      <div>
        <Label>Interpreter services available? *</Label>
        <Controller
          name="interpreterAvailable"
          control={control}
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={field.onChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Yes" id="interpreterYes" />
                <Label htmlFor="interpreterYes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="No" id="interpreterNo" />
                <Label htmlFor="interpreterNo">No</Label>
              </div>
            </RadioGroup>
          )}
        />
        {errors.interpreterAvailable && (
          <div className="text-red-500 text-sm mt-1">{errors.interpreterAvailable.message}</div>
        )}
      </div>

      <div>
        <Label htmlFor="specialConditionsSupport">More information</Label>
        <Controller
          name="specialConditionsSupport"
          control={control}
          render={({ field }) => (
            <Textarea
              id="specialConditionsSupport"
              placeholder="If you would like to include any additional information about your service."
              className="placeholder:italic placeholder:text-muted-foreground placeholder:opacity-70"
              {...field}
              value={field.value || ''}
            />
          )}
        />
      </div>

      <PrivacyPolicySection methods={methods} />
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
  const [isLoading, setIsLoading] = useState(true);
  const isEditMode = Boolean(params?.website);

  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
    mode: 'onChange', // This enables real-time validation
  });

  const { handleSubmit, reset, watch, formState: { errors } } = methods;

  useEffect(() => {
    const fetchServiceData = async () => {
      if (isEditMode && params?.website) {
        try {
          const decodedWebsite = decodeURIComponent(String(params.website));
          const encodedWebsite = encodeURIComponent(decodedWebsite);
          
          console.log('Fetching service:', {
            original: params.website,
            decodedWebsite: decodedWebsite,
            encodedWebsite: encodedWebsite
          });
  
          const response = await axios.get(`/api/1241029013026-service/${encodedWebsite}`);
          
          const normalizedServiceName = response.data.serviceName?.replace(/\s+/g, ' ').trim() || '';
          
          const formData = {
            ...response.data,
            serviceName: normalizedServiceName,
            originalWebsite: response.data.website,
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
            providerCertificationSubmitted: response.data.providerCertificationSubmitted || false,
            certificateFileUrl: response.data.certificateFileUrl || '',
            certification: {
              providerCertification: response.data.providerCertificationSubmitted || false,
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
          };
          
          reset(formData);
        } catch (error) {
          console.error('Error fetching service data:', error);
        }
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    };
    fetchServiceData();
  }, [isEditMode, params?.website, reset]);

  const onSubmit = async (values: FormData) => {
    try {
      // Enhanced normalization for submission
      const normalizedValues = {
        ...values,
        serviceName: values.serviceName.replace(/\s+/g, ' ').trim(),
        website: formatWebsite(values.serviceName)
      };

      if (step < 1) {
        setStep(step + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (!normalizedValues.privacyPolicyAccepted) {
        return;
      }
  
      console.log('Starting submit...', { isEditMode, values: normalizedValues });
  
      setIsSubmitting(true);

      // Handle file upload if provider certification is selected and new file provided
      let certificateFileUrl = values.certificateFileUrl || '';
      if (values.certification.providerCertification && values.providerCertificationFile) {
        try {
          certificateFileUrl = await uploadToAzureBlob(values.providerCertificationFile, values.serviceName);
        } catch (uploadError) {
          console.error('File upload failed:', uploadError);
          alert('Failed to upload certification file. Please try again.');
          setIsSubmitting(false);
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
          reset();
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
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setStep(0);
    reset();
    // Clear validation cache when resetting form
    serviceNameValidationCache.clear();
  };

  const getStepContent = () => {
    if (isSubmitted) {
      return (
        <SuccessPage 
          isEditMode={isEditMode} 
          resetForm={resetForm} 
          hasProviderCertification={watch('certification.providerCertification')}
        />
      );
    }

    switch (step) {
      case 0: return <Step1 methods={methods} />;
      case 1: return <Step2 methods={methods} />;
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
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {getStepContent()}

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
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiStepForm;