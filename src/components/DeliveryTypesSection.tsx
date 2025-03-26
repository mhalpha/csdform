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
              }}
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Label>Day and Time</Label>
        
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
        
        {/* We're keeping the frequency field but hiding it to maintain compatibility */}
        <input type="hidden" 
          value="scheduled" 
          onChange={() => {
            formik.setFieldValue(`deliveryTypeConfigs.${type}.frequency`, "scheduled");
          }} 
        />
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
                  
                  // Handle config cleanup
                  if (!checked) {
                    const newConfigs = { ...formik.values.deliveryTypeConfigs };
                    delete newConfigs[typeObj.value];
                    formik.setFieldValue('deliveryTypeConfigs', newConfigs);
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
      
      {formik.touched.deliveryTypes && formik.errors.deliveryTypes && (
        <div className="text-red-500 text-sm mt-1">{formik.errors.deliveryTypes}</div>
      )}

      {formik.values.deliveryTypes.includes('Hybrid') && (
        <div className="mt-4">
          <Label htmlFor="hybridDescription">Hybrid Program Description *</Label>
          <Textarea
            id="hybridDescription"
            placeholder="Please describe how your hybrid program is delivered"
            {...formik.getFieldProps('hybridDescription')}
            value={formik.values.hybridDescription || ''}
          />
          {formik.touched.hybridDescription && formik.errors.hybridDescription && (
            <div className="text-red-500 text-sm mt-1">{formik.errors.hybridDescription}</div>
          )}
        </div>
      )}
    </div>
  );
};