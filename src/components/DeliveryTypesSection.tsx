import React, { useCallback, useMemo } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

export type DeliveryType = "F2F Group" | "Telehealth" | "1:1" | "Hybrid";

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
}

const DeliveryTypeSection: React.FC<DeliveryTypeSectionProps> = React.memo(
  ({ type }) => {
    const {
      control,
      watch,
      setValue,
      formState: { errors },
      trigger,
    } = useFormContext<FormDataWithDelivery>();

    const deliveryTypeConfigs = watch("deliveryTypeConfigs");
    const config: DeliveryTypeConfig = deliveryTypeConfigs[type] || {
      duration: "",
      frequency: "",
      customDuration: "",
      customFrequency: "",
      description: "",
      schedule: {},
    };

    const typeDisplayNames = useMemo(
      () => ({
        "F2F Group": "Face to face group program",
        Telehealth: "Telehealth program (via phone/internet)",
        "1:1": "Individual program",
        Hybrid:
          "Hybrid program (including face to face/individual and telehealth delivery)",
      }),
      [],
    );

    const programLengthOptions = useMemo(
      () => [
        { value: "1 week", label: "1 week" },
        { value: "2 weeks", label: "2 weeks" },
        { value: "3 weeks", label: "3 weeks" },
        { value: "4 weeks", label: "4 weeks" },
        { value: "5 weeks", label: "5 weeks" },
        { value: "6 weeks", label: "6 weeks" },
        { value: "7 weeks", label: "7 weeks" },
        { value: "8 weeks", label: "8 weeks" },
        { value: "Other", label: "Other" },
      ],
      [],
    );

    const daysOfWeek = useMemo(
      () => [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      [],
    );

    const hourOptions = useMemo(
      () => ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
      [],
    );

    const minuteOptions = useMemo(() => ["00", "15", "30", "45"], []);
    const amPmOptions = useMemo(() => ["AM", "PM"], []);

    const getDescriptionPlaceholder = useCallback(() => {
      switch (type) {
        case "F2F Group":
          return "Please describe how your face to face group program is delivered";
        case "Telehealth":
          return "Please describe how your telehealth program is delivered";
        case "1:1":
          return "Please describe how your individual program is delivered";
        case "Hybrid":
          return "Please describe how your hybrid program is delivered";
        default:
          return "Please describe how your program is delivered";
      }
    }, [type]);

    const updateConfig = useCallback(
      (updates: Partial<DeliveryTypeConfig>) => {
        setValue(`deliveryTypeConfigs.${type}`, { ...config, ...updates });
        trigger("deliveryTypeConfigs");
      },
      [config, setValue, type, trigger],
    );

    const handleDurationChange = useCallback(
      (value: string) => {
        updateConfig({
          duration: value,
          customDuration: value !== "Other" ? "" : config.customDuration,
        });
      },
      [config.customDuration, updateConfig],
    );

    const handleCustomDurationChange = useCallback(
      (value: string) => {
        updateConfig({ customDuration: value });
      },
      [updateConfig],
    );

    const handleDayToggle = useCallback(
      (day: string, checked: boolean) => {
        const newSchedule = { ...config.schedule };

        if (checked) {
          newSchedule[day] = {
            startHour: "9",
            startMinute: "00",
            startAmPm: "AM",
            endHour: "10",
            endMinute: "00",
            endAmPm: "AM",
          };
        } else {
          delete newSchedule[day];
        }

        updateConfig({ schedule: newSchedule });
      },
      [config.schedule, updateConfig],
    );

    const handleTimeChange = useCallback(
      (day: string, timeType: keyof DaySchedule, value: string) => {
        const newSchedule = { ...config.schedule };
        if (newSchedule[day]) {
          newSchedule[day] = { ...newSchedule[day], [timeType]: value };
          updateConfig({ schedule: newSchedule });
        }
      },
      [config.schedule, updateConfig],
    );

    const handleDescriptionChange = useCallback(
      (value: string) => {
        const fieldMap = {
          Hybrid: "hybridDescription",
          "F2F Group": "f2fDescription",
          Telehealth: "telehealthDescription",
          "1:1": "individualDescription",
        };

        const fieldName = fieldMap[type];
        if (fieldName) {
          setValue(fieldName as any, value);
          trigger(fieldName as any);
        }
      },
      [type, setValue, trigger],
    );

    const getDescriptionFieldName = useCallback(() => {
      const fieldMap = {
        Hybrid: "hybridDescription",
        "F2F Group": "f2fDescription",
        Telehealth: "telehealthDescription",
        "1:1": "individualDescription",
      };
      return fieldMap[type];
    }, [type]);

    const hasConfigError = () => {
      return (
        errors.deliveryTypeConfigs &&
        typeof errors.deliveryTypeConfigs === "string"
      );
    };

    const getConfigErrorMessage = () => {
      if (typeof errors.deliveryTypeConfigs === "string") {
        if (!config.schedule || Object.keys(config.schedule).length === 0) {
          return `Please select at least one day for ${type}`;
        }
        return errors.deliveryTypeConfigs;
      }
      return null;
    };

    const descriptionFieldName = getDescriptionFieldName();
    const descriptionValue = watch(descriptionFieldName as any);
    const descriptionError =
      errors[descriptionFieldName as keyof typeof errors];

    return (
      <div className="ml-8 space-y-4 mt-2">
        {/* Program Length */}
        <div>
          <Label htmlFor={`${type}-duration`}>Program Length *</Label>
          <Select value={config.duration} onValueChange={handleDurationChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select program length" />
            </SelectTrigger>
            <SelectContent>
              {programLengthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!config.duration && hasConfigError() && (
            <div className="text-red-500 text-sm mt-1">
              Program length is required
            </div>
          )}

          {config.duration === "Other" && (
            <div className="mt-2">
              <Input
                id={`${type}-customDuration`}
                placeholder="Specify custom program length"
                value={config.customDuration || ""}
                onChange={(e) => handleCustomDurationChange(e.target.value)}
              />
              {config.duration === "Other" &&
                !config.customDuration &&
                hasConfigError() && (
                  <div className="text-red-500 text-sm mt-1">
                    Custom program length is required
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Day and Time */}
        <div className="space-y-4">
          <Label>Day and Time *</Label>

          <div className="space-y-4">
            {daysOfWeek.map((day) => {
              const isDaySelected = Boolean(
                config.schedule && config.schedule[day],
              );
              const daySchedule = config.schedule?.[day] || {
                startHour: "9",
                startMinute: "00",
                startAmPm: "AM",
                endHour: "10",
                endMinute: "00",
                endAmPm: "AM",
              };

              return (
                <div key={day} className="border-b pb-4 mb-2 last:border-b-0">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${type}-day-${day}`}
                      checked={isDaySelected}
                      onCheckedChange={(checked) =>
                        handleDayToggle(day, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`${type}-day-${day}`}
                      className="font-medium"
                    >
                      {day}
                    </Label>
                  </div>

                  {isDaySelected && (
                    <div className="mt-2 ml-6 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Start Time */}
                        <div>
                          <Label className="text-sm font-normal">
                            Time (from)
                          </Label>
                          <div className="flex items-center space-x-2 mt-1">
                            <Select
                              value={daySchedule.startHour}
                              onValueChange={(value) =>
                                handleTimeChange(day, "startHour", value)
                              }
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue placeholder="Hour" />
                              </SelectTrigger>
                              <SelectContent>
                                {hourOptions.map((hour) => (
                                  <SelectItem key={hour} value={hour}>
                                    {hour}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <span>:</span>

                            <Select
                              value={daySchedule.startMinute}
                              onValueChange={(value) =>
                                handleTimeChange(day, "startMinute", value)
                              }
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue placeholder="Min" />
                              </SelectTrigger>
                              <SelectContent>
                                {minuteOptions.map((minute) => (
                                  <SelectItem key={minute} value={minute}>
                                    {minute}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={daySchedule.startAmPm}
                              onValueChange={(value) =>
                                handleTimeChange(day, "startAmPm", value)
                              }
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue placeholder="AM/PM" />
                              </SelectTrigger>
                              <SelectContent>
                                {amPmOptions.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* End Time */}
                        <div>
                          <Label className="text-sm font-normal">
                            Time (to)
                          </Label>
                          <div className="flex items-center space-x-2 mt-1">
                            <Select
                              value={daySchedule.endHour}
                              onValueChange={(value) =>
                                handleTimeChange(day, "endHour", value)
                              }
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue placeholder="Hour" />
                              </SelectTrigger>
                              <SelectContent>
                                {hourOptions.map((hour) => (
                                  <SelectItem key={hour} value={hour}>
                                    {hour}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <span>:</span>

                            <Select
                              value={daySchedule.endMinute}
                              onValueChange={(value) =>
                                handleTimeChange(day, "endMinute", value)
                              }
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue placeholder="Min" />
                              </SelectTrigger>
                              <SelectContent>
                                {minuteOptions.map((minute) => (
                                  <SelectItem key={minute} value={minute}>
                                    {minute}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={daySchedule.endAmPm}
                              onValueChange={(value) =>
                                handleTimeChange(day, "endAmPm", value)
                              }
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue placeholder="AM/PM" />
                              </SelectTrigger>
                              <SelectContent>
                                {amPmOptions.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
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

          {(!config.schedule ||
            Object.keys(config.schedule || {}).length === 0) &&
            hasConfigError() && (
              <div className="text-red-500 text-sm mt-1">
                Please select at least one day for {type}
              </div>
            )}
        </div>

        {/* Description */}
        <div>
          <Label htmlFor={`${type}-description`}>
            {typeDisplayNames[type]} Description *
          </Label>
          <Textarea
            id={`${type}-description`}
            placeholder={getDescriptionPlaceholder()}
            value={descriptionValue || ""}
            onChange={(e) => handleDescriptionChange(e.target.value)}
          />
          {descriptionError && (
            <div className="text-red-500 text-sm mt-1">
              {descriptionError.message ||
                `${typeDisplayNames[type]} description is required`}
            </div>
          )}
        </div>
      </div>
    );
  },
);

DeliveryTypeSection.displayName = "DeliveryTypeSection";

export const DeliveryTypesSection: React.FC = React.memo(() => {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useFormContext<FormDataWithDelivery>();

  const deliveryTypes = useMemo(
    () => [
      {
        value: "F2F Group" as DeliveryType,
        label: "Face to face group program",
      },
      {
        value: "Telehealth" as DeliveryType,
        label: "Telehealth program (via phone/internet)",
      },
      { value: "1:1" as DeliveryType, label: "Individual program" },
      {
        value: "Hybrid" as DeliveryType,
        label:
          "Hybrid program (including face to face/individual and telehealth delivery)",
      },
    ],
    [],
  );

  const selectedDeliveryTypes = watch("deliveryTypes") || [];
  const deliveryTypeConfigs = watch("deliveryTypeConfigs");

  const handleDeliveryTypeToggle = useCallback(
    (typeValue: DeliveryType, checked: boolean) => {
      const currentTypes = selectedDeliveryTypes as DeliveryType[];
      const newTypes = checked
        ? [...currentTypes, typeValue]
        : currentTypes.filter((t) => t !== typeValue);

      setValue("deliveryTypes", newTypes);

      if (!checked) {
        // Remove config for unchecked type
        const newConfigs = { ...deliveryTypeConfigs };
        delete newConfigs[typeValue];
        setValue("deliveryTypeConfigs", newConfigs);

        // Clear corresponding description
        const descriptionFields = {
          Hybrid: "hybridDescription",
          "F2F Group": "f2fDescription",
          Telehealth: "telehealthDescription",
          "1:1": "individualDescription",
        };

        const fieldName = descriptionFields[typeValue];
        if (fieldName) {
          setValue(fieldName as any, "");
        }
      } else {
        // Add default config for checked type
        setValue(`deliveryTypeConfigs.${typeValue}`, {
          duration: "",
          frequency: "scheduled",
          schedule: {},
        });
      }

      trigger("deliveryTypes");
    },
    [selectedDeliveryTypes, deliveryTypeConfigs, setValue, trigger],
  );

  return (
    <div>
      <Label>Program delivery information: *</Label>
      <div className="space-y-4">
        {deliveryTypes.map((typeObj) => (
          <div key={typeObj.value} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={typeObj.value}
                checked={(selectedDeliveryTypes as DeliveryType[]).includes(
                  typeObj.value,
                )}
                onCheckedChange={(checked) =>
                  handleDeliveryTypeToggle(typeObj.value, checked as boolean)
                }
              />
              <Label htmlFor={typeObj.value}>{typeObj.label}</Label>
            </div>

            {(selectedDeliveryTypes as DeliveryType[]).includes(
              typeObj.value,
            ) && <DeliveryTypeSection type={typeObj.value} />}
          </div>
        ))}
      </div>

      {errors.deliveryTypes && (
        <div className="text-red-500 text-sm mt-1">
          {errors.deliveryTypes.message}
        </div>
      )}
    </div>
  );
});

DeliveryTypesSection.displayName = "DeliveryTypesSection";
