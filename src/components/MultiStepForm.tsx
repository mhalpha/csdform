"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  useForm,
  FormProvider,
  useFormContext,
  Controller,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLoadScript } from "@react-google-maps/api";
import { Library as GoogleMapsLibrary } from "@googlemaps/js-api-loader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileText,
  AlertCircle,
  ExternalLink,
  Download,
} from "lucide-react";
import axios from "axios";
import { useParams } from "next/navigation";

// Types
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
  schedule?: Record<string, DaySchedule>;
}

export interface EnrollmentOptions {
  selfReferral: boolean;
  gpReferral: boolean;
  hospitalReferral: boolean;
  other: boolean;
  otherSpecify: string;
  notAcceptingReferrals: boolean;
}

export interface AttendanceOptions {
  coronaryHeartDisease: boolean;
  heartFailure: boolean;
  heartRhythmProblems: boolean;
  deviceInsertion: boolean;
  other: boolean;
  otherSpecify: string;
}

export interface ProgramServices {
  exerciseOnly: boolean;
  educationOnly: boolean;
  exerciseAndEducation: boolean;
  other: boolean;
  otherSpecify: string;
}

export interface Certification {
  providerCertification: boolean;
}

// Enhanced caching
const serviceNameValidationCache = new Map<
  string,
  { result: boolean; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (website: string, originalWebsite?: string) => {
  const normalizedWebsite = website.toLowerCase().trim();
  const normalizedOriginal = originalWebsite?.toLowerCase().trim() || "new";
  return `${normalizedWebsite}|${normalizedOriginal}`;
};

const formatWebsite = (serviceName: string): string => {
  if (!serviceName) return "";

  const normalized = serviceName.replace(/\s+/g, " ").trim();

  return normalized
    .replace(/\s+/g, "-")
    .replace(/[\/\\?%*:|"<>]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
};

// Optimized debounced validation
const checkServiceNameExistsDebounced = (() => {
  let timeoutId: NodeJS.Timeout | null = null;
  let abortController: AbortController | null = null;

  return (website: string, currentWebsite?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (abortController) abortController.abort();

      const normalizedWebsite = website.toLowerCase().trim();
      const normalizedCurrent = currentWebsite?.toLowerCase().trim();
      const cacheKey = getCacheKey(normalizedWebsite, normalizedCurrent);

      const cached = serviceNameValidationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        resolve(cached.result);
        return;
      }

      if (normalizedCurrent && normalizedWebsite === normalizedCurrent) {
        const result = { result: false, timestamp: Date.now() };
        serviceNameValidationCache.set(cacheKey, result);
        resolve(false);
        return;
      }

      if (!normalizedWebsite) {
        resolve(false);
        return;
      }

      timeoutId = setTimeout(async () => {
        try {
          abortController = new AbortController();
          const encodedWebsite = encodeURIComponent(normalizedWebsite);
          await axios.get(`/api/1241029013026-service/${encodedWebsite}`, {
            signal: abortController.signal,
          });

          const result = { result: true, timestamp: Date.now() };
          serviceNameValidationCache.set(cacheKey, result);
          resolve(true);
        } catch (error: any) {
          if (error.name === "AbortError") return;

          const result = {
            result: error.response?.status !== 404,
            timestamp: Date.now(),
          };
          serviceNameValidationCache.set(cacheKey, result);
          resolve(result.result);
        }
      }, 300);
    });
  };
})();

const GOOGLE_MAPS_API_KEY = "AIzaSyAm-eP8b7-FH2A8nzYucTG9NcPTz0OiAX0";
const LIBRARIES: GoogleMapsLibrary[] = ["places"];

// Zod Schemas
const step1Schema = z.object({
  serviceName: z
    .string()
    .min(1, "Service name is required")
    .refine(
      (val) => !val.includes("/"),
      "Service name cannot contain forward slashes (/)",
    ),
  originalWebsite: z.string().optional(),
  primaryCoordinator: z.string().min(1, "Primary coordinator is required"),
  streetAddress: z.string().min(1, "Street address is required"),
  directions: z.string().optional(),
  phone: z
    .string()
    .regex(/^\d+$/, "Phone number must contain only numbers")
    .min(1, "Phone is required"),
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  fax: z
    .string()
    .regex(/^\d*$/, "Fax number must contain only numbers")
    .optional(),
  programType: z.enum(["Public", "Private"], {
 message: "Program type is required",
}),
  certification: z.object({
    providerCertification: z.boolean(),
  }),
  providerCertificationFile: z.any().optional(),
  providerCertificationSubmitted: z.boolean().optional(),
  certificateFileUrl: z.string().optional(),
  silentListing: z.boolean(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  website: z.string().optional(),
});

const step2Schema = z.object({
  programTypes: z
    .array(
      z.enum([
        "Cardiac Rehabilitation Program",
        "Heart Failure Program",
        "Cardiac Rehabilitation & Heart Failure Program",
      ]),
    )
    .min(1, "Please select at least one program type"),
  description: z.string().min(1, "Description is required"),
  attendanceOptions: z
    .object({
      coronaryHeartDisease: z.boolean(),
      heartFailure: z.boolean(),
      heartRhythmProblems: z.boolean(),
      deviceInsertion: z.boolean(),
      other: z.boolean(),
      otherSpecify: z.string(),
    })
    .refine(
      (data) => {
        if (data.other && !data.otherSpecify) {
          return false;
        }
        return (
          data.coronaryHeartDisease ||
          data.heartFailure ||
          data.heartRhythmProblems ||
          data.deviceInsertion ||
          data.other
        );
      },
      {
        message:
          'Please select at least one attendance option and specify if "other" is selected',
        path: ["coronaryHeartDisease"],
      },
    ),
  programServices: z
    .object({
      exerciseOnly: z.boolean(),
      educationOnly: z.boolean(),
      exerciseAndEducation: z.boolean(),
      other: z.boolean(),
      otherSpecify: z.string(),
    })
    .refine(
      (data) => {
        if (data.other && !data.otherSpecify) {
          return false;
        }
        return (
          data.exerciseOnly ||
          data.educationOnly ||
          data.exerciseAndEducation ||
          data.other
        );
      },
      {
        message:
          'Please select at least one service type and specify if "other" is selected',
        path: ["exerciseOnly"],
      },
    ),
  exercise: z.string().optional(),
  education: z.string().optional(),
  deliveryTypes: z
    .array(z.enum(["F2F Group", "Telehealth", "1:1", "Hybrid"]))
    .min(1, "At least one delivery type is required"),
  hybridDescription: z.string().optional(),
  f2fDescription: z.string().optional(),
  telehealthDescription: z.string().optional(),
  individualDescription: z.string().optional(),
  enrollment: z.string().min(1, "Enrolment information is required"),
  enrollmentOptions: z
    .object({
      selfReferral: z.boolean(),
      gpReferral: z.boolean(),
      hospitalReferral: z.boolean(),
      other: z.boolean(),
      otherSpecify: z.string(),
      notAcceptingReferrals: z.boolean(),
    })
    .refine(
      (data) => {
        if (data.other && !data.otherSpecify) {
          return false;
        }
        if (data.notAcceptingReferrals) return true;
        return (
          data.selfReferral ||
          data.gpReferral ||
          data.hospitalReferral ||
          data.other
        );
      },
      {
        message:
          'Please select at least one enrolment option and specify if "other" is selected',
        path: ["selfReferral"],
      },
    ),
 interpreterAvailable: z.enum(["Yes", "No"], {
 message: "Please specify interpreter availability",
}),
  deliveryTypeConfigs: z.record(z.any()).optional(),
  specialConditionsSupport: z.string().optional(),
  privacyStatement: z.string().min(1, "You must accept the privacy statement"),
  privacyPolicyAccepted: z
    .boolean()
    .refine((val) => val === true, "You must accept the privacy policy"),
});

const combinedSchema = step1Schema.merge(step2Schema);

type FormData = z.infer<typeof combinedSchema>;

const defaultValues: FormData = {
  serviceName: "",
  originalWebsite: "",
  primaryCoordinator: "",
  streetAddress: "",
  directions: "",
  phone: "",
  email: "",
  fax: "",
  programType: "Public",
  certification: {
    providerCertification: false,
  },
  providerCertificationFile: null,
  providerCertificationSubmitted: false,
  certificateFileUrl: "",
  silentListing: false,
  programTypes: [],
  description: "",
  attendanceOptions: {
    coronaryHeartDisease: false,
    heartFailure: false,
    heartRhythmProblems: false,
    deviceInsertion: false,
    other: false,
    otherSpecify: "",
  },
  programServices: {
    exerciseOnly: false,
    educationOnly: false,
    exerciseAndEducation: false,
    other: false,
    otherSpecify: "",
  },
  exercise: "",
  education: "",
  deliveryTypes: [],
  hybridDescription: "",
  f2fDescription: "",
  telehealthDescription: "",
  individualDescription: "",
  enrollmentOptions: {
    selfReferral: false,
    gpReferral: false,
    hospitalReferral: false,
    other: false,
    otherSpecify: "",
    notAcceptingReferrals: false,
  },
  deliveryTypeConfigs: {},
  interpreterAvailable: "No",
  specialConditionsSupport: "",
  website: "",
  enrollment: "",
  privacyPolicyAccepted: false,
  privacyStatement: "",
};

// File Upload Component
const FileUpload: React.FC<{
  file: File | null;
  existingFileUrl?: string;
  onFileSelect: (file: File | null) => void;
  error?: string;
  required?: boolean;
  isEditMode?: boolean;
}> = React.memo(
  ({ file, existingFileUrl, onFileSelect, error, required, isEditMode }) => {
    const handleFileChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0] || null;
        onFileSelect(selectedFile);
      },
      [onFileSelect],
    );

    const getFileName = useCallback((url: string) => {
      return url.split("/").pop() || "certificate-file";
    }, []);

    const handleRemoveFile = useCallback(() => {
      onFileSelect(null);
    }, [onFileSelect]);

    return (
      <div className="space-y-2">
        <Label htmlFor="certificationFile" className="flex items-center gap-2">
          Upload Provider Certification Document {required && "*"}
          <Upload className="w-4 h-4" />
        </Label>

        {isEditMode && existingFileUrl && !file && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">
                    Current Certificate File
                  </p>
                  <p className="text-sm text-blue-700">
                    {getFileName(existingFileUrl)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(existingFileUrl, "_blank")}
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
                    const link = document.createElement("a");
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
                <span className="text-sm text-gray-500">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : (
              <div className="text-gray-500">
                <Upload className="w-8 h-8 mx-auto mb-2" />
                <p>
                  {isEditMode && existingFileUrl
                    ? "Upload new file to replace current certificate"
                    : "Click to upload or drag and drop"}
                </p>
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
            onClick={handleRemoveFile}
            className="mt-2"
          >
            Remove new file
          </Button>
        )}

        {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
      </div>
    );
  },
);

FileUpload.displayName = "FileUpload";

// Step 1 Component
const Step1: React.FC = React.memo(() => {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useFormContext<FormData>();
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const params = useParams();
  const isEditMode = Boolean(params?.website);

  const serviceName = watch("serviceName");
  const originalWebsite = watch("originalWebsite");
  const providerCertification = watch("certification.providerCertification");
  const certificateFileUrl = watch("certificateFileUrl");

  const handleServiceNameChange = useCallback(
    (value: string) => {
      let cleanedValue = value.replace(/\//g, "-");
      if (cleanedValue.startsWith(" ")) {
        cleanedValue = cleanedValue.trimStart();
      }
      cleanedValue = cleanedValue.replace(/ +/g, " ");

      setValue("serviceName", cleanedValue);
      const website = formatWebsite(cleanedValue);
      setValue("website", website);

      const cacheKey = getCacheKey(website, originalWebsite);
      serviceNameValidationCache.delete(cacheKey);

      setTimeout(() => trigger("serviceName"), 500);
    },
    [setValue, trigger, originalWebsite],
  );

  useEffect(() => {
    if (isLoaded && !autocomplete && window.google) {
      const input = document.getElementById(
        "streetAddress",
      ) as HTMLInputElement;
      if (input) {
        const autocompleteInstance = new google.maps.places.Autocomplete(
          input,
          {
            types: ["address"],
            componentRestrictions: { country: "au" },
          },
        );
        setAutocomplete(autocompleteInstance);

        autocompleteInstance.addListener("place_changed", () => {
          const place = autocompleteInstance.getPlace();
          if (place.geometry) {
            const address = place.formatted_address;
            const lat = place.geometry.location?.lat();
            const lng = place.geometry.location?.lng();

            if (address && lat !== undefined && lng !== undefined) {
              setValue("streetAddress", address);
              setValue("lat", lat);
              setValue("lng", lng);
            }
          }
        });
      }
    }
  }, [isLoaded, autocomplete, setValue]);

  if (!isLoaded) return <div>Loading Google Maps...</div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div>
          <Label htmlFor="serviceName">Service name *</Label>
          <div className="text-sm text-muted-foreground opacity-70 -mt-1 mb-1">
            (If you have multiple services with the same name, please include
            location in the service name. Do not use forward slashes (/) in
            service names.)
          </div>
          <Controller
            name="serviceName"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="serviceName"
                onChange={(e) => handleServiceNameChange(e.target.value)}
                onBlur={(e) => {
                  const trimmedValue = e.target.value.trim();
                  setValue("serviceName", trimmedValue);
                  field.onBlur();
                }}
              />
            )}
          />
          {errors.serviceName && (
            <div className="text-red-500 text-sm mt-1">
              {errors.serviceName.message}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="primaryCoordinator">
            Program coordinator name: *
          </Label>
          <Controller
            name="primaryCoordinator"
            control={control}
            render={({ field }) => <Input {...field} id="primaryCoordinator" />}
          />
          {errors.primaryCoordinator && (
            <div className="text-red-500 text-sm mt-1">
              {errors.primaryCoordinator.message}
            </div>
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
            render={({ field }) => <Input {...field} id="streetAddress" />}
          />
          {errors.streetAddress && (
            <div className="text-red-500 text-sm mt-1">
              {errors.streetAddress.message}
            </div>
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
            render={({ field }) => <Textarea {...field} id="directions" />}
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
                  {...field}
                  id="phone"
                  type="tel"
                  onChange={(e) => {
                    let numericValue = e.target.value.replace(/\D/g, "");
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
              <div className="text-red-500 text-sm mt-1">
                {errors.phone.message}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="fax">Fax:</Label>
            <Controller
              name="fax"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="fax"
                  className="mt-5"
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/\D/g, "");
                    field.onChange(numericValue);
                  }}
                />
              )}
            />
            {errors.fax && (
              <div className="text-red-500 text-sm mt-1">
                {errors.fax.message}
              </div>
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
            render={({ field }) => <Input {...field} id="email" type="email" />}
          />
          {errors.email && (
            <div className="text-red-500 text-sm mt-1">
              {errors.email.message}
            </div>
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
            <div className="text-red-500 text-sm mt-1">
              {errors.programType.message}
            </div>
          )}
        </div>

        <div>
          <Label>ACRA/ICCPR certification status:</Label>

          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Important:</strong> All service information will be
              submitted and accessible to end users immediately. Provider
              certification will be reviewed by our team before being verified
              and displayed.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Controller
              name="certification.providerCertification"
              control={control}
              render={({ field }) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="providerCertification"
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      setValue("providerCertificationSubmitted", !!checked);
                      if (!checked) {
                        setValue("providerCertificationFile", null);
                      }
                    }}
                  />
                  <Label htmlFor="providerCertification">
                    I want my service to be ACRA/ICCPR verified (Provider
                    certification)
                  </Label>
                </div>
              )}
            />

            {providerCertification && (
              <div className="ml-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="mb-3">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>To get ACRA/ICCPR verification:</strong>
                  </p>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                    <li>Upload your provider certification document</li>
                    <li>Our team will review and verify your certification</li>
                    <li>
                      Your service will show as "ACRA/ICCPR Verified" once
                      approved
                    </li>
                  </ul>
                </div>

                <Controller
                  name="providerCertificationFile"
                  control={control}
                  render={({ field }) => (
                    <FileUpload
                      file={field.value}
                      existingFileUrl={certificateFileUrl}
                      isEditMode={isEditMode}
                      onFileSelect={field.onChange}
                      error={
                        errors.providerCertificationFile?.message as string
                      }
                      required={true}
                    />
                  )}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

Step1.displayName = "Step1";

// Delivery Types Section
const DeliveryTypesSection: React.FC = React.memo(() => {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useFormContext<FormData>();

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

  const handleDeliveryTypeToggle = useCallback(
    (typeValue: DeliveryType, checked: boolean) => {
      const newTypes = checked
        ? [...selectedDeliveryTypes, typeValue]
        : selectedDeliveryTypes.filter((t) => t !== typeValue);

      setValue("deliveryTypes", newTypes);
      trigger("deliveryTypes");
    },
    [selectedDeliveryTypes, setValue, trigger],
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
                checked={selectedDeliveryTypes.includes(typeObj.value)}
                onCheckedChange={(checked) =>
                  handleDeliveryTypeToggle(typeObj.value, checked as boolean)
                }
              />
              <Label htmlFor={typeObj.value}>{typeObj.label}</Label>
            </div>

            {selectedDeliveryTypes.includes(typeObj.value) && (
              <div className="ml-8 space-y-4 mt-2">
                <div>
                  <Label>Description *</Label>
                  <Controller
                    name={
                      typeObj.value === "Hybrid"
                        ? "hybridDescription"
                        : typeObj.value === "F2F Group"
                          ? "f2fDescription"
                          : typeObj.value === "Telehealth"
                            ? "telehealthDescription"
                            : "individualDescription"
                    }
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder={`Please describe how your ${typeObj.label.toLowerCase()} is delivered`}
                      />
                    )}
                  />
                  {errors[
                    typeObj.value === "Hybrid"
                      ? "hybridDescription"
                      : typeObj.value === "F2F Group"
                        ? "f2fDescription"
                        : typeObj.value === "Telehealth"
                          ? "telehealthDescription"
                          : "individualDescription"
                  ] && (
                    <div className="text-red-500 text-sm mt-1">
                      Description is required for {typeObj.label}
                    </div>
                  )}
                </div>
              </div>
            )}
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

// Privacy Policy Section
const PrivacyPolicySection: React.FC = React.memo(() => {
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<FormData>();

  const privacyStatementText = useMemo(
    () =>
      `Heart Foundation Privacy Statement Accepted: Your Service Information is being collected by the National Heart Foundation of Australia ABN 98 008 419 761 (Heart Foundation, we, us, our) to provide our Cardiac Service Directory and for other purposes as set out in our Privacy Policy. This service information collected will be published directly in the public domain on our Cardiac Services Directory. Heart Foundation does not edit or change the information you provide; however, we may contact you from time to time to request you review and update the details provided. We will also share the published service information you provide us to ACRA - Australian Cardiovascular Health and Rehabilitation Association to support Heart Health advocacy. Contact: servicesdirectory@heartfoundation.org.au or privacy@heartfoundation.org.au or 13 11 12.`,
    [],
  );

  const handlePrivacyAcceptanceChange = useCallback(
    (checked: boolean | "indeterminate") => {
      const isChecked = checked === true;
      setValue("privacyPolicyAccepted", isChecked);
      setValue("privacyStatement", isChecked ? privacyStatementText : "");
    },
    [setValue, privacyStatementText],
  );

  return (
    <div className="space-y-4">
      <div className="border p-4 bg-slate-50 rounded-md">
        <Label className="font-semibold block mb-2">
          Privacy Collection Notice – Services Directory *
        </Label>
        <div className="text-sm space-y-2">
          <p>
            Your Service Information is being collected by the National Heart
            Foundation of Australia ABN 98 008 419 761 (Heart Foundation, we,
            us, our) to provide our{" "}
            <a
              href="https://www.heartfoundation.org.au/your-heart/cardiac-services-directory"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Cardiac Service Directory
            </a>{" "}
            and for other purposes as set out in our{" "}
            <a
              href="https://www.heartfoundation.org.au/hfps13"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Privacy Policy
            </a>
            . This service information collected will be published directly in
            the public domain on our{" "}
            <a
              href="https://www.heartfoundation.org.au/your-heart/cardiac-services-directory"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Cardiac Services Directory
            </a>
            . Heart Foundation does not edit or change the information you
            provide; however, we may contact you from time to time to request
            you review and update the details provided.
          </p>
          <p>
            We will also share the published service information you provide us
            to ACRA - Australian Cardiovascular Health and Rehabilitation
            Association to support Heart Health advocacy.
          </p>
          <p>
            Provide any questions on our Cardiac Service Directory email{" "}
            <a
              href="mailto:servicesdirectory@heartfoundation.org.au"
              className="text-blue-600 hover:underline"
            >
              servicesdirectory@heartfoundation.org.au
            </a>
          </p>
          <p>
            If you have any questions about this privacy collection statement or
            how we handle personal information, please contact our Privacy
            Officer via GPO Box 9966 in your capital city,{" "}
            <a
              href="mailto:privacy@heartfoundation.org.au"
              className="text-blue-600 hover:underline"
            >
              privacy@heartfoundation.org.au
            </a>{" "}
            or by calling 13 11 12.
          </p>
        </div>
      </div>

      <div className="flex items-start space-x-2">
        <Controller
          name="privacyPolicyAccepted"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="privacyPolicyAccepted"
              checked={field.value}
              onCheckedChange={handlePrivacyAcceptanceChange}
            />
          )}
        />
        <Label htmlFor="privacyPolicyAccepted" className="text-sm">
          I have read and accept the Privacy Statement *
        </Label>
      </div>

      {errors.privacyPolicyAccepted && (
        <div className="text-red-500 text-sm">
          {errors.privacyPolicyAccepted.message ||
            "You must accept the privacy policy"}
        </div>
      )}
    </div>
  );
});

PrivacyPolicySection.displayName = "PrivacyPolicySection";

// Step 2 Component
const Step2: React.FC = React.memo(() => {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<FormData>();

  const programTypes = [
    "Cardiac Rehabilitation Program" as const,
    "Heart Failure Program" as const,
    "Cardiac Rehabilitation & Heart Failure Program" as const,
  ];

  const attendanceOptions = [
    {
      key: "coronaryHeartDisease" as const,
      label:
        "Coronary heart disease; angina, heart attack, stent, bypass surgery",
    },
    { key: "heartFailure" as const, label: "Heart Failure or cardiomyopathy" },
    {
      key: "heartRhythmProblems" as const,
      label: "Heart electrical rhythm conditions e.g. Atrial fibrillation",
    },
    {
      key: "deviceInsertion" as const,
      label:
        "People after a device insertion; e.g. Pacemaker, ICD (Implantable Cardioverter Defibrillator)",
    },
  ];

  const programServices = [
    { key: "exerciseOnly" as const, label: "Exercise only program" },
    { key: "educationOnly" as const, label: "Education only program" },
    {
      key: "exerciseAndEducation" as const,
      label: "Exercise and Education included in program",
    },
  ];

  const watchedProgramServices = watch("programServices");
  const watchedEnrollmentOptions = watch("enrollmentOptions");

  const updateEnrollmentString = useCallback(
    (options: EnrollmentOptions) => {
      let enrollmentText = "";

      if (options.notAcceptingReferrals) {
        enrollmentText = "Currently not accepting external referrals.";
      } else {
        const enrollmentMethods = [];

        if (options.selfReferral) enrollmentMethods.push("Self-referral");
        if (options.gpReferral)
          enrollmentMethods.push("General Practitioner (GP) referral");
        if (options.hospitalReferral)
          enrollmentMethods.push("Hospital referral");
        if (options.other && options.otherSpecify)
          enrollmentMethods.push(`Other: ${options.otherSpecify}`);

        enrollmentText = `Enrollment methods: ${enrollmentMethods.join(", ")}`;
      }

      setValue("enrollment", enrollmentText);
    },
    [setValue],
  );

  const handleEnrollmentOptionChange = useCallback(
    (field: keyof EnrollmentOptions, checked: boolean) => {
      if (field === "notAcceptingReferrals" && checked) {
        const newOptions = {
          selfReferral: false,
          gpReferral: false,
          hospitalReferral: false,
          other: false,
          otherSpecify: "",
          notAcceptingReferrals: true,
        };
        setValue("enrollmentOptions", newOptions);
        updateEnrollmentString(newOptions);
        return;
      }

      const newOptions = {
        ...watchedEnrollmentOptions,
        [field]: checked,
      };

      if (field !== "notAcceptingReferrals" && checked) {
        newOptions.notAcceptingReferrals = false;
      }

      if (field === "other" && !checked) {
        newOptions.otherSpecify = "";
      }

      setValue("enrollmentOptions", newOptions);
      updateEnrollmentString(newOptions);
    },
    [watchedEnrollmentOptions, setValue, updateEnrollmentString],
  );

  return (
    <div className="space-y-4">
      <div>
        <Label>Program type: *</Label>
        <div className="space-y-2">
          {programTypes.map((programType) => (
            <Controller
              key={programType}
              name="programTypes"
              control={control}
              render={({ field }) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={programType}
                    checked={field.value.includes(programType)}
                    onCheckedChange={(checked) => {
                      const newTypes = checked
                        ? [...field.value, programType]
                        : field.value.filter((type) => type !== programType);
                      field.onChange(newTypes);
                    }}
                  />
                  <Label htmlFor={programType}>{programType}</Label>
                </div>
              )}
            />
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
              {...field}
              id="description"
              placeholder="Please describe your program and the benefits to heart health; eg. This program is here to support you as you regain confidence and step back into life after a cardiac event."
              className="placeholder:italic placeholder:text-muted-foreground placeholder:opacity-70"
            />
          )}
        />
        {errors.description && (
          <div className="text-red-500 text-sm mt-1">
            {errors.description.message}
          </div>
        )}
      </div>

      <div>
        <Label>Who can attend? *</Label>
        <div className="space-y-2">
          {attendanceOptions.map(({ key, label }) => (
            <Controller
              key={key}
              name={`attendanceOptions.${key}`}
              control={control}
              render={({ field }) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label htmlFor={key}>{label}</Label>
                </div>
              )}
            />
          ))}

          <Controller
            name="attendanceOptions.other"
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attendanceOther"
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (!checked) {
                      setValue("attendanceOptions.otherSpecify", "");
                    }
                  }}
                />
                <Label htmlFor="attendanceOther">Other, please specify.</Label>
              </div>
            )}
          />

          {watch("attendanceOptions.other") && (
            <div className="mt-2">
              <Controller
                name="attendanceOptions.otherSpecify"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    id="attendanceOtherSpecify"
                    placeholder="Please specify other conditions"
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

        {errors.attendanceOptions && (
          <div className="text-red-500 text-sm mt-1">
            {errors.attendanceOptions.message}
          </div>
        )}
      </div>

      <div>
        <Label>What services are offered? *</Label>
        <div className="space-y-2">
          {programServices.map(({ key, label }) => (
            <Controller
              key={key}
              name={`programServices.${key}`}
              control={control}
              render={({ field }) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);

                      if (checked) {
                        if (key === "exerciseOnly") {
                          setValue("programServices.educationOnly", false);
                          setValue(
                            "programServices.exerciseAndEducation",
                            false,
                          );
                        } else if (key === "educationOnly") {
                          setValue("programServices.exerciseOnly", false);
                          setValue(
                            "programServices.exerciseAndEducation",
                            false,
                          );
                        } else if (key === "exerciseAndEducation") {
                          setValue("programServices.exerciseOnly", false);
                          setValue("programServices.educationOnly", false);
                        }
                      }
                    }}
                  />
                  <Label htmlFor={key}>{label}</Label>
                </div>
              )}
            />
          ))}

          <Controller
            name="programServices.other"
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="programServicesOther"
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (!checked) {
                      setValue("programServices.otherSpecify", "");
                    }
                  }}
                />
                <Label htmlFor="programServicesOther">
                  Other services provided, please specify
                </Label>
              </div>
            )}
          />

          {watch("programServices.other") && (
            <div className="mt-2">
              <Controller
                name="programServices.otherSpecify"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    id="programServicesOtherSpecify"
                    placeholder="Please provide more information"
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

        {errors.programServices && (
          <div className="text-red-500 text-sm mt-1">
            {errors.programServices.message}
          </div>
        )}
      </div>

      {(watchedProgramServices.exerciseOnly ||
        watchedProgramServices.exerciseAndEducation) && (
        <div>
          <Label htmlFor="exercise">Exercise Details *</Label>
          <Controller
            name="exercise"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                id="exercise"
                placeholder="Please provide details about the exercise program"
              />
            )}
          />
          {errors.exercise && (
            <div className="text-red-500 text-sm mt-1">
              {errors.exercise.message}
            </div>
          )}
        </div>
      )}

      {(watchedProgramServices.educationOnly ||
        watchedProgramServices.exerciseAndEducation) && (
        <div>
          <Label htmlFor="education">Education Details *</Label>
          <Controller
            name="education"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                id="education"
                placeholder="Please provide details about the education program"
              />
            )}
          />
          {errors.education && (
            <div className="text-red-500 text-sm mt-1">
              {errors.education.message}
            </div>
          )}
        </div>
      )}

      <DeliveryTypesSection />

      {/* Enrollment Section */}
      <div>
        <Label>How Do I Enrol in the Program? *</Label>
        <div className="space-y-2 mt-2">
          <Controller
            name="enrollmentOptions.selfReferral"
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selfReferral"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    handleEnrollmentOptionChange(
                      "selfReferral",
                      checked as boolean,
                    )
                  }
                />
                <Label htmlFor="selfReferral">Self-referral</Label>
              </div>
            )}
          />

          <Controller
            name="enrollmentOptions.gpReferral"
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="gpReferral"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    handleEnrollmentOptionChange(
                      "gpReferral",
                      checked as boolean,
                    )
                  }
                />
                <Label htmlFor="gpReferral">
                  General Practitioner (GP) referral
                </Label>
              </div>
            )}
          />

          <Controller
            name="enrollmentOptions.hospitalReferral"
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hospitalReferral"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    handleEnrollmentOptionChange(
                      "hospitalReferral",
                      checked as boolean,
                    )
                  }
                />
                <Label htmlFor="hospitalReferral">Hospital referral</Label>
              </div>
            )}
          />

          <Controller
            name="enrollmentOptions.other"
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enrollmentOther"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    handleEnrollmentOptionChange("other", checked as boolean)
                  }
                />
                <Label htmlFor="enrollmentOther">Other</Label>
              </div>
            )}
          />

          {watch("enrollmentOptions.other") && (
            <div className="ml-6 mt-2">
              <Controller
                name="enrollmentOptions.otherSpecify"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    id="enrollmentOtherSpecify"
                    placeholder="Please specify other enrollment options"
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      const newOptions = {
                        ...watchedEnrollmentOptions,
                        otherSpecify: e.target.value,
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

          <Controller
            name="enrollmentOptions.notAcceptingReferrals"
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notAcceptingReferrals"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    handleEnrollmentOptionChange(
                      "notAcceptingReferrals",
                      checked as boolean,
                    )
                  }
                />
                <Label
                  htmlFor="notAcceptingReferrals"
                  className="text-amber-700"
                >
                  Currently not accepting external referrals
                  <span className="block text-sm text-muted-foreground opacity-70 mt-1">
                    (This option is available to services that are currently not
                    accepting external referrals. This allows your service to be
                    listed and inform consumers you are unable to take on new
                    referrals)
                  </span>
                </Label>
              </div>
            )}
          />
        </div>

        {errors.enrollmentOptions && (
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
          <div className="text-red-500 text-sm mt-1">
            {errors.interpreterAvailable.message}
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="specialConditionsSupport">More information</Label>
        <Controller
          name="specialConditionsSupport"
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              id="specialConditionsSupport"
              placeholder="If you would like to include any additional information about your service."
              className="placeholder:italic placeholder:text-muted-foreground placeholder:opacity-70"
            />
          )}
        />
      </div>

      <PrivacyPolicySection />
    </div>
  );
});

Step2.displayName = "Step2";

// Success Page Component
const SuccessPage: React.FC<{
  isEditMode: boolean;
  resetForm: () => void;
  hasProviderCertification: boolean;
}> = React.memo(({ isEditMode, resetForm, hasProviderCertification }) => (
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
        {isEditMode
          ? "Service updated successfully!"
          : "Registration submitted successfully!"}
      </h3>
      <p className="text-gray-600">
        {isEditMode
          ? "Your service information has been successfully updated."
          : "Thank you for registering your service. Your service is now live and accessible to users."}
      </p>

      {hasProviderCertification && !isEditMode && (
        <Alert className="border-amber-200 bg-amber-50 text-left max-w-md mx-auto">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Provider Certification:</strong> Your certification document
            has been submitted for review. You'll be contacted once our team has
            verified your provider certification.
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
));

SuccessPage.displayName = "SuccessPage";

// File upload utility function
const uploadToAzureBlob = async (
  file: File,
  serviceName: string,
): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("serviceName", serviceName);

  try {
    const response = await fetch("/api/upload-certificate", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Upload failed");
    }

    const result = await response.json();
    return result.fileUrl;
  } catch (error) {
    console.error("File upload error:", error);
    throw error;
  }
};

// Main Form Component
export const MultiStepForm: React.FC = () => {
  const params = useParams();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isEditMode = Boolean(params?.website);

  const getCurrentSchema = useMemo(() => {
    return step === 0 ? step1Schema : step === 1 ? step2Schema : combinedSchema;
  }, [step]);

  const methods = useForm<FormData>({
    resolver: zodResolver(getCurrentSchema),
    defaultValues,
    mode: "onChange",
    criteriaMode: "firstError",
    shouldFocusError: true,
    shouldUnregister: false,
  });

  const {
    handleSubmit,
    reset,
    watch,
    formState: { isValid },
  } = methods;

  // Load existing data in edit mode
  useEffect(() => {
    const fetchServiceData = async () => {
      if (isEditMode && params?.website) {
        try {
          const decodedWebsite = decodeURIComponent(String(params.website));
          const encodedWebsite = encodeURIComponent(decodedWebsite);

          const response = await axios.get(
            `/api/1241029013026-service/${encodedWebsite}`,
          );

          const normalizedServiceName =
            response.data.serviceName?.replace(/\s+/g, " ").trim() || "";

          const formData = {
            ...defaultValues,
            ...response.data,
            serviceName: normalizedServiceName,
            originalWebsite: response.data.website,
            hybridDescription: response.data.hybridDescription || "",
            f2fDescription: response.data.f2fDescription || "",
            email: response.data.email ? response.data.email.trim() : "",
            telehealthDescription: response.data.telehealthDescription || "",
            individualDescription: response.data.individualDescription || "",
            directions: response.data.directions || "",
            fax: response.data.fax || "",
            specialConditionsSupport:
              response.data.specialConditionsSupport || "",
            exercise: response.data.exercise || "",
            education: response.data.education || "",
            providerCertificationSubmitted:
              response.data.providerCertificationSubmitted || false,
            certificateFileUrl: response.data.certificateFileUrl || "",
            certification: {
              providerCertification:
                response.data.providerCertificationSubmitted || false,
            },
            attendanceOptions: {
              coronaryHeartDisease: Boolean(
                response.data.attendanceOptions?.coronaryHeartDisease,
              ),
              heartFailure: Boolean(
                response.data.attendanceOptions?.heartFailure,
              ),
              heartRhythmProblems: Boolean(
                response.data.attendanceOptions?.heartRhythmProblems,
              ),
              deviceInsertion: Boolean(
                response.data.attendanceOptions?.deviceInsertion,
              ),
              other: Boolean(response.data.attendanceOptions?.other),
              otherSpecify: response.data.attendanceOptions?.otherSpecify || "",
            },
            programServices: {
              exerciseOnly: Boolean(
                response.data.programServices?.exerciseOnly,
              ),
              educationOnly: Boolean(
                response.data.programServices?.educationOnly,
              ),
              exerciseAndEducation: Boolean(
                response.data.programServices?.exerciseAndEducation,
              ),
              other: Boolean(response.data.programServices?.other),
              otherSpecify: response.data.programServices?.otherSpecify || "",
            },
            enrollmentOptions: {
              selfReferral: false,
              gpReferral: false,
              hospitalReferral: false,
              other: false,
              otherSpecify: "",
              notAcceptingReferrals: false,
              ...response.data.enrollmentOptions,
            },
            privacyPolicyAccepted: true,
          };

          reset(formData);
        } catch (error) {
          console.error("Error fetching service data:", error);
        }
      }
      setIsLoading(false);
    };

    fetchServiceData();
  }, [isEditMode, params?.website, reset]);

  // Optimized submit handler
  const onSubmit = useCallback(
    async (values: FormData) => {
      try {
        if (step < 1) {
          setStep(step + 1);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        if (!values.privacyPolicyAccepted) {
          return;
        }

        setIsSubmitting(true);

        const normalizedValues = {
          ...values,
          serviceName: values.serviceName.replace(/\s+/g, " ").trim(),
          website: formatWebsite(values.serviceName),
        };

        let certificateFileUrl = values.certificateFileUrl || "";
        if (
          values.certification.providerCertification &&
          values.providerCertificationFile
        ) {
          try {
            certificateFileUrl = await uploadToAzureBlob(
              values.providerCertificationFile,
              values.serviceName,
            );
          } catch (uploadError) {
            console.error("File upload failed:", uploadError);
            alert("Failed to upload certification file. Please try again.");
            setIsSubmitting(false);
            return;
          }
        }

        const submissionData = {
          ...normalizedValues,
          providerCertificationSubmitted:
            values.certification.providerCertification,
          certificateFileUrl: certificateFileUrl,
          verificationStatus: values.certification.providerCertification
            ? "pending"
            : null,
          providerCertificationFile: undefined,
        };

        let response;
        if (isEditMode && params?.website) {
          const decodedWebsite = decodeURIComponent(String(params.website));
          const encodedWebsite = encodeURIComponent(decodedWebsite);

          response = await axios.put(
            `/api/1241029013026-service/${encodedWebsite}`,
            submissionData,
          );
        } else {
          response = await axios.post("/api/submit", submissionData);
        }

        if (response.status === 200) {
          setIsSubmitted(true);
          if (!isEditMode) {
            reset();
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch (error: any) {
        console.error("Submit error:", error);
        if (error.response) {
          console.error("Response data:", error.response.data);
          console.error("Response status:", error.response.status);
        }
        alert(error.response?.data?.message || "Error updating service");
      } finally {
        setIsSubmitting(false);
      }
    },
    [step, isEditMode, params?.website, reset],
  );

  const handleBack = useCallback(() => {
    setStep(step - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const resetForm = useCallback(() => {
    setIsSubmitted(false);
    setStep(0);
    serviceNameValidationCache.clear();
    reset();
  }, [reset]);

  const getStepContent = useCallback(() => {
    if (isSubmitted) {
      return (
        <SuccessPage
          isEditMode={isEditMode}
          resetForm={resetForm}
          hasProviderCertification={watch(
            "certification.providerCertification",
          )}
        />
      );
    }

    switch (step) {
      case 0:
        return <Step1 />;
      case 1:
        return <Step2 />;
      default:
        return null;
    }
  }, [isSubmitted, step, isEditMode, resetForm, watch]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card
        style={{ backgroundColor: "#f2f1f0" }}
        className="w-full max-w-3xl mx-auto bg-background"
      >
        <CardHeader>
          <CardTitle className="text-2xl">
            {isSubmitted
              ? ""
              : isEditMode
                ? `Edit Service: ${decodeURIComponent(String(params?.website))}`
                : "Service Registration"}
          </CardTitle>

          {!isSubmitted && (
            <>
              <div className="text-sm text-muted-foreground">
                Step {step + 1} of 2:{" "}
                {step === 0 ? "Contact Information" : "Service Information"}
              </div>
              <div className="mt-6">
                <div className="flex justify-between">
                  {Array.from({ length: 2 }, (_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-1/2 rounded-full mx-1 ${i <= step ? "custom-bg" : "bg-gray-200"}`}
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
                  <div className={step === 0 ? "ml-auto" : ""}>
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
                        isEditMode ? (
                          "Update Service"
                        ) : (
                          "Submit Registration"
                        )
                      ) : (
                        "Continue"
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
