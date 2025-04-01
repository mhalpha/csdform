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
import axios from 'axios';
import { useParams } from 'next/navigation';
import { DeliveryType, DeliveryTypeConfig, DeliveryTypesSection } from './DeliveryTypesSection';

export interface EnrollmentOptions {
  selfReferral: boolean;
  gpReferral: boolean;
  hospitalReferral: boolean;
  other: boolean;
  otherSpecify: string;
  notAcceptingReferrals: boolean;
}

const serviceNameValidationCache = new Map<string, boolean>();

// Debounced version of service name validation function
const checkServiceNameExistsDebounced = (() => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (serviceName: string, currentName?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Use cached result if available
      const cacheKey = `${serviceName}-${currentName || ''}`;
      if (serviceNameValidationCache.has(cacheKey)) {
        resolve(serviceNameValidationCache.get(cacheKey)!);
        return;
      }
      
      // Don't check if we're in edit mode and the name hasn't changed
      if (currentName && serviceName.trim() === currentName.trim()) {
        resolve(false);
        return;
      }
      
      // Set a new timeout (300ms debounce time)
      timeoutId = setTimeout(async () => {
        try {
          if (!serviceName.trim()) {
            resolve(false);
            return;
          }
          
          const encodedServiceName = encodeURIComponent(serviceName.trim());
          const response = await axios.get(`/api/1241029013026-service/${encodedServiceName}`);
          
          // Service exists
          serviceNameValidationCache.set(cacheKey, true);
          resolve(true);
        } catch (error: any) {
          if (error.response?.status === 404) {
            // Service doesn't exist
            serviceNameValidationCache.set(cacheKey, false);
            resolve(false);
          } else {
            // Other error, don't cache
            resolve(false);
          }
        }
      }, 300);
    });
  };
})();



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
  enrollment: string; // Keep for backward compatibility
  enrollmentOptions: EnrollmentOptions;
  interpreterAvailable: 'Yes' | 'No';
  deliveryTypeConfigs: {
    [key in DeliveryType]?: DeliveryTypeConfig;
  };
  specialConditionsSupport: string | null;
}


const GOOGLE_MAPS_API_KEY = 'AIzaSyAm-eP8b7-FH2A8nzYucTG9NcPTz0OiAX0';
const LIBRARIES: GoogleMapsLibrary[] = ["places"];

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
  exercise: '', // Ensure this is an empty string, not null
  education: '', 
  deliveryTypes: [],
  hybridDescription: '',
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
  enrollment: ''
};

const formatWebsite = (serviceName: string): string => {
  if (!serviceName) return '';
  // Replace spaces with underscores and prepend service/
  return `service/${serviceName.replace(/\s+/g, '_').toLowerCase()}`;
};

const checkServiceNameExists = async (serviceName: string, currentName?: string) => {
  // Skip validation if empty
  if (!serviceName) return false;
  
  try {
    const exists = await checkServiceNameExistsDebounced(serviceName, currentName);
    return exists;
  } catch (error) {
    return false; // Allow submission if check fails
  }
};

const validationSchemas = [
  // Step 1
  Yup.object({
    serviceName: Yup.string()
      .required('Service name is required')
      .test({
        name: 'unique-service-name',
        message: 'Service name already exists',
        test: async function(value: any) {
          // Skip validation if empty (this ensures value is treated as a string)
          if (!value || typeof value !== 'string') return true;
          
          // Get original name from context
          const originalName = this.parent.originalServiceName;
          const typedOriginalName = typeof originalName === 'string' ? originalName : undefined;
          
          // If we're in edit mode and the name hasn't changed, skip validation
          if (typedOriginalName && value.trim() === typedOriginalName.trim()) {
            return true;
          }
          
          try {
            const exists = await checkServiceNameExists(value, typedOriginalName);
            return !exists;
          } catch (error) {
            return true; // Allow submission if check fails
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
      .oneOf(['Public', 'Private'])
      .required('Program type is required')
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
          deliveryTypeConfigs: Yup.object().test(
            'delivery-configs',
            'Configuration required for selected delivery types',
            function(value: { [key in DeliveryType]?: DeliveryTypeConfig }, context) {
              const deliveryTypes = context.parent.deliveryTypes as DeliveryType[];
              if (!deliveryTypes?.length) return true;
          
              for (const type of deliveryTypes) {
                const config = value[type as DeliveryType];
                
                // Check if program length is selected
                if (!config?.duration) {
                  return this.createError({
                    message: `Program length is required for ${type}`
                  });
                }
                
                // Check if custom program length is provided when "Other" is selected
                if (config.duration === 'Other' && !config.customDuration) {
                  return this.createError({
                    message: `Custom program length is required when "Other" is selected`
                  });
                }
                
                // Check if at least one day is selected in the schedule
                if (!config.schedule || Object.keys(config.schedule).length === 0) {
                  return this.createError({
                    message: `Please select at least one day for ${type}`
                  });
                }
                
                // Check if all selected days have valid time information
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
          // Update the validation schema with proper typing
enrollmentOptions: Yup.object().test(
  'at-least-one-selected', 
  'Please select at least one enrolment option', 
  function(value: any) {
    // Use explicit type assertion to ensure TypeScript recognizes the shape
    const options = value as EnrollmentOptions;
    
    // If "not accepting referrals" is checked, no other options are required
    if (options.notAcceptingReferrals) {
      return true;
    }
    
    // Otherwise at least one option must be selected
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
          
          // Keep the existing enrollment validation for backward compatibility
          enrollment: Yup.string().required('Enrolment information is required'),
    interpreterAvailable: Yup.string()
          .oneOf(['Yes', 'No'])
          .required('Please specify interpreter availability'),
      })
      
];



interface StepProps {
  formik: any;
}

const Step1: React.FC<StepProps> = ({ formik }) => {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [hasSelectedAddress, setHasSelectedAddress] = useState(false);

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

  if (!isLoaded) return <div>Loading Google Maps...</div>;
  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div>
          <Label htmlFor="serviceName">Service name *</Label>
          <div className="text-sm text-muted-foreground opacity-70 -mt-1 mb-1">
            (If you have multiple services with the same name, please include location in the service name)
          </div>
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
              (Please include area code)
            </div>
            <Input
              id="phone"
              type="tel"
              {...formik.getFieldProps('phone')}
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
        </div>
        <div>
          <Label>ACRA/ICCPR certification status:</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="providerCertification"
                checked={formik.values.certification.providerCertification}
                onCheckedChange={(checked) => {
                  formik.setFieldValue('certification.providerCertification', checked);
                }}
              />
              <Label htmlFor="providerCertification">Provider certification</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="programCertification"
                checked={formik.values.certification.programCertification}
                onCheckedChange={(checked) => {
                  formik.setFieldValue('certification.programCertification', checked);
                }}
              />
              <Label htmlFor="programCertification">Program certification</Label>
            </div>
          </div>
        </div>
        {/* Silent listing option removed */}
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
                onCheckedChange={(checked) => {
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
              onCheckedChange={(checked) => {
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
              onCheckedChange={(checked) => {
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
              onCheckedChange={(checked) => {
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
              onCheckedChange={(checked) => {
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
              onCheckedChange={(checked) => {
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
              onCheckedChange={(checked) => {
                formik.setFieldValue('programServices.exerciseOnly', checked);
                // Uncheck other options if this is checked
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
              onCheckedChange={(checked) => {
                formik.setFieldValue('programServices.educationOnly', checked);
                // Uncheck other options if this is checked
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
              onCheckedChange={(checked) => {
                formik.setFieldValue('programServices.exerciseAndEducation', checked);
                // Uncheck other options if this is checked
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
              onCheckedChange={(checked) => {
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
                onValueChange={(value) => formik.setFieldValue('interpreterAvailable', value)}
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
    </div>
  );
};

const SuccessPage: React.FC<{ isEditMode: boolean; resetForm: () => void }> = ({ isEditMode, resetForm }) => (
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
          : 'Thank you for registering your service. Your information has been successfully submitted and will be added to the directory shortly.'}
      </p>
      {!isEditMode && (
        <div className="mt-8">
          <Button
            type="button"
            onClick={resetForm}
            className="bg-primary hover:bg-opacity-80"
          >
            Register another service
          </Button>
        </div>
      )}
    </div>
  </div>
);

const EnrollmentSection: React.FC<{ formik: any }> = ({ formik }) => {
  // For backward compatibility, update the enrollment string field when checkboxes change
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
    // Special handling for "not accepting referrals"
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
      formik.setFieldTouched('enrollmentOptions', true, false); // Mark as touched but don't validate yet
      updateEnrollmentString(newOptions);
      
      // Force validation after value is set
      setTimeout(() => {
        formik.validateField('enrollmentOptions');
      }, 0);
      return;
    }
    
    // If another option is selected, uncheck "not accepting referrals"
    const newOptions = { 
      ...formik.values.enrollmentOptions,
      [field]: checked 
    };
    
    if (field !== 'notAcceptingReferrals' && checked) {
      newOptions.notAcceptingReferrals = false;
    }
    
    // If "other" is unchecked, clear the "otherSpecify" text
    if (field === 'other' && !checked) {
      newOptions.otherSpecify = '';
    }
    
    formik.setFieldValue('enrollmentOptions', newOptions);
    formik.setFieldTouched('enrollmentOptions', true, false); // Mark as touched but don't validate yet
    updateEnrollmentString(newOptions);
    
    // Force validation after value is set
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
            onCheckedChange={(checked) => handleOptionChange('selfReferral', checked as boolean)}
          />
          <Label htmlFor="selfReferral">Self-referral</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="gpReferral"
            checked={formik.values.enrollmentOptions.gpReferral}
            onCheckedChange={(checked) => handleOptionChange('gpReferral', checked as boolean)}
          />
          <Label htmlFor="gpReferral">General Practitioner (GP) referral</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="hospitalReferral"
            checked={formik.values.enrollmentOptions.hospitalReferral}
            onCheckedChange={(checked) => handleOptionChange('hospitalReferral', checked as boolean)}
          />
          <Label htmlFor="hospitalReferral">Hospital referral</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="other"
            checked={formik.values.enrollmentOptions.other}
            onCheckedChange={(checked) => handleOptionChange('other', checked as boolean)}
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
            onCheckedChange={(checked) => handleOptionChange('notAcceptingReferrals', checked as boolean)}
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

export const MultiStepForm: React.FC = () => {
  const params = useParams();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [initialFormData, setInitialFormData] = useState(initialValues);
  const [isLoading, setIsLoading] = useState(true);
  const isEditMode = Boolean(params?.serviceName);

  useEffect(() => {
    const fetchServiceData = async () => {
      if (isEditMode && params?.serviceName) {
        try {
          // First decode the URL parameter, then encode it properly for the API call
          const decodedName = decodeURIComponent(String(params.serviceName));
          const encodedServiceName = encodeURIComponent(decodedName);
          
          console.log('Fetching service:', {
            original: params.serviceName,
            decoded: decodedName,
            encoded: encodedServiceName
          });
  
          const response = await axios.get(`/api/1241029013026-service/${encodedServiceName}`);
          
          // Set initial form data
          setInitialFormData({
            ...response.data,
            originalServiceName: response.data.serviceName,
            hybridDescription: response.data.hybridDescription || '',
            directions: response.data.directions || '',
            fax: response.data.fax || '',
            specialConditionsSupport: response.data.specialConditionsSupport || '',
            exercise: response.data.exercise || '', // Ensure exercise is never null
            education: response.data.education || '', // Ensure education is never null
            attendanceOptions: {
              coronaryHeartDisease: Boolean(response.data.attendanceOptions?.coronaryHeartDisease),
              heartFailure: Boolean(response.data.attendanceOptions?.heartFailure),
              heartRhythmProblems: Boolean(response.data.attendanceOptions?.heartRhythmProblems),
              deviceInsertion: Boolean(response.data.attendanceOptions?.deviceInsertion),
              other: Boolean(response.data.attendanceOptions?.other),
              otherSpecify: response.data.attendanceOptions?.otherSpecify || ''
            },
            
            // Ensure program services have default values
            programServices: {
              exerciseOnly: Boolean(response.data.programServices?.exerciseOnly),
              educationOnly: Boolean(response.data.programServices?.educationOnly),
              exerciseAndEducation: Boolean(response.data.programServices?.exerciseAndEducation),
              other: Boolean(response.data.programServices?.other),
              otherSpecify: response.data.programServices?.otherSpecify || ''
            },
            
            // Ensure enrollment options have default values
            enrollmentOptions: {
              selfReferral: false,
              gpReferral: false,
              hospitalReferral: false,
              other: false,
              otherSpecify: '',
              notAcceptingReferrals: false,
              ...response.data.enrollmentOptions
            }
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
  }, [isEditMode, params?.serviceName]);

  const handleSubmit = async (
    values: FormData, 
    { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void, resetForm: () => void }
  ) => {
    try {
      if (step < validationSchemas.length - 1) {
        setStep(step + 1);
        setSubmitting(false);
        return;
      }
  
      console.log('Starting submit...', { isEditMode, values });
  
      setIsSubmitting(true);
      setSubmitting(true);
  
      let response;
      if (isEditMode && params?.serviceName) {
        const decodedName = decodeURIComponent(String(params.serviceName));
        const encodedServiceName = encodeURIComponent(decodedName);
        
        console.log('Making PUT request to:', `/api/1241029013026-service/${encodedServiceName}`);
        response = await axios.put(`/api/1241029013026-service/${encodedServiceName}`, values);
      } else {
        console.log('Making POST request to: /api/submit');
        response = await axios.post('/api/submit', values);
      }
      
      console.log('Response:', response);
  
      if (response.status === 200) {
        setIsSubmitted(true);
        if (!isEditMode) {
          resetForm();
        }
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
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setStep(0);
  };

  const getStepContent = (formik: any) => {
    if (isSubmitted) {
      return <SuccessPage isEditMode={isEditMode} resetForm={resetForm} />;
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
          {isSubmitted ? 'Registration complete' :
            isEditMode ? `Edit Service: ${decodeURIComponent(String(params?.serviceName))}` : 'Service Registration'}
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
                      variant="outline"
                      onClick={handleBack}
                      disabled={isSubmitting}
                    >
                      Back
                    </Button>
                  )}
                  <div className={step === 0 ? 'ml-auto' : ''}>
                  <Button
    type="submit"
    disabled={isSubmitting}  // Temporarily remove !formik.isValid check
    className="custom-bg hover:bg-opacity-80"
    onClick={() => {
      // Add validation debugging
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

