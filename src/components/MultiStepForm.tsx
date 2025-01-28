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
  interpreterAvailable: 'No',
  specialConditionsSupport: '',
  website: ''
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
    void response;
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
      .test('unique-service-name', 'Service name already exists', 
        async function(value) {
          if (!value) return true; // Skip validation if empty
          try {
            const exists = await checkServiceNameExists(value, this.parent.originalServiceName);
            return !exists;
          } catch (error) {
            return true; // Allow submission if check fails
          }
        }
      ),
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
          .required('Please specify interpreter availability')
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

        <div>
          <Label htmlFor="primaryCoordinator">Primary Coordinator *</Label>
          <Input
            id="primaryCoordinator"
            {...formik.getFieldProps('primaryCoordinator')}
          />
          {formik.touched.primaryCoordinator && formik.errors.primaryCoordinator && (
            <div className="text-red-500 text-sm mt-1">{formik.errors.primaryCoordinator}</div>
          )}
        </div>

        <div>
          <Label htmlFor="streetAddress">Street Address (No PO Box) *</Label>
          <Input
            id="streetAddress"
            {...formik.getFieldProps('streetAddress')}
          />
        </div>

        <div>
          <Label htmlFor="directions">Directions (How to find/where to park)</Label>
          <Textarea
            id="directions"
            {...formik.getFieldProps('directions')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Phone Number *</Label>
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
            <Label htmlFor="fax">Fax</Label>
            <Input
              id="fax"
              {...formik.getFieldProps('fax')}
            />
            {formik.touched.fax && formik.errors.fax && (
              <div className="text-red-500 text-sm mt-1">{formik.errors.fax}</div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email (Generic preferred) *</Label>
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
          <Label>Program Type *</Label>
          <Select
            value={formik.values.programType}
            onValueChange={(value: string) => formik.setFieldValue('programType', value as 'Public' | 'Private')}
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
          <Label>ACRA/ICCPR Certification Status</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="providerCertification"
                checked={formik.values.certification.providerCertification}
                onCheckedChange={(checked) => {
                  formik.setFieldValue('certification.providerCertification', checked);
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
                }}
              />
              <Label htmlFor="programCertification">Program Certification</Label>
            </div>
          </div>
        </div>
        <hr  style={{
    color: '#000000',
    backgroundColor: '#000000',
    height: .5,
    borderColor : '#000000'
}}/>
        <div className="flex items-center space-x-2">
       
          <Checkbox
            id="silentListing"
            checked={formik.values.silentListing}
            onCheckedChange={(checked) => {
              formik.setFieldValue('silentListing', checked);
            }}
          />
          <Label htmlFor="silentListing">Silent Listing Option (The silent listing option is available to services that do not wish to be listed publicly in the directory. Your service will be included but hidden from public view, and you can make it public anytime.)</Label>
        </div>
      </div>
    </div>
  );
};

const Step2: React.FC<StepProps> = ({ formik }) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
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
              People with Coronary heart disease; angina, heart attack, stent, bypass surgery
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
              Heart failure or cardiomyopathy
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
              Heart electrical rhythm problems; e.g. Atrial Fibrillation
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
            <Label htmlFor="other">Other, please specify</Label>
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
            <Label htmlFor="otherServices">More information, please specify</Label>
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
            {...formik.getFieldProps('exercise')}
            placeholder="Please provide details about the exercise program"
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
            {...formik.getFieldProps('education')}
            placeholder="Please provide details about the education program"
          />
          {formik.touched.education && formik.errors.education && (
            <div className="text-red-500 text-sm mt-1">{formik.errors.education}</div>
          )}
        </div>
      )}

      <div>
              <Label>Type of Delivery & Duration *</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="f2f"
                    checked={formik.values.deliveryTypes.includes('F2F Group')}
                    onCheckedChange={(checked) => {
                      const currentTypes = formik.values.deliveryTypes;
                      const newTypes = checked 
                        ? [...currentTypes, 'F2F Group']
                        : currentTypes.filter((type: string) => type !== 'F2F Group');
                      formik.setFieldValue('deliveryTypes', newTypes);
                    }}
                  />
                  <Label htmlFor="f2f">F2F Group</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="telehealth"
                    checked={formik.values.deliveryTypes.includes('Telehealth')}
                    onCheckedChange={(checked) => {
                      const currentTypes = formik.values.deliveryTypes;
                      const newTypes = checked 
                        ? [...currentTypes, 'Telehealth']
                        : currentTypes.filter((type: string) => type !== 'Telehealth');
                      formik.setFieldValue('deliveryTypes', newTypes);
                    }}
                  />
                  <Label htmlFor="telehealth">Telehealth</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="oneOnOne"
                    checked={formik.values.deliveryTypes.includes('1:1')}
                    onCheckedChange={(checked) => {
                      const currentTypes = formik.values.deliveryTypes;
                      const newTypes = checked 
                        ? [...currentTypes, '1:1']
                        : currentTypes.filter((type: string) => type !== '1:1');
                      formik.setFieldValue('deliveryTypes', newTypes);
                    }}
                  />
                  <Label htmlFor="oneOnOne">1:1</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hybrid"
                    checked={formik.values.deliveryTypes.includes('Hybrid')}
                    onCheckedChange={(checked) => {
                      const currentTypes = formik.values.deliveryTypes;
                      const newTypes = checked 
                        ? [...currentTypes, 'Hybrid']
                        : currentTypes.filter((type: string) => type !== 'Hybrid');
                      formik.setFieldValue('deliveryTypes', newTypes);
                    }}
                  />
                  <Label htmlFor="hybrid">Hybrid</Label>
                </div>
              </div>
              {formik.errors.deliveryTypes && (
                <div className="text-red-500 text-sm mt-1">{formik.errors.deliveryTypes}</div>
              )}
      
              {formik.values.deliveryTypes.includes('Hybrid') && (
                <div className="mt-2">
                  <Label htmlFor="hybridDescription">Hybrid Description *</Label>
                  <Textarea
                    id="hybridDescription"
                    {...formik.getFieldProps('hybridDescription')}
                    value={formik.values.hybridDescription || ''}  // Ensure empty string if null
                  />
                  {formik.touched.hybridDescription && formik.errors.hybridDescription && (
                    <div className="text-red-500 text-sm mt-1">{formik.errors.hybridDescription}</div>
                  )}
                </div>
              )}
            </div>

      <div>
        <Label htmlFor="enrollment">How Do I Enroll in the Program? *</Label>
        <Textarea
          id="enrollment"
          {...formik.getFieldProps('enrollment')}
        />
        {formik.touched.enrollment && formik.errors.enrollment && (
          <div className="text-red-500 text-sm mt-1">{formik.errors.enrollment}</div>
        )}
      </div>

      <div>
              <Label>Do you provide an interpreter? *</Label>
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
        <Label htmlFor="specialConditionsSupport">Any support for specific conditions (e.g., SCAD)</Label>
        <Textarea
          id="specialConditionsSupport"
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
    if (step < validationSchemas.length - 1) {
      setStep(step + 1);
      setSubmitting(false);
      return;
    }
  
    console.log('Starting submit...', { isEditMode, values });
  
    setIsSubmitting(true);
    setSubmitting(true);
  
    try {
      let response;
      if (isEditMode && params?.serviceName) {
        // First decode the URL parameter, then encode it properly
        const decodedName = decodeURIComponent(String(params.serviceName));
        const encodedServiceName = encodeURIComponent(decodedName);
        
        console.log('Updating service:', {
          original: params.serviceName,
          decoded: decodedName,
          encoded: encodedServiceName
        });
  
        const url = `/api/1241029013026-service/${encodedServiceName}`;
        response = await axios.put(url, values);
      } else {
        response = await axios.post('/api/submit', values);
      }
      
      if (response.status === 200) {
        setIsSubmitted(true);
        if (!isEditMode) {
          resetForm();
        }
      }
    } catch (error: any) {
      console.error('Submit error:', error);
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

