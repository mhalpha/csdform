// DeliveryTypesSection.tsx
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
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
  methods: any;
}

const DeliveryTypeSection: React.FC<DeliveryTypeSectionProps> = ({ type, methods }) => {
  const { control, watch, setValue, formState: { errors }, trigger } = methods;
  
  const deliveryTypeConfigs = watch('deliveryTypeConfigs') || {};
  const config: DeliveryTypeConfig = deliveryTypeConfigs[type] || {
    duration: '',
    frequency: '',
    customDuration: '',
    customFrequency: '',
    description: '',
    schedule: {}
  };

  const typeDisplayNames = {
    'F2F Group': 'Face to face group program',
    'Telehealth': 'Telehealth program (via phone/internet)',
    '1:1': 'Individual program',
    'Hybrid': 'Hybrid program (including face to face/individual and telehealth delivery)'
  };

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

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  const hourOptions = [
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
  ];

  const minuteOptions = [
    '00', '15', '30', '45'
  ];

  const amPmOptions = ['AM', 'PM'];

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

  const updateConfig = (updates: Partial<DeliveryTypeConfig>) => {
    const newConfigs = {
      ...deliveryTypeConfigs,
      [type]: {
        ...config,
        ...updates
      }
    };
    setValue('deliveryTypeConfigs', newConfigs);
    trigger('deliveryTypeConfigs');
  };

  const hasConfigError = () => {
    return errors.deliveryTypeConfigs && 
           typeof errors.deliveryTypeConfigs === 'string';
  };

  const getConfigErrorMessage = () => {
    if (typeof errors.deliveryTypeConfigs === 'string') {
      if ((errors.deliveryTypeConfigs as string).includes(type)) {
        return errors.deliveryTypeConfigs;
      }
      if (!config.schedule || Object.keys(config.schedule).length === 0) {
        return `Please select at least one day for ${type}`;
      }
      return errors.deliveryTypeConfigs;
    }
    return null;
  };

  return (
    <div className="ml-8 space-y-4 mt-2">
      <div>
        <Label htmlFor={`${type}-duration`}>Program Length *</Label>
        <Select
          value={config.duration}
          onValueChange={(value: string) => {
            updateConfig({
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
                updateConfig({
                  customDuration: e.target.value
                });
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
                    onCheckedChange={(checked: boolean | 'indeterminate') => {
                      const newSchedule = { ...config.schedule };
                      
                      if (checked) {
                        newSchedule[day] = {
                          startHour: '9',
                          startMinute: '00',
                          startAmPm: 'AM',
                          endHour: '10',
                          endMinute: '00',
                          endAmPm: 'AM'
                        };
                      } else {
                        if (newSchedule[day]) {
                          delete newSchedule[day];
                        }
                      }
                      
                      updateConfig({ schedule: newSchedule });
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
                            onValueChange={(value: string) => {
                              const newSchedule = { ...config.schedule };
                              newSchedule[day] = {
                                ...daySchedule,
                                startHour: value
                              };
                              updateConfig({ schedule: newSchedule });
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
                            onValueChange={(value: string) => {
                              const newSchedule = { ...config.schedule };
                              newSchedule[day] = {
                                ...daySchedule,
                                startMinute: value
                              };
                              updateConfig({ schedule: newSchedule });
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
                            onValueChange={(value: string) => {
                              const newSchedule = { ...config.schedule };
                              newSchedule[day] = {
                                ...daySchedule,
                                startAmPm: value
                              };
                              updateConfig({ schedule: newSchedule });
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
                            onValueChange={(value: string) => {
                              const newSchedule = { ...config.schedule };
                              newSchedule[day] = {
                                ...daySchedule,
                                endHour: value
                              };
                              updateConfig({ schedule: newSchedule });
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
                            onValueChange={(value: string) => {
                              const newSchedule = { ...config.schedule };
                              newSchedule[day] = {
                                ...daySchedule,
                                endMinute: value
                              };
                              updateConfig({ schedule: newSchedule });
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
                            onValueChange={(value: string) => {
                              const newSchedule = { ...config.schedule };
                              newSchedule[day] = {
                                ...daySchedule,
                                endAmPm: value
                              };
                              updateConfig({ schedule: newSchedule });
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
        
        {(!config.schedule || Object.keys(config.schedule || {}).length === 0) && 
         hasConfigError() && (
          <div className="text-red-500 text-sm mt-1">
            Please select at least one day for {type}
          </div>
        )}
      </div>

      <div>
        <Label htmlFor={`${type}-description`}>{typeDisplayNames[type]} Description *</Label>
        <Controller
          name={
            type === 'Hybrid' 
              ? 'hybridDescription' 
              : type === 'F2F Group'
                ? 'f2fDescription'
                : type === 'Telehealth'
                  ? 'telehealthDescription'
                  : 'individualDescription'
          }
          control={control}
          render={({ field }) => (
            <Textarea
              id={`${type}-description`}
              placeholder={getDescriptionPlaceholder()}
              {...field}
              value={field.value || ''}
            />
          )}
        />
        {type === 'Hybrid' && errors.hybridDescription && (
          <div className="text-red-500 text-sm mt-1">{errors.hybridDescription.message}</div>
        )}
        {type === 'F2F Group' && errors.f2fDescription && (
          <div className="text-red-500 text-sm mt-1">{errors.f2fDescription.message}</div>
        )}
        {type === 'Telehealth' && errors.telehealthDescription && (
          <div className="text-red-500 text-sm mt-1">{errors.telehealthDescription.message}</div>
        )}
        {type === '1:1' && errors.individualDescription && (
          <div className="text-red-500 text-sm mt-1">{errors.individualDescription.message}</div>
        )}
      </div>
    </div>
  );
};

export const DeliveryTypesSection: React.FC<{ methods: any }> = ({ methods }) => {
  const { control, watch, setValue, formState: { errors }, trigger } = methods;
  
  const deliveryTypes = watch('deliveryTypes') || [];
  
  const deliveryTypeOptions: { value: DeliveryType, label: string }[] = [
    { value: 'F2F Group', label: 'Face to face group program' },
    { value: 'Telehealth', label: 'Telehealth program (via phone/internet)' },
    { value: '1:1', label: 'Individual program' },
    { value: 'Hybrid', label: 'Hybrid program (including face to face/individual and telehealth delivery)' }
  ];

  const handleDeliveryTypeChange = (typeValue: DeliveryType, checked: boolean) => {
    const currentTypes = deliveryTypes;
    const newTypes = checked 
      ? [...currentTypes, typeValue]
      : currentTypes.filter((t: DeliveryType) => t !== typeValue);
    
    setValue('deliveryTypes', newTypes);
    trigger('deliveryTypes');
    
    if (!checked) {
      const currentConfigs = watch('deliveryTypeConfigs') || {};
      const newConfigs = { ...currentConfigs };
      delete newConfigs[typeValue];
      setValue('deliveryTypeConfigs', newConfigs);
      
      if (typeValue === 'Hybrid') {
        setValue('hybridDescription', '');
      } else if (typeValue === 'F2F Group') {
        setValue('f2fDescription', '');
      } else if (typeValue === 'Telehealth') {
        setValue('telehealthDescription', '');
      } else if (typeValue === '1:1') {
        setValue('individualDescription', '');
      }
    } else {
      const currentConfigs = watch('deliveryTypeConfigs') || {};
      setValue('deliveryTypeConfigs', {
        ...currentConfigs,
        [typeValue]: {
          duration: '',
          frequency: 'scheduled',
          schedule: {}
        }
      });
    }
  };

  return (
    <div>
      <Label>Program delivery information: *</Label>
      <div className="space-y-4">
        {deliveryTypeOptions.map((typeObj) => (
          <div key={typeObj.value} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={typeObj.value}
                checked={deliveryTypes.includes(typeObj.value)}
                onCheckedChange={(checked) => handleDeliveryTypeChange(typeObj.value, checked as boolean)}
              />
              <Label htmlFor={typeObj.value}>{typeObj.label}</Label>
            </div>
            
            {deliveryTypes.includes(typeObj.value) && (
              <DeliveryTypeSection type={typeObj.value} methods={methods} />
            )}
          </div>
        ))}
      </div>
      
      {errors.deliveryTypes && (
        <div className="text-red-500 text-sm mt-1">{errors.deliveryTypes.message}</div>
      )}
    </div>
  );
};