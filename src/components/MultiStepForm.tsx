'use client'
import React, { useEffect, useState, useRef } from 'react';
import { Formik, Form, FormikProps } from 'formik';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import * as Yup from 'yup';
import { useLoadScript } from '@react-google-maps/api';
import { Library as GoogleMapsLibrary } from '@googlemaps/js-api-loader';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';


interface FormData {
  serviceName: string;
  primaryCoordinator: string;
  secondaryCoordinator: string;
  streetAddress: string;
  buildingName: string;
  phone1: string;
  phone2: string;
  phone3: string;
  fax1: string;
  fax2: string;
  primaryEmail: string;
  secondaryEmail: string;
  serviceDescription: string;
  serviceTypes: string[];
  deliveryModes: string[];
  specialGroups: string[];
  diagnosisOptions: string[];
  otherDiagnosis: string;
  procedureOptions: string[];
  otherProcedure: string;
  lat?: number; // Add latitude
  lng?: number; // Add longitude
  serviceType: string;
  serviceDescriptions: {
    [key: string]: string;
  };
}



// Removed Field import as it's not used

const initialValues: FormData = {
  serviceName: '',
  primaryCoordinator: '',
  secondaryCoordinator: '',
  streetAddress: '',
  buildingName: '',
  phone1: '',
  phone2: '',
  phone3: '',
  fax1: '',
  fax2: '',
  primaryEmail: '',
  secondaryEmail: '',
  serviceDescription: '',
  serviceTypes: [],
  deliveryModes: [],
  specialGroups: [],
  diagnosisOptions: [],
  otherDiagnosis: '',
  procedureOptions: [],
  otherProcedure: '',
  lat: undefined, // Initialize latitude
  lng: undefined,
  serviceType: '',
  serviceDescriptions: {},
};


const validationSchemas = [
  // Step 1
  Yup.object({
    serviceName: Yup.string().required('Service name is required'),
    primaryCoordinator: Yup.string().required('Primary coordinator is required'),
    secondaryCoordinator: Yup.string(),
    streetAddress: Yup.string().required('Street address is required'),
    buildingName: Yup.string(),
    phone1: Yup.string()
      .matches(/^\d+$/, 'Phone number must contain only numbers')
      .required('Primary phone is required'),
    phone2: Yup.string().matches(/^\d+$/, 'Phone number must contain only numbers'),
    phone3: Yup.string().matches(/^\d+$/, 'Phone number must contain only numbers'),
    fax1: Yup.string().matches(/^\d+$/, 'Fax number must contain only numbers'),
    fax2: Yup.string().matches(/^\d+$/, 'Fax number must contain only numbers'),
    primaryEmail: Yup.string()
      .email('Invalid email')
      .test('valid-domain', 'Email must have a valid extension', (value) => {
        return value ? /@\w+\.\w{2,}$/.test(value) : false;
      })
      .required('Primary email is required'),
    secondaryEmail: Yup.string().email('Invalid email').test('valid-domain', 'Email must have a valid extension', (value) => {
      return value ? /@\w+\.\w{2,}$/.test(value) : true;
    }),
    serviceDescription: Yup.string().required('Service description is required'),
    serviceType: Yup.string()
      .oneOf(['Public', 'Private'], 'Select either Public or Private')
      .required('Service type is required'),
  }),

  // Step 2
  Yup.object({
    serviceTypes: Yup.array().min(1, 'Select at least one service type').required('Service type is required'),
  }),

  // Step 3
  Yup.object({
    deliveryModes: Yup.array().min(1, 'Select at least one delivery mode').required('Delivery mode is required'),
  }),

  // Step 4
  Yup.object({
    specialGroups: Yup.array(),
  }),

  // Step 5
  Yup.object({
    diagnosisOptions: Yup.array().min(1, 'Select at least one diagnosis option').required('Diagnosis option is required'),
    otherDiagnosis: Yup.string(),
    procedureOptions: Yup.array().min(1, 'Select at least one procedure option').required('Procedure option is required'),
    otherProcedure: Yup.string(),
  }),
];

const GOOGLE_MAPS_API_KEY = 'AIzaSyAm-eP8b7-FH2A8nzYucTG9NcPTz0OiAX0';
const LIBRARIES: GoogleMapsLibrary[] = ["places"];

interface StepProps {
  formik: FormikProps<FormData>;
}

const Step1: React.FC<StepProps> = ({ formik }) => {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [hasSelectedAddress, setHasSelectedAddress] = useState(false);

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
              console.log("Latitude:", lat, "Longitude:", lng);
            }
          }
        });

        input.addEventListener('blur', () => {
          if (!hasSelectedAddress) {
            formik.setFieldValue('streetAddress', '');
            formik.setFieldValue('lat', undefined);
            formik.setFieldValue('lng', undefined);
            formik.setFieldTouched('streetAddress', true);
          }
          setHasSelectedAddress(false);
        });
      }
    }
  }, [isLoaded, autocomplete, formik, hasSelectedAddress]);

  if (!isLoaded) {
    return <div>Loading Google Maps...</div>;
  }

  
  return (
    <div className="space-y-4">
      <div className="grid gap-4">
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'> 
        <div>
          <Label htmlFor="serviceName">Service Name *</Label>
          <Input
            id="serviceName"
            {...formik.getFieldProps('serviceName')}
          />
          {formik.touched.serviceName && formik.errors.serviceName && (
            <div className="text-red-500 text-sm mt-1">{formik.errors.serviceName}</div>
          )}
        </div>

        <div>
          <Label className="mb-2">Type of Service *</Label>
          <div className="flex items-center space-x-4 mt-3">
            <div className="flex items-center">
              <input
                type="radio"
                id="publicService"
                name="serviceType"
                value="Public"
                checked={formik.values.serviceType === 'Public'}
                onChange={() => formik.setFieldValue('serviceType', 'Public')}
              />
              <Label htmlFor="publicService" className="ml-3">Public</Label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="privateService"
                name="serviceType"
                value="Private"
                checked={formik.values.serviceType === 'Private'}
                onChange={() => formik.setFieldValue('serviceType', 'Private')}
              />
              <Label htmlFor="privateService" className="ml-3">Private</Label>
            </div>
          </div>
          {formik.touched.serviceType && formik.errors.serviceType && (
            <div className="text-red-500 text-sm mt-1">{formik.errors.serviceType}</div>
          )}
        </div>
        </div>


        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
            <Label htmlFor="secondaryCoordinator">Secondary Coordinator</Label>
            <Input
              id="secondaryCoordinator"
              {...formik.getFieldProps('secondaryCoordinator')}
            />
          </div>
        </div>


        {/* Street Address with Google Maps Places Autocomplete */}
        <div>
          <Label htmlFor="streetAddress">Street Address (no P.O. boxes) *</Label>
          <Input
            id="streetAddress"
            {...formik.getFieldProps('streetAddress')}
          />

        </div>

        <div>
          <Label htmlFor="buildingName">Building Name</Label>
          <Input
            id="buildingName"
            {...formik.getFieldProps('buildingName')}
          />
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <Label htmlFor="phone1">Phone 1 *</Label>
            <Input
              id="phone1"
              type="tel"
              pattern="\d*"
              {...formik.getFieldProps('phone1')}
            />
            {formik.touched.phone1 && formik.errors.phone1 && (
              <div className="text-red-500 text-sm mt-1">{formik.errors.phone1}</div>
            )}
          </div>

          <div>
            <Label htmlFor="phone2">Phone 2</Label>
            <Input
              id="phone2"
              type="tel"
              pattern="\d*"
              {...formik.getFieldProps('phone2')}
            />
          </div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <Label htmlFor="fax1">Fax 1 (for referrals)</Label>
            <Input
              id="fax1"
              type="tel"
              pattern="\d*"
              {...formik.getFieldProps('fax1')}
            />
          </div>

          <div>
            <Label htmlFor="fax2">Fax 2</Label>
            <Input
              id="fax2"
              type="tel"
              pattern="\d*"
              {...formik.getFieldProps('fax2')}
            />
          </div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
          <Label htmlFor="primaryEmail">Primary Service Email *</Label>
<Input
             id="primaryEmail"
             type="email"
             {...formik.getFieldProps('primaryEmail')}
           />
           {formik.touched.primaryEmail && formik.errors.primaryEmail && (
<div className="text-red-500 text-sm mt-1">{formik.errors.primaryEmail}</div>
           )}
</div>
<div>
<Label htmlFor="secondaryEmail">Secondary Service Email</Label>
<Input
             id="secondaryEmail"
             type="email"
             {...formik.getFieldProps('secondaryEmail')}
           />
           {formik.touched.secondaryEmail && formik.errors.secondaryEmail && (
<div className="text-red-500 text-sm mt-1">{formik.errors.secondaryEmail}</div>
           )}
</div>
        </div>
        <div>
          <Label htmlFor="serviceDescription">Service Description *</Label>
          <Textarea
            id="serviceDescription"
            {...formik.getFieldProps('serviceDescription')}
          />
          {formik.touched.serviceDescription && formik.errors.serviceDescription && (
            <div className="text-red-500 text-sm mt-1">{formik.errors.serviceDescription}</div>
          )}
        </div>
      </div>
    </div>
  );
};


const Step2: React.FC<StepProps> = ({ formik }) => {
  const serviceTypeOptions = [
    'Cardiac Rehabilitation – Inpatient',
    'Cardiac Rehabilitation – Outpatient',
    'Cardiac Rehabilitation – Maintenance',
    'Heart Failure Management',
    'Chronic Disease Management (that caters for cardiac patients)',
  ] as const;

  const initialDescriptions: { [key in typeof serviceTypeOptions[number]]?: string } = {
    'Cardiac Rehabilitation – Inpatient': '6 – 8 week program, Gym sessions twice a week and education sessions once a week.',
    'Cardiac Rehabilitation – Outpatient': 'Heart failure patients are included in the phase 2 program if they meet the criteria and education sessions will include relevant information for heart failure patients.',
  };

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      // Populate the initial descriptions in the formik.values.serviceDescriptions
      serviceTypeOptions.forEach((option) => {
        if (initialDescriptions[option]) {
          formik.setFieldValue(`serviceDescriptions.${option}`, initialDescriptions[option]);
        }
      });
      isInitialMount.current = false;
    }
  }, [formik, serviceTypeOptions, initialDescriptions]);

  return (
    <div className="space-y-4">
      <div className="font-medium mb-4">Select Service Types *</div>
      {serviceTypeOptions.map((option) => (
        <div key={option} className="space-y-2">
          {/* Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id={option}
              checked={formik.values.serviceTypes.includes(option)}
              onCheckedChange={(checked) => {
                const newTypes = checked
                  ? [...formik.values.serviceTypes, option]
                  : formik.values.serviceTypes.filter((t: string) => t !== option);
                formik.setFieldValue('serviceTypes', newTypes);
              }}
            />
            <Label htmlFor={option}>{option}</Label>
          </div>

          {/* Conditionally render the description box if the checkbox is checked */}
          {formik.values.serviceTypes.includes(option) && (
            <div className="mt-2">
              <Textarea
                id={`${option}-description`}
                placeholder="Enter description..."
                value={formik.values.serviceDescriptions[option] || ''}
                onChange={(e) => {
                  formik.setFieldValue(`serviceDescriptions.${option}`, e.target.value);
                }}
              />
            </div>
          )}
        </div>
      ))}
      {formik.touched.serviceTypes && formik.errors.serviceTypes && (
        <div className="text-red-500 text-sm mt-1">{formik.errors.serviceTypes}</div>
      )}
    </div>
  );
};


const Step3: React.FC<StepProps> = ({ formik }) => {
  const deliveryModeOptions = [
    'Face-to-face – group-based',
    'Face-to-face – home-based',
    'Face-to-face – individual',
    'Phone-based',
    'Web-enabled',
    'Other home-based',
  ];

  return (
    <div className="space-y-4">
      <div className="font-medium mb-4">Select Delivery Modes *</div>
      {deliveryModeOptions.map((option) => (
        <div key={option} className="flex items-center space-x-2">
          <Checkbox
            id={option}
            checked={formik.values.deliveryModes.includes(option)}
            onCheckedChange={(checked) => {
              const newModes = checked
                ? [...formik.values.deliveryModes, option]
                : formik.values.deliveryModes.filter((m: string) => m !== option);
              formik.setFieldValue('deliveryModes', newModes);
            }}
          />
          <Label htmlFor={option}>{option}</Label>
        </div>
      ))}
      {formik.touched.deliveryModes && formik.errors.deliveryModes && (
        <div className="text-red-500 text-sm mt-1">{formik.errors.deliveryModes}</div>
      )}
    </div>
  );
};

const Step4: React.FC<StepProps> = ({ formik }) => {
  const specialGroupOptions = [
    'Aboriginal and Torres Strait Islander Peoples',
    'Culturally and Linguistically Diverse',
  ];

  return (
    <div className="space-y-4">
      <div className="font-medium mb-4">Select Special Groups (Optional)</div>
      {specialGroupOptions.map((option) => (
        <div key={option} className="flex items-center space-x-2">
          <Checkbox
            id={option}
            checked={formik.values.specialGroups.includes(option)}
            onCheckedChange={(checked) => {
              const newGroups = checked
                ? [...formik.values.specialGroups, option]
                : formik.values.specialGroups.filter((g: string) => g !== option);
              formik.setFieldValue('specialGroups', newGroups);
            }}
          />
          <Label htmlFor={option}>{option}</Label>
        </div>
      ))}
    </div>
  );
};

const Step5: React.FC<StepProps> = ({ formik }) => {
  const diagnosisOptionsList = [
    'Acute coronary syndrome: acute myocardial infarction & stable or unstable angina',
    'Coronary heart disease',
    'Heart failure',
    'Cardiomyopathies',
    'Arrhythmia - Atrial fibrillation, atrial flutter, supraventricular tachycardia (SVT)',
    'Adult congenital heart disease, pulmonary hypertension, peripheral vascular disease',
  ];

  const procedureOptionsList = [
    'Re-vascularisation - coronary angioplasty or stenting',
    'Coronary artery bypass graft (CABG) surgery',
    'Valve surgery',
    'Cardiac Transplant',
    'Defibrillator or pacemaker implantation',
    'Cardiac surgery: AAA repair, congenital, LVADS, Arrhythmia Surgery or combination',
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="font-medium mb-4">Select Diagnosis Options *</div>
        {diagnosisOptionsList.map((option) => (
          <div key={option} className="flex items-center space-x-2 mb-2">
            <Checkbox
              id={`diagnosis-${option}`}
              checked={formik.values.diagnosisOptions.includes(option)}
              onCheckedChange={(checked) => {
                const newOptions = checked
                  ? [...formik.values.diagnosisOptions, option]
                  : formik.values.diagnosisOptions.filter((o: string) => o !== option);
                formik.setFieldValue('diagnosisOptions', newOptions);
              }}
            />
            <Label htmlFor={`diagnosis-${option}`}>{option}</Label>
          </div>
        ))}
        {formik.touched.diagnosisOptions && formik.errors.diagnosisOptions && (
          <div className="text-red-500 text-sm mt-1">{formik.errors.diagnosisOptions}</div>
        )}

        <div className="mt-4">
          <Label htmlFor="otherDiagnosis">Other Diagnosis</Label>
          <Textarea
            id="otherDiagnosis"
            {...formik.getFieldProps('otherDiagnosis')}
          />
        </div>
      </div>

      <div>
        <div className="font-medium mb-4">Select Procedure Options *</div>
        {procedureOptionsList.map((option) => (
          <div key={option} className="flex items-center space-x-2 mb-2">
            <Checkbox
              id={`procedure-${option}`}
              checked={formik.values.procedureOptions.includes(option)}
              onCheckedChange={(checked) => {
                const newOptions = checked
                  ? [...formik.values.procedureOptions, option]
                  : formik.values.procedureOptions.filter((o: string) => o !== option);
                formik.setFieldValue('procedureOptions', newOptions);
              }}
            />
            <Label htmlFor={`procedure-${option}`}>{option}</Label>
          </div>

        ))}
        {formik.touched.procedureOptions && formik.errors.procedureOptions && (
          <div className="text-red-500 text-sm mt-1">{formik.errors.procedureOptions}</div>
        )}

        <div className="mt-4">
          <Label htmlFor="otherProcedure">Other Procedure</Label>
          <Textarea
            id="otherProcedure"
            {...formik.getFieldProps('otherProcedure')}
          />
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-600">
        By submitting this form I agree that I have read and accepted the Joint Collection
        privacy statement and that the information I have provided will be processed.
      </div>
    </div>
  );
};

export const MultiStepForm: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [initialFormData, setInitialFormData] = useState(initialValues);
  const [isLoading, setIsLoading] = useState(true);
  const isEditMode = Boolean(params?.serviceName);
  useEffect(() => {
    const fetchServiceData = async () => {
      if (isEditMode) {
        try {
          const response = await axios.get(`http://localhost:3001/service/${params.serviceName}`);
          setInitialFormData(response.data);
        } catch (error) {
          console.error('Error fetching service data:', error);
          // Handle error appropriately
        }
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    };
    fetchServiceData();
  }, [isEditMode, params?.serviceName]);

  const getStepTitle = () => {
    switch (step) {
      case 0: return 'Service Information';
      case 1: return 'Services Offered';
      case 2: return 'Delivery Options';
      case 3: return 'Specific Populations';
      case 4: return 'Eligible Patients';
      default: return '';
    }
  };

  const SuccessPage = () => (
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
          Registration Submitted Successfully!
        </h3>
        <p className="text-gray-600">
          Thank you for registering your service. Your information has been successfully submitted and will be added to the directory shortly.
        </p>
        <div className="mt-8">
          <Button
            type="button"
            onClick={() => {
              setIsSubmitted(false);
              setStep(0);
            }}
            className="custom-bg hover:bg-opacity-80"
          >
            Register Another Service
          </Button>
        </div>
      </div>
    </div>
  );


  const handleSubmit = async (values: FormData, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void, resetForm: () => void }) => {
    if (step < validationSchemas.length - 1) {
      setStep(step + 1);
      setSubmitting(false);
      return;
    }
    setIsSubmitting(true);
    try {
      let response;
      if (isEditMode) {
        response = await axios.put(`http://localhost:3001/service/${params.serviceName}`, values, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } else {
        response = await axios.post('http://localhost:3001/submit-form', values, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      if (response.status === 200) {
        setIsSubmitted(true);
        resetForm();
      } else {
        console.error('Error submitting form');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  if (isLoading) {
    return <div>Loading...</div>;
  }

  const handleBack = () => {
    setStep(step - 1);
  };

  const getStepContent = (formik: FormikProps<FormData>) => {
    if (isSubmitted) {
      return <SuccessPage />;
    }

    switch (step) {
      case 0: return <Step1 formik={formik} />;
      case 1: return <Step2 formik={formik} />;
      case 2: return <Step3 formik={formik} />;
      case 3: return <Step4 formik={formik} />;
      case 4: return <Step5 formik={formik} />;
      default: return null;
    }
  };

  return (
    <Card style={{ backgroundColor: '#f2f1f0' }} className="w-full max-w-3xl mx-auto">
<CardHeader>
<CardTitle className="text-2xl">
         {isSubmitted ? 'Registration Complete' :
          isEditMode ? `Edit Service: ${params.serviceName}` : 'Service Registration'}
</CardTitle>
        {!isSubmitted && (
          
          <><div className="text-sm text-gray-500">
            Step {step + 1} of 5: {getStepTitle()}
          </div><div className="mt-6">
              <div className="flex justify-between">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-1/5 rounded-full mx-1 ${i <= step ? 'custom-bg' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div></>
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
>
          {(formik) => (
            <Form className="space-y-6">
              {getStepContent(formik)}

              {!isSubmitted && (
                <>
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
                    <div className="ml-auto">
                      <Button
                        type="submit"
                        disabled={isSubmitting || !formik.isValid}
                        className={`custom-bg ${step === 4 ? 'hover:bg-opacity-80' : ''}`}
                      >
                        {isSubmitting ? (
                          <div className="flex items-center">
                            <span className="mr-2">Processing...</span>
                          </div>
                        ) : step === 4 ? (
                          'Submit Registration'
                        ) : (
                          'Continue'
                        )}
                      </Button>
                    </div>
                  </div>

                  
                </>
              )}
            </Form>
          )}
        </Formik>
      </CardContent>
    </Card>
  );
};