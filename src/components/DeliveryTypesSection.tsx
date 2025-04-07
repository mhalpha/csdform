// DeliveryTypesSection.tsx
import React from 'react';
import { FormikProps } from 'formik';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

export type DeliveryType = 'F2F Group' | 'Telehealth' | '1:1' | 'Hybrid';

export interface DaySchedule {
  startHour: string;
  startMinute: string;
  startAmPm: string;
  endHour: string;
  endMinute: string;
  endAmPm: string;
}

export interface DeliveryTypeConfig {
  duration: string;
  customDuration?: string;
  frequency: string;
  customFrequency?: string;
  description?: string;
  schedule?: {
    [day: string]: DaySchedule;
  };
}

export interface FormDataWithDelivery {
  deliveryTypes: DeliveryType[];
  deliveryTypeConfigs: {
    [key in DeliveryType]?: DeliveryTypeConfig;
  };
  hybridDescription?: string;
  f2fDescription?: string;
  telehealthDescription?: string;
  individualDescription?: string;
}

interface DeliveryTypeSectionProps {
  type: DeliveryType;
  formik: FormikProps<FormDataWithDelivery>;
}

const DeliveryTypeSection: React.FC<DeliveryTypeSectionProps> = ({ type, formik }) => {
  const config: DeliveryTypeConfig = formik.values.deliveryTypeConfigs[type] || {
    duration: '',
    frequency: '',
    customDuration: '',
    customFrequency: '',
    description: '',
    schedule: {}
  };

  // Map display names for delivery types
  const typeDisplayNames = {
    'F2F Group': 'Face to face group program',
    'Telehealth': 'Telehealth program (via phone/internet)',
    '1:1': 'Individual program',
    'Hybrid': 'Hybrid program (including face to face/individual and telehealth delivery)'
  };

  // Program length options
  const programLengthOptions = [
    { value: '1 week', label: '1 week' },
    { value: '2 weeks', label: '2 weeks' },
    { value: '3 weeks', label: '3 weeks' },
    { value: '4 weeks', label: '4 weeks' },
    { value: '5 weeks', label: '5 weeks' },
    { value: '6 weeks', label: '6 weeks' },
    { value: '7 weeks', label: '7 weeks' },
    { value: '8 weeks', label: '8 weeks' },
    { value: 'Other', label: 'Other' }
  ];

  // Days of the week
  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  // Hour options
  const hourOptions = [
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
  ];

  // Minute options
  const minuteOptions = [
    '00', '15', '30', '45'
  ];

  // AM/PM options
  const amPmOptions = ['AM', 'PM'];

  // Description placeholder based on delivery type
  const getDescriptionPlaceholder = () => {
    switch (type) {
      case 'F2F Group':
        return "Please describe how your face to face group program is delivered";
      case 'Telehealth':
        return "Please describe how your telehealth program is delivered";
      case '1:1':
        return "Please describe how your individual program is delivered";
      case 'Hybrid':
        return "Please describe how your hybrid program is delivered";
      default:
        return "Please describe how your program is delivered";
    }
  };

  // Helper function to check if there's a config error for this delivery type
  const hasConfigError = () => {
    return formik.errors.deliveryTypeConfigs && 
           typeof formik.errors.deliveryTypeConfigs === 'string' &&
           formik.touched.deliveryTypeConfigs;
  };

  // Helper function to extract specific error for this type
  const getConfigErrorMessage = () => {
    if (typeof formik.errors.deliveryTypeConfigs === 'string') {
      // Just a basic check to see if the error message mentions this specific type
      if ((formik.errors.deliveryTypeConfigs as string).includes(type)) {
        return formik.errors.deliveryTypeConfigs;
      }
      // If it has no days selected
      if (!config.schedule || Object.keys(config.schedule).length === 0) {
        return `Please select at least one day for ${type}`;
      }
      // General config error
      return formik.errors.deliveryTypeConfigs;
    }
    return null;
  };

  return (
    <div className="ml-8 space-y-4 mt-2">
      <div>
        <Label htmlFor={`${type}-duration`}>Program Length *</Label>
        <Select
          value={config.duration}
          onValueChange={(value) => {
            formik.setFieldValue(`deliveryTypeConfigs.${type}`, {
              ...config,
              duration: value,
              customDuration: value !== 'Other' ? '' : config.customDuration
            });
            // Mark as touched to enable validation errors
            formik.setFieldTouched(`deliveryTypeConfigs.${type}.duration`, true);
            formik.setFieldTouched('deliveryTypeConfigs', true);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select program length" />
          </SelectTrigger>
          <SelectContent>
            {programLengthOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Error for program length */}
        {!config.duration && hasConfigError() && (
          <div className="text-red-500 text-sm mt-1">Program length is required</div>
        )}

        {config.duration === 'Other' && (
          <div className="mt-2">
            <Input
              id={`${type}-customDuration`}
              placeholder="Specify custom program length"
              value={config.customDuration || ''}
              onChange={(e) => {
                formik.setFieldValue(`deliveryTypeConfigs.${type}`, {
                  ...config,
                  customDuration: e.target.value
                });
                // Mark as touched to enable validation errors
                formik.setFieldTouched(`deliveryTypeConfigs.${type}.customDuration`, true);
                formik.setFieldTouched('deliveryTypeConfigs', true);
              }}
            />
            {/* Error for custom duration */}
            {config.duration === 'Other' && !config.customDuration && hasConfigError() && (
              <div className="text-red-500 text-sm mt-1">Custom program length is required</div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Label>Day and Time *</Label>
        
        <div className="space-y-4">
          {daysOfWeek.map(day => {
            const isDaySelected = Boolean(config.schedule && config.schedule[day]);
            const daySchedule = config.schedule && config.schedule[day] ? config.schedule[day] : {
              startHour: '9',
              startMinute: '00',
              startAmPm: 'AM',
              endHour: '10',
              endMinute: '00',
              endAmPm: 'AM'
            };
            
            return (
              <div key={day} className="border-b pb-4 mb-2 last:border-b-0">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${type}-day-${day}`}
                    checked={isDaySelected}
                    onCheckedChange={(checked) => {
                      const newSchedule = { ...config.schedule };
                      
                      if (checked) {
                        // Add day with default time
                        newSchedule[day] = {
                          startHour: '9',
                          startMinute: '00',
                          startAmPm: 'AM',
                          endHour: '10',
                          endMinute: '00',
                          endAmPm: 'AM'
                        };
                      } else {
                        // Remove day
                        if (newSchedule[day]) {
                          delete newSchedule[day];
                        }
                      }
                      
                      formik.setFieldValue(`deliveryTypeConfigs.${type}.schedule`, newSchedule);
                      // Mark as touched to enable validation errors
                      formik.setFieldTouched(`deliveryTypeConfigs.${type}.schedule`, true);
                      formik.setFieldTouched('deliveryTypeConfigs', true);
                    }}
                  />
                  <Label htmlFor={`${type}-day-${day}`} className="font-medium">{day}</Label>
                </div>
                
                {isDaySelected && (
                  <div className="mt-2 ml-6 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-normal">Time (from)</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Select
                            value={daySchedule.startHour}
                            onValueChange={(value) => {
                              const newSchedule = { ...config.schedule };
                              newSchedule[day] = {
                                ...daySchedule,
                                startHour: value
                              };
                              formik.setFieldValue(`deliveryTypeConfigs.${type}.schedule`, newSchedule);
                              formik.setFieldTouched(`deliveryTypeConfigs.${type}.schedule.${day}`, true);
                            }}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue placeholder="Hour" />
                            </SelectTrigger>
                            <SelectContent>
                              {hourOptions.map(hour => (
                                <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <span>:</span>
                          
                          <Select
                            value={daySchedule.startMinute}
                            onValueChange={(value) => {
                              const newSchedule = { ...config.schedule };
                              newSchedule[day] = {
                                ...daySchedule,
                                startMinute: value
                              };
                              formik.setFieldValue(`deliveryTypeConfigs.${type}.schedule`, newSchedule);
                            }}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue placeholder="Min" />
                            </SelectTrigger>
                            <SelectContent>
                              {minuteOptions.map(minute => (
                                <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select
                            value={daySchedule.startAmPm}
                            onValueChange={(value) => {
                              const newSchedule = { ...config.schedule };
                              newSchedule[day] = {
                                ...daySchedule,
                                startAmPm: value
                              };
                              formik.setFieldValue(`deliveryTypeConfigs.${type}.schedule`, newSchedule);
                            }}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent>
                              {amPmOptions.map(option => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-normal">Time (to)</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Select
                            value={daySchedule.endHour}
                            onValueChange={(value) => {
                              const newSchedule = { ...config.schedule };
                              newSchedule[day] = {
                                ...daySchedule,
                                endHour: value
                              };
                              formik.setFieldValue(`deliveryTypeConfigs.${type}.schedule`, newSchedule);
                            }}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue placeholder="Hour" />
                            </SelectTrigger>
                            <SelectContent>
                              {hourOptions.map(hour => (
                                <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <span>:</span>
                          
                          <Select
                            value={daySchedule.endMinute}
                            onValueChange={(value) => {
                              const newSchedule = { ...config.schedule };
                              newSchedule[day] = {
                                ...daySchedule,
                                endMinute: value
                              };
                              formik.setFieldValue(`deliveryTypeConfigs.${type}.schedule`, newSchedule);
                            }}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue placeholder="Min" />
                            </SelectTrigger>
                            <SelectContent>
                              {minuteOptions.map(minute => (
                                <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select
                            value={daySchedule.endAmPm}
                            onValueChange={(value) => {
                              const newSchedule = { ...config.schedule };
                              newSchedule[day] = {
                                ...daySchedule,
                                endAmPm: value
                              };
                              formik.setFieldValue(`deliveryTypeConfigs.${type}.schedule`, newSchedule);
                            }}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent>
                              {amPmOptions.map(option => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Error for no days selected */}
        {(!config.schedule || Object.keys(config.schedule || {}).length === 0) && 
         hasConfigError() && (
          <div className="text-red-500 text-sm mt-1">
            Please select at least one day for {type}
          </div>
        )}
        
        {/* We're keeping the frequency field but hiding it to maintain compatibility */}
        <input type="hidden" 
          value="scheduled" 
          onChange={() => {
            formik.setFieldValue(`deliveryTypeConfigs.${type}.frequency`, "scheduled");
          }} 
        />
      </div>

      {/* Description field for the delivery type */}
      <div>
        <Label htmlFor={`${type}-description`}>{typeDisplayNames[type]} Description *</Label>
        <Textarea
          id={`${type}-description`}
          placeholder={getDescriptionPlaceholder()}
          value={
            type === 'Hybrid' 
              ? formik.values.hybridDescription || '' 
              : type === 'F2F Group'
                ? formik.values.f2fDescription || ''
                : type === 'Telehealth'
                  ? formik.values.telehealthDescription || ''
                  : formik.values.individualDescription || ''
          }
          onChange={(e) => {
            if (type === 'Hybrid') {
              formik.setFieldValue('hybridDescription', e.target.value);
              formik.setFieldTouched('hybridDescription', true);
            } else if (type === 'F2F Group') {
              formik.setFieldValue('f2fDescription', e.target.value);
              formik.setFieldTouched('f2fDescription', true);
            } else if (type === 'Telehealth') {
              formik.setFieldValue('telehealthDescription', e.target.value);
              formik.setFieldTouched('telehealthDescription', true);
            } else if (type === '1:1') {
              formik.setFieldValue('individualDescription', e.target.value);
              formik.setFieldTouched('individualDescription', true);
            }
          }}
          onBlur={formik.handleBlur}
        />
        {type === 'Hybrid' && formik.touched.hybridDescription && formik.errors.hybridDescription && (
          <div className="text-red-500 text-sm mt-1">{formik.errors.hybridDescription}</div>
        )}
        {type === 'F2F Group' && formik.touched.f2fDescription && formik.errors.f2fDescription && (
          <div className="text-red-500 text-sm mt-1">{formik.errors.f2fDescription}</div>
        )}
        {type === 'Telehealth' && formik.touched.telehealthDescription && formik.errors.telehealthDescription && (
          <div className="text-red-500 text-sm mt-1">{formik.errors.telehealthDescription}</div>
        )}
        {type === '1:1' && formik.touched.individualDescription && formik.errors.individualDescription && (
          <div className="text-red-500 text-sm mt-1">{formik.errors.individualDescription}</div>
        )}
      </div>
    </div>
  );
};

export const DeliveryTypesSection: React.FC<{ formik: FormikProps<FormDataWithDelivery> }> = ({ formik }) => {
  const deliveryTypes: { value: DeliveryType, label: string }[] = [
    { value: 'F2F Group', label: 'Face to face group program' },
    { value: 'Telehealth', label: 'Telehealth program (via phone/internet)' },
    { value: '1:1', label: 'Individual program' },
    { value: 'Hybrid', label: 'Hybrid program (including face to face/individual and telehealth delivery)' }
  ];

  return (
    <div>
      <Label>Program delivery information: *</Label>
      <div className="space-y-4">
        {deliveryTypes.map((typeObj) => (
          <div key={typeObj.value} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={typeObj.value}
                checked={formik.values.deliveryTypes.includes(typeObj.value)}
                onCheckedChange={(checked) => {
                  const currentTypes = formik.values.deliveryTypes;
                  const newTypes = checked 
                    ? [...currentTypes, typeObj.value]
                    : currentTypes.filter((t) => t !== typeObj.value);
                  formik.setFieldValue('deliveryTypes', newTypes);
                  formik.setFieldTouched('deliveryTypes', true);
                  
                  // Handle config cleanup
                  if (!checked) {
                    const newConfigs = { ...formik.values.deliveryTypeConfigs };
                    delete newConfigs[typeObj.value];
                    formik.setFieldValue('deliveryTypeConfigs', newConfigs);
                    
                    // Clear the description field for this type
                    if (typeObj.value === 'Hybrid') {
                      formik.setFieldValue('hybridDescription', '');
                    } else if (typeObj.value === 'F2F Group') {
                      formik.setFieldValue('f2fDescription', '');
                    } else if (typeObj.value === 'Telehealth') {
                      formik.setFieldValue('telehealthDescription', '');
                    } else if (typeObj.value === '1:1') {
                      formik.setFieldValue('individualDescription', '');
                    }
                  } else {
                    // Initialize config when checkbox is checked
                    formik.setFieldValue(`deliveryTypeConfigs.${typeObj.value}`, {
                      duration: '',
                      frequency: 'scheduled', // Default to scheduled since we're not using frequency anymore
                      schedule: {}
                    });
                  }
                }}
              />
              <Label htmlFor={typeObj.value}>{typeObj.label}</Label>
            </div>
            
            {formik.values.deliveryTypes.includes(typeObj.value) && (
              <DeliveryTypeSection type={typeObj.value} formik={formik} />
            )}
          </div>
        ))}
      </div>
      
      {/* Error for delivery types selection */}
      {formik.touched.deliveryTypes && formik.errors.deliveryTypes && (
        <div className="text-red-500 text-sm mt-1">{formik.errors.deliveryTypes}</div>
      )}
      
      {/* General error for delivery type configs if it's not shown in specific sections */}
    </div>
  );
};