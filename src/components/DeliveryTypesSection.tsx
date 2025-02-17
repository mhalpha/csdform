// DeliveryTypesSection.tsx
import React from 'react';
import { FormikProps } from 'formik';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

export type DeliveryType = 'F2F Group' | 'Telehealth' | '1:1' | 'Hybrid';

export interface DeliveryTypeConfig {
  duration: string;
  customDuration?: string;
  frequency: 'Weekly' | 'Twice Weekly' | 'Other';
  customFrequency?: string;
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
    frequency: 'Weekly',
    customDuration: '',
    customFrequency: ''
  };
  
  return (
    <div className="ml-8 space-y-4 mt-2">
      <div>
        <Label htmlFor={`${type}-duration`}>{type} Program Duration *</Label>
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
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1 week">1 week</SelectItem>
            <SelectItem value="2 weeks">2 weeks</SelectItem>
            <SelectItem value="6 weeks">6 weeks</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>

        {config.duration === 'Other' && (
          <div className="mt-2">
            <Input
              id={`${type}-customDuration`}
              placeholder="Specify custom duration"
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

      <div>
        <Label>{type} Program Frequency *</Label>
        <RadioGroup
          value={config.frequency}
          onValueChange={(value: 'Weekly' | 'Twice Weekly' | 'Other') => {
            formik.setFieldValue(`deliveryTypeConfigs.${type}`, {
              ...config,
              frequency: value,
              customFrequency: value !== 'Other' ? '' : config.customFrequency
            });
          }}
        >
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Weekly" id={`${type}-frequencyWeekly`} />
              <Label htmlFor={`${type}-frequencyWeekly`}>Weekly</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Twice Weekly" id={`${type}-frequencyTwice`} />
              <Label htmlFor={`${type}-frequencyTwice`}>Twice Weekly</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Other" id={`${type}-frequencyOther`} />
              <Label htmlFor={`${type}-frequencyOther`}>Other</Label>
            </div>
          </div>
        </RadioGroup>

        {config.frequency === 'Other' && (
          <div className="mt-2">
            <Input
              id={`${type}-customFrequency`}
              placeholder="Specify custom frequency"
              value={config.customFrequency || ''}
              onChange={(e) => {
                formik.setFieldValue(`deliveryTypeConfigs.${type}`, {
                  ...config,
                  customFrequency: e.target.value
                });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const DeliveryTypesSection: React.FC<{ formik: FormikProps<FormDataWithDelivery> }> = ({ formik }) => {
  const deliveryTypes: DeliveryType[] = ['F2F Group', 'Telehealth', '1:1', 'Hybrid'];

  return (
    <div>
      <Label>Type of Delivery *</Label>
      <div className="space-y-4">
        {deliveryTypes.map((type) => (
          <div key={type} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={type}
                checked={formik.values.deliveryTypes.includes(type)}
                onCheckedChange={(checked) => {
                  const currentTypes = formik.values.deliveryTypes;
                  const newTypes = checked 
                    ? [...currentTypes, type]
                    : currentTypes.filter((t) => t !== type);
                  formik.setFieldValue('deliveryTypes', newTypes);
                  
                  // Handle config cleanup
                  if (!checked) {
                    const newConfigs = { ...formik.values.deliveryTypeConfigs };
                    delete newConfigs[type];
                    formik.setFieldValue('deliveryTypeConfigs', newConfigs);
                  } else {
                    // Initialize config when checkbox is checked
                    formik.setFieldValue(`deliveryTypeConfigs.${type}`, {
                      duration: '',
                      frequency: 'Weekly',
                      customDuration: '',
                      customFrequency: ''
                    });
                  }
                }}
              />
              <Label htmlFor={type}>{type}</Label>
            </div>
            
            {formik.values.deliveryTypes.includes(type) && (
              <DeliveryTypeSection type={type} formik={formik} />
            )}
          </div>
        ))}
      </div>
      
      {formik.touched.deliveryTypes && formik.errors.deliveryTypes && (
        <div className="text-red-500 text-sm mt-1">{formik.errors.deliveryTypes}</div>
      )}

      {formik.values.deliveryTypes.includes('Hybrid') && (
        <div className="mt-4">
          <Label htmlFor="hybridDescription">Hybrid Description *</Label>
          <Textarea
            id="hybridDescription"
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