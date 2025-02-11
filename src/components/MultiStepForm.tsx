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
import debounce from 'lodash/debounce';

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
  deliveryTypes: ('F2F Group' | 'Telehealth' | '1:1' | 'Hybrid')[];
  hybridDescription: string;
  enrollment: string;
  interpreterAvailable: 'Yes' | 'No';
  programDuration: string;
  customDuration?: string;
  programFrequency: 'Weekly' | 'Twice Weekly' | 'Other';
  customFrequency?: string;
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
  exercise: '',
  education: '',
  deliveryTypes: [],
  hybridDescription: '',
  enrollment: '',
  programDuration: '',
  customDuration: '',
  programFrequency: 'Weekly',
  customFrequency: '',
  interpreterAvailable: 'No',
  specialConditionsSupport: '',
  website: ''
};

const debouncedCheckServiceName = debounce(async (
  serviceName: string, 
  currentName: string | undefined,
  setFieldError: (field: string, message: string | undefined) => void
) => {
  try {
    if (!serviceName) return;
    if (currentName && serviceName.trim() === currentName.trim()) {
      setFieldError('serviceName', undefined);
      return;
    }

    const encodedServiceName = encodeURIComponent(serviceName.trim());
    const response = await axios.get(`/api/1241029013026-service/${encodedServiceName}`);
    setFieldError('serviceName', 'Service name already exists');
  } catch (error: any) {
    if (error.response?.status === 404) {
      setFieldError('serviceName', undefined);
    }
  }
}, 300);

const useValidationState = () => {
  const [isValidating, setIsValidating] = useState(false);
  
  const startValidation = () => setIsValidating(true);
  const endValidation = () => setIsValidating(false);
  
  return { isValidating, startValidation, endValidation };
};


const formatWebsite = (serviceName: string): string => {
  if (!serviceName) return '';
  // Replace spaces with underscores and prepend service/
  return `service/${serviceName.replace(/\s+/g, '_').toLowerCase()}`;
};

const checkServiceNameExists = async (serviceName: string, currentName?: string) => {
  try {
    // Don't check if we're in edit mode and the name hasn't changed
    if (currentName && serviceName.trim() === currentName.trim()) {
      return false;
    }

    const encodedServiceName = encodeURIComponent(serviceName.trim());
    const response = await axios.get(`/api/1241029013026-service/${encodedServiceName}`);
    return true; // Service exists
  } catch (error: any) {
    if (error.response?.status === 404) {
      return false; // Service doesn't exist
    }
    throw error; // Re-throw other errors
  }
};

const validationSchemas = [
  // Step 1
  Yup.object({
    serviceName: Yup.string()
      .required('Service name is required')
      .test('unique-service-name', 'Checking service name...', () => true),
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
    enrollment: Yup.string().required('Enrollment information is required'),
    interpreterAvailable: Yup.string()
          .oneOf(['Yes', 'No'])
          .required('Please specify interpreter availability'),
          programDuration: Yup.string()
      .required('Program duration is required')
      .test(
        'custom-duration-required',
        'Custom duration is required',
        function(value) {
          if (value === 'Other') {
            return !!this.parent.customDuration;
          }
          return true;
        }
      ),
    customDuration: Yup.string().when('programDuration', {
      is: 'Other',
      then: (schema) => schema.required('Please specify custom duration'),
      otherwise: (schema) => schema.notRequired()
    }),
    programFrequency: Yup.string()
      .oneOf(['Weekly', 'Twice Weekly', 'Other'])
      .required('Program frequency is required'),
    customFrequency: Yup.string().when('programFrequency', {
      is: 'Other',
      then: (schema) => schema.required('Please specify custom frequency'),
      otherwise: (schema) => schema.notRequired()
    })
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
    if (formik.values.serviceName) {
      debouncedCheckServiceName(
        formik.values.serviceName,
        formik.values.originalServiceName,
        formik.setFieldError
      );
    }
  }, [formik.values.serviceName]);

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
        {/* Service Name */}
        <div>
          <Label htmlFor="serviceName">Service Name *</Label>
          <Input
            id="serviceName"
            {...formik.getFieldProps('serviceName')}
            onChange={(e) => {
              formik.handleChange(e);
              formik.setFieldTouched('serviceName', true, false);
              const website = formatWebsite(e.target.value);
              formik.setFieldValue('website', website);
              formik.validateField('serviceName');
            }}
            onBlur={(e) => {
              formik.handleBlur(e);
              formik.validateField('serviceName');
            }}
          />
          {formik.touched.serviceName && formik.errors.serviceName && (
            <div className="text-red-500 text-sm mt-1">{formik.errors.serviceName}</div>
          )}
        </div>

        {/* Primary Coordinator */}
        <div>
          <Label htmlFor="primaryCoordinator">Primary Coordinator *</Label>
          <Input
            id="primaryCoordinator"
            {...formik.getFieldProps('primaryCoordinator')}
            onChange={(e) => {
              formik.handleChange(e);
              formik.setFieldTouched('primaryCoordinator', true, false);
              formik.validateField('primaryCoordinator');
            }}
            onBlur={(e) => {
              formik.handleBlur(e);
              formik.validateField('primaryCoordinator');
            }}
          />
          {formik.touched.primaryCoordinator && formik.errors.primaryCoordinator && (
            <div className="text-red-500 text-sm mt-1">{formik.errors.primaryCoordinator}</div>
          )}
        </div>

        {/* Street Address */}
        <div>
          <Label htmlFor="streetAddress">Street Address (No PO Box) *</Label>
          <Input
            id="streetAddress"
            {...formik.getFieldProps('streetAddress')}
            onChange={(e) => {
              formik.handleChange(e);
              formik.setFieldTouched('streetAddress', true, false);
              formik.validateField('streetAddress');
            }}
            onBlur={(e) => {
              formik.handleBlur(e);
              formik.validateField('streetAddress');
            }}
          />
          {formik.touched.streetAddress && formik.errors.streetAddress && (
            <div className="text-red-500 text-sm mt-1">{formik.errors.streetAddress}</div>
          )}
        </div>

        {/* Directions */}
        <div>
          <Label htmlFor="directions">Directions (How to find/where to park)</Label>
          <Textarea
            id="directions"
            {...formik.getFieldProps('directions')}
            onChange={(e) => {
              formik.handleChange(e);
              formik.setFieldTouched('directions', true, false);
              formik.validateField('directions');
            }}
            onBlur={(e) => {
              formik.handleBlur(e);
              formik.validateField('directions');
            }}
          />
        </div>

        {/* Phone and Fax */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              {...formik.getFieldProps('phone')}
              onChange={(e) => {
                formik.handleChange(e);
                formik.setFieldTouched('phone', true, false);
                formik.validateField('phone');
              }}
              onBlur={(e) => {
                formik.handleBlur(e);
                formik.validateField('phone');
              }}
            />
            {formik.touched.phone && formik.errors.phone && (
              <div className="text-red-500 text-sm mt-1">{formik.errors.phone}</div>
            )}
          </div>

          <div>
            <Label htmlFor="fax">Fax</Label>
            <Input
              id="fax"
              {...formik.getFieldProps('fax')}
              onChange={(e) => {
                formik.handleChange(e);
                formik.setFieldTouched('fax', true, false);
                formik.validateField('fax');
              }}
              onBlur={(e) => {
                formik.handleBlur(e);
                formik.validateField('fax');
              }}
            />
            {formik.touched.fax && formik.errors.fax && (
              <div className="text-red-500 text-sm mt-1">{formik.errors.fax}</div>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">Email (Generic preferred) *</Label>
          <Input
            id="email"
            type="email"
            {...formik.getFieldProps('email')}
            onChange={(e) => {
              formik.handleChange(e);
              formik.setFieldTouched('email', true, false);
              formik.validateField('email');
            }}
            onBlur={(e) => {
              formik.handleBlur(e);
              formik.validateField('email');
            }}
          />
          {formik.touched.email && formik.errors.email && (
            <div className="text-red-500 text-sm mt-1">{formik.errors.email}</div>
          )}
        </div>

        {/* Program Type */}
        <div>
          <Label>Program Type *</Label>
          <Select
            value={formik.values.programType}
            onValueChange={(value: any) => {
              formik.setFieldValue('programType', value);
              formik.setFieldTouched('programType', true, false);
              formik.validateField('programType');
            }}
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

        {/* Certification Status */}
        <div>
          <Label>ACRA/ICCPR Certification Status</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="providerCertification"
                checked={formik.values.certification.providerCertification}
                onCheckedChange={(checked) => {
                  formik.setFieldValue('certification.providerCertification', checked);
                  formik.setFieldTouched('certification.providerCertification', true, false);
                  formik.validateField('certification.providerCertification');
                }}
              />
              <Label htmlFor="providerCertification">Provider Certification</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="programCertification"
                checked={formik.values.certification.programCertification}
                onCheckedChange={(checked) => {
                  formik.setFieldValue('certification.programCertification', checked);
                  formik.setFieldTouched('certification.programCertification', true, false);
                  formik.validateField('certification.programCertification');
                }}
              />
              <Label htmlFor="programCertification">Program Certification</Label>
            </div>
          </div>
        </div>

        {/* Silent Listing */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="silentListing"
            checked={formik.values.silentListing}
            onCheckedChange={(checked) => {
              formik.setFieldValue('silentListing', checked);
              formik.setFieldTouched('silentListing', true, false);
              formik.validateField('silentListing');
            }}
          />
          <Label htmlFor="silentListing">Silent Listing Option</Label>
        </div>
      </div>
    </div>
  );
};

const Step2: React.FC<StepProps> = ({ formik }) => {
  return (
    <div className="space-y-4">
     <div>
        <Label>Program Types *</Label>
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
                  formik.setFieldTouched('programTypes', true, false);
                  formik.validateField('programTypes');
                }}
              />
              <Label htmlFor={programType}>{programType}</Label>
            </div>
          ))}
        </div>
        {formik.touched.programTypes && formik.errors.programTypes && (
          <div className="text-red-500 text-sm mt-1">{formik.errors.programTypes}</div>
        )}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          {...formik.getFieldProps('description')}
          onChange={(e) => {
            formik.handleChange(e);
            formik.setFieldTouched('description', true, false);
            formik.validateField('description');
          }}
          onBlur={(e) => {
            formik.handleBlur(e);
            formik.validateField('description');
          }}
        />
        {formik.touched.description && formik.errors.description && (
          <div className="text-red-500 text-sm mt-1">{formik.errors.description}</div>
        )}
      </div>

      {/* Attendance Options */}
      <div>
        <Label>Who can attend? *</Label>
        <div className="space-y-2">
          {Object.entries({
            coronaryHeartDisease: 'People with Coronary heart disease; angina, heart attack, stent, bypass surgery',
            heartFailure: 'Heart failure or cardiomyopathy',
            heartRhythmProblems: 'Heart electrical rhythm problems; e.g. Atrial Fibrillation',
            deviceInsertion: 'People after a device insertion; e.g. Pacemaker, ICD (Implantable Cardioverter Defibrillator)',
            other: 'Other, please specify'
          }).map(([key, label]) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={key}
                checked={formik.values.attendanceOptions[key]}
                onCheckedChange={(checked) => {
                  formik.setFieldValue(`attendanceOptions.${key}`, checked);
                  formik.setFieldTouched('attendanceOptions', true, false);
                  formik.validateField('attendanceOptions');
                  if (key === 'other' && !checked) {
                    formik.setFieldValue('attendanceOptions.otherSpecify', '');
                  }
                }}
              />
              <Label htmlFor={key}>{label}</Label>
            </div>
          ))}
          
          {formik.values.attendanceOptions.other && (
            <div className="mt-2">
              <Textarea
                id="attendanceOtherSpecify"
                placeholder="Please specify other conditions"
                {...formik.getFieldProps('attendanceOptions.otherSpecify')}
                onChange={(e) => {
                  formik.handleChange(e);
                  formik.setFieldTouched('attendanceOptions.otherSpecify', true, false);
                  formik.validateField('attendanceOptions');
                }}
                onBlur={(e) => {
                  formik.handleBlur(e);
                  formik.validateField('attendanceOptions');
                }}
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
         typeof formik.errors.attendanceOptions === 'string' && (
          <div className="text-red-500 text-sm mt-1">
            {formik.errors.attendanceOptions}
          </div>
        )}
      </div>

      {/* Program Services */}
      <div>
        <Label>What services are offered? *</Label>
        <div className="space-y-2">
          {Object.entries({
            exerciseOnly: 'Exercise only program',
            educationOnly: 'Education only program',
            exerciseAndEducation: 'Exercise and Education included in program',
            other: 'Other services provided, please specify'
          }).map(([key, label]) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={key}
                checked={formik.values.programServices[key]}
                onCheckedChange={(checked) => {
                  // Handle mutual exclusivity for main options
                  if (checked && ['exerciseOnly', 'educationOnly', 'exerciseAndEducation'].includes(key)) {
                    formik.setFieldValue('programServices', {
                      ...formik.values.programServices,
                      exerciseOnly: false,
                      educationOnly: false,
                      exerciseAndEducation: false,
                      [key]: checked
                    });
                  } else {
                    formik.setFieldValue(`programServices.${key}`, checked);
                  }
                  formik.setFieldTouched('programServices', true, false);
                  formik.validateField('programServices');
                  if (key === 'other' && !checked) {
                    formik.setFieldValue('programServices.otherSpecify', '');
                  }
                }}
              />
              <Label htmlFor={key}>{label}</Label>
            </div>
          ))}
          
          {formik.values.programServices.other && (
            <div className="mt-2">
              <Textarea
                id="programServicesOtherSpecify"
                placeholder="Please provide more information"
                {...formik.getFieldProps('programServices.otherSpecify')}
                onChange={(e) => {
                  formik.handleChange(e);
                  formik.setFieldTouched('programServices.otherSpecify', true, false);
                  formik.validateField('programServices');
                }}
                onBlur={(e) => {
                  formik.handleBlur(e);
                  formik.validateField('programServices');
                }}
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
         typeof formik.errors.programServices === 'string' && (
          <div className="text-red-500 text-sm mt-1">
            {formik.errors.programServices}
          </div>
        )}
      </div>

      {/* Exercise Details */}
      {(formik.values.programServices.exerciseOnly || 
        formik.values.programServices.exerciseAndEducation) && (
        <div>
          <Label htmlFor="exercise">Exercise Details *</Label>
          <Textarea
            id="exercise"
            {...formik.getFieldProps('exercise')}
            placeholder="Please provide details about the exercise program"
            onChange={(e) => {
              formik.handleChange(e);
              formik.setFieldTouched('exercise', true, false);
              formik.validateField('exercise');
            }}
            onBlur={(e) => {
              formik.handleBlur(e);
              formik.validateField('exercise');
            }}
          />
          {formik.touched.exercise && formik.errors.exercise && (
            <div className="text-red-500 text-sm mt-1">{formik.errors.exercise}</div>
          )}
        </div>
      )}

      {/* Education Details */}
      {(formik.values.programServices.educationOnly || 
        formik.values.programServices.exerciseAndEducation) && (
        <div>
          <Label htmlFor="education">Education Details *</Label>
          <Textarea
            id="education"
            {...formik.getFieldProps('education')}
            placeholder="Please provide details about the education program"
            onChange={(e) => {
              formik.handleChange(e);
              formik.setFieldTouched('education', true, false);
              formik.validateField('education');
            }}
            onBlur={(e) => {
              formik.handleBlur(e);
              formik.validateField('education');
            }}
          />
          {formik.touched.education && formik.errors.education && (
            <div className="text-red-500 text-sm mt-1">{formik.errors.education}</div>
          )}
        </div>
      )}

      {/* Delivery Types */}
      <div>
        <Label>Type of Delivery & Duration *</Label>
        <div className="space-y-2">
          {[
            { id: 'f2f', value: 'F2F Group', label: 'F2F Group' },
            { id: 'telehealth', value: 'Telehealth', label: 'Telehealth' },
            { id: 'oneOnOne', value: '1:1', label: '1:1' },
            { id: 'hybrid', value: 'Hybrid', label: 'Hybrid' }
          ].map(({ id, value, label }) => (
            <div key={id} className="flex items-center space-x-2">
              <Checkbox
                id={id}
                checked={formik.values.deliveryTypes.includes(value)}
                onCheckedChange={(checked) => {
                  const currentTypes = formik.values.deliveryTypes;
                  const newTypes = checked
                    ? [...currentTypes, value]
                    : currentTypes.filter((type: string) => type !== value);
                  formik.setFieldValue('deliveryTypes', newTypes);
                  formik.setFieldTouched('deliveryTypes', true, false);
                  formik.validateField('deliveryTypes');
                  if (value === 'Hybrid' && !checked) {
                    formik.setFieldValue('hybridDescription', '');
                  }
                }}
              />
              <Label htmlFor={id}>{label}</Label>
            </div>
          ))}
        </div>
        {formik.touched.deliveryTypes && formik.errors.deliveryTypes && (
          <div className="text-red-500 text-sm mt-1">{formik.errors.deliveryTypes}</div>
        )}

        {formik.values.deliveryTypes.includes('Hybrid') && (
          <div className="mt-2">
            <Label htmlFor="hybridDescription">Hybrid Description *</Label>
            <Textarea
              id="hybridDescription"
              {...formik.getFieldProps('hybridDescription')}
              onChange={(e) => {
                formik.handleChange(e);
                formik.setFieldTouched('hybridDescription', true, false);
                formik.validateField('hybridDescription');
              }}
              onBlur={(e) => {
                formik.handleBlur(e);
                formik.validateField('hybridDescription');
              }}
            />
            {formik.touched.hybridDescription && formik.errors.hybridDescription && (
              <div className="text-red-500 text-sm mt-1">{formik.errors.hybridDescription}</div>
            )}
          </div>
        )}
      </div>

      {/* Enrollment */}
      <div>
        <Label htmlFor="enrollment">How Do I Enroll in the Program? *</Label>
        <Textarea
          id="enrollment"
          {...formik.getFieldProps('enrollment')}
          onChange={(e) => {
            formik.handleChange(e);
            formik.setFieldTouched('enrollment', true, false);
            formik.validateField('enrollment');
          }}
          onBlur={(e) => {
            formik.handleBlur(e);
            formik.validateField('enrollment');
          }}
        />
        {formik.touched.enrollment && formik.errors.enrollment && (
          <div className="text-red-500 text-sm mt-1">{formik.errors.enrollment}</div>
        )}
      </div>

      {/* Program Duration */}
      <div>
        <Label htmlFor="programDuration">Program Duration *</Label>
        <Select
          value={formik.values.programDuration}
          onValueChange={(value) => {
            formik.setFieldValue('programDuration', value);
            formik.setFieldTouched('programDuration', true, false);
            formik.validateField('programDuration');
            if (value !== 'Other') {
              formik.setFieldValue('customDuration', '');
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1 week">1 week</SelectItem>
            <SelectItem value="2 weeks">2 weeks</SelectItem>
            <SelectItem value="6 weeks">6 weeks</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        {formik.touched.programDuration && formik.errors.programDuration && (
          <div className="text-red-500 text-sm mt-1">{formik.errors.programDuration}</div>
        )}

        {formik.values.programDuration === 'Other' && (
          <div className="mt-2">
            <Input
              id="customDuration"
              placeholder="Specify custom duration"
              {...formik.getFieldProps('customDuration')}
              onChange={(e) => {
                formik.handleChange(e);
                formik.setFieldTouched('customDuration', true, false);
                formik.validateField('customDuration');
              }}
              onBlur={(e) => {
                formik.handleBlur(e);
                formik.validateField('customDuration');
              }}
            />
            {formik.touched.customDuration && formik.errors.customDuration && (
              <div className="text-red-500 text-sm mt-1">{formik.errors.customDuration}</div>
            )}
          </div>
        )}
      </div>

      <div>
        <Label>Program Frequency *</Label>
        <RadioGroup
          value={formik.values.programFrequency}
          onValueChange={(value) => {
            formik.setFieldValue('programFrequency', value);
            formik.setFieldTouched('programFrequency', true, false);
            formik.validateField('programFrequency');
            if (value !== 'Other') {
              formik.setFieldValue('customFrequency', '');
            }
          }}
        >
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Weekly" id="frequencyWeekly" />
              <Label htmlFor="frequencyWeekly">Weekly</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Twice Weekly" id="frequencyTwice" />
              <Label htmlFor="frequencyTwice">Twice Weekly</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Other" id="frequencyOther" />
              <Label htmlFor="frequencyOther">Other</Label>
            </div>
          </div>
        </RadioGroup>
        {formik.touched.programFrequency && formik.errors.programFrequency && (
          <div className="text-red-500 text-sm mt-1">
            {formik.errors.programFrequency}
          </div>
        )}

        {formik.values.programFrequency === 'Other' && (
          <div className="mt-2">
            <Input
              id="customFrequency"
              placeholder="Specify custom frequency"
              {...formik.getFieldProps('customFrequency')}
              onChange={(e) => {
                formik.handleChange(e);
                formik.setFieldTouched('customFrequency', true, false);
                formik.validateField('customFrequency');
              }}
              onBlur={(e) => {
                formik.handleBlur(e);
                formik.validateField('customFrequency');
              }}
            />
            {formik.touched.customFrequency && formik.errors.customFrequency && (
              <div className="text-red-500 text-sm mt-1">
                {formik.errors.customFrequency}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interpreter Availability */}
      <div>
        <Label>Do you provide an interpreter? *</Label>
        <RadioGroup
          value={formik.values.interpreterAvailable}
          onValueChange={(value) => {
            formik.setFieldValue('interpreterAvailable', value);
            formik.setFieldTouched('interpreterAvailable', true, false);
            formik.validateField('interpreterAvailable');
          }}
        >
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Yes" id="interpreterYes" />
              <Label htmlFor="interpreterYes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="No" id="interpreterNo" />
              <Label htmlFor="interpreterNo">No</Label>
            </div>
          </div>
        </RadioGroup>
        {formik.touched.interpreterAvailable && formik.errors.interpreterAvailable && (
          <div className="text-red-500 text-sm mt-1">
            {formik.errors.interpreterAvailable}
          </div>
        )}
      </div>

      {/* Special Conditions Support */}
      <div>
        <Label htmlFor="specialConditionsSupport">Other important information</Label>
        <Textarea
          id="specialConditionsSupport"
          {...formik.getFieldProps('specialConditionsSupport')}
          onChange={(e) => {
            formik.handleChange(e);
            formik.setFieldTouched('specialConditionsSupport', true, false);
            formik.validateField('specialConditionsSupport');
          }}
          onBlur={(e) => {
            formik.handleBlur(e);
            formik.validateField('specialConditionsSupport');
          }}
        />
        {formik.touched.specialConditionsSupport && formik.errors.specialConditionsSupport && (
          <div className="text-red-500 text-sm mt-1">
            {formik.errors.specialConditionsSupport}
          </div>
        )}
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

export const MultiStepForm: React.FC = () => {
  const params = useParams();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [initialFormData, setInitialFormData] = useState(initialValues);
  const [isLoading, setIsLoading] = useState(true);
  const isEditMode = Boolean(params?.serviceName);
  const { isValidating, startValidation, endValidation } = useValidationState();

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
            attendanceOptions: {
            ...response.data.attendanceOptions,
            otherSpecify: response.data.attendanceOptions?.otherSpecify || '' // Empty string
          },
          
          // Ensure program services have default values
          programServices: {
            ...response.data.programServices,
            otherSpecify: response.data.programServices?.otherSpecify || '' // Empty string
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
    startValidation();
    
    try {
      // Validate current step
      await validationSchemas[step].validate(values, { abortEarly: false });
      
      if (step < validationSchemas.length - 1) {
        setStep(step + 1);
        setSubmitting(false);
        return;
      }

      setIsSubmitting(true);
      
      // Your existing submission logic
      if (isEditMode && params?.serviceName) {
        const decodedName = decodeURIComponent(String(params.serviceName));
        const encodedServiceName = encodeURIComponent(decodedName);
        await axios.put(`/api/1241029013026-service/${encodedServiceName}`, values);
      } else {
        await axios.post('/api/submit', values);
      }
      
      setIsSubmitted(true);
      if (!isEditMode) {
        resetForm();
      }
    } catch (error) {
      console.error('Validation or submission error:', error);
      // Handle error appropriately
    } finally {
      setIsSubmitting(false);
      setSubmitting(false);
      endValidation();
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
          onSubmit={handleSubmit}
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

