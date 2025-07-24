'use client'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLoadScript } from '@react-google-maps/api';
import { Library as GoogleMapsLibrary } from '@googlemaps/js-api-loader';
import LoginWithReset from '@/components/LoginWithReset';
import AdminSettings from '@/components/AdminSettings';
import {
  Eye, EyeOff, Search, Download, LogOut, User, RotateCcw, Edit, Check, X, ChevronDown,
  FileText, CheckCircle, XCircle, Clock, AlertCircle, Settings, Mail, ChevronLeft, Upload, ExternalLink
} from "lucide-react";

const GOOGLE_MAPS_API_KEY = 'AIzaSyAm-eP8b7-FH2A8nzYucTG9NcPTz0OiAX0';
const LIBRARIES: GoogleMapsLibrary[] = ["places"];

interface ServiceData {
  id: number;
  serviceName: string;
  website: string;
  primaryCoordinator: string;
  streetAddress: string;
  directions?: string;
  phone: string;
  email: string;
  fax?: string;
  programType: string;
  providerCertification: boolean;
  programCertification: boolean;
  providerCertificationSubmitted: boolean;
  providerCertificationVerified: boolean;
  certificateFileUrl?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  verificationNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  programTypes: string[];
  description: string;
  attendanceOptions: {
    coronaryHeartDisease?: boolean;
    heartFailure?: boolean;
    heartRhythmProblems?: boolean;
    deviceInsertion?: boolean;
    other?: boolean;
    otherSpecify?: string;
  };
  exerciseInfo?: string;
  educationInfo?: string;
  programServices: {
    exerciseOnly?: boolean;
    educationOnly?: boolean;
    exerciseAndEducation?: boolean;
    other?: boolean;
    otherSpecify?: string;
  };
  deliveryTypes: string[];
  deliveryTypeConfigs: any;
  hybridDescription?: string;
  f2fDescription?: string;
  telehealthDescription?: string;
  individualDescription?: string;
  enrollmentInfo: string;
  enrollmentOptions: {
    selfReferral?: boolean;
    gpReferral?: boolean;
    hospitalReferral?: boolean;
    other?: boolean;
    otherSpecify?: string;
    notAcceptingReferrals?: boolean;
  };
  interpreterAvailable: string;
  specialConditionsSupport?: string;
  privacyStatement?: string;
  lat?: number;
  lng?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminData {
  id: number;
  username: string;
  email: string;
  fullName: string;
}

// File Upload Component
const FileUpload: React.FC<{
  file: File | null;
  existingFileUrl?: string;
  onFileSelect: (file: File | null) => void;
  error?: string;
  required?: boolean;
  isEditMode?: boolean;
}> = ({ file, existingFileUrl, onFileSelect, error, required, isEditMode }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    onFileSelect(selectedFile);
  };

  const getFileName = (url: string) => {
    return url.split('/').pop() || 'certificate-file';
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="certificationFile" className="flex items-center gap-2">
        Upload Provider Certification Document {required && '*'}
        <Upload className="w-4 h-4" />
      </Label>
      
      {isEditMode && existingFileUrl && !file && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Current Certificate File</p>
                <p className="text-sm text-blue-700">{getFileName(existingFileUrl)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open(existingFileUrl, '_blank')}
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
                  const link = document.createElement('a');
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
              <span className="text-sm text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          ) : (
            <div className="text-gray-500">
              <Upload className="w-8 h-8 mx-auto mb-2" />
              <p>{isEditMode && existingFileUrl ? 'Upload new file to replace current certificate' : 'Click to upload or drag and drop'}</p>
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
          onClick={() => onFileSelect(null)}
          className="mt-2"
        >
          Remove new file
        </Button>
      )}
      
      {error && (
        <div className="text-red-500 text-sm mt-1">{error}</div>
      )}
    </div>
  );
};

// Certificate View Modal Component
const CertificateViewModal = React.memo<{
  service: ServiceData | null;
  isOpen: boolean;
  onClose: () => void;
  onVerify: (serviceId: number, action: 'verify' | 'reject', notes?: string) => void;
  verifying: boolean;
}>(({ service, isOpen, onClose, onVerify, verifying }) => {
  const [verificationNotes, setVerificationNotes] = useState('');

  const handleVerification = (verificationAction: 'verify' | 'reject') => {
    if (service) {
      onVerify(service.id, verificationAction, verificationNotes);
      setVerificationNotes('');
    }
  };

  if (!isOpen || !service) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-amber-600 border-amber-300"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'verified':
        return <Badge variant="outline" className="text-green-600 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-300"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Provider Certification Review</h2>
            <p className="text-sm text-gray-600">{service.serviceName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={verifying}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
       
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="font-medium">Service Name</Label>
              <p className="text-sm text-gray-700">{service.serviceName}</p>
            </div>
            <div>
              <Label className="font-medium">Primary Coordinator</Label>
              <p className="text-sm text-gray-700">{service.primaryCoordinator}</p>
            </div>
            <div>
              <Label className="font-medium">Email</Label>
              <p className="text-sm text-gray-700">{service.email}</p>
            </div>
            <div>
              <Label className="font-medium">Phone</Label>
              <p className="text-sm text-gray-700">{service.phone}</p>
            </div>
            <div className="md:col-span-2">
              <Label className="font-medium">Address</Label>
              <p className="text-sm text-gray-700">{service.streetAddress}</p>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <Label className="font-medium">Verification Status</Label>
              {getStatusBadge(service.verificationStatus || 'pending')}
            </div>
           
            {service.certificateFileUrl && (
              <div className="mb-4">
                <Label className="font-medium mb-2 block">Certificate Document</Label>
                <div className="flex items-center gap-2 p-3 border rounded bg-gray-50">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="flex-1 text-sm">{service.certificateFileUrl.split('/').pop()}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(service.certificateFileUrl, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = service.certificateFileUrl!;
                      link.download = service.certificateFileUrl!.split('/').pop() || 'certificate';
                      link.click();
                    }}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            )}

            {service.verificationStatus === 'pending' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="verificationNotes">Verification Notes (Optional)</Label>
                  <Textarea
                    id="verificationNotes"
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="Add any notes about this verification..."
                    rows={3}
                  />
                </div>
               
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleVerification('verify')}
                    disabled={verifying}
                    className="bg-[#C8102E] hover:bg-red-700 text-white"
                  >
                    {verifying ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Verify & Approve
                  </Button>
                  <Button
                    onClick={() => handleVerification('reject')}
                    disabled={verifying}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    {verifying ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {service.verificationStatus !== 'pending' && (
              <div className="p-3 bg-gray-100 rounded">
                <p className="text-sm text-gray-600">
                  This certification has been {service.verificationStatus === 'verified' ? 'verified and approved' : 'rejected'}.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

CertificateViewModal.displayName = 'CertificateViewModal';

// Australian Address Autocomplete Component
const AddressAutocomplete = React.memo<{
  value: string;
  onChange: (value: string, lat?: number, lng?: number) => void;
  disabled?: boolean;
  isLoaded: boolean;
}>(({ value, onChange, disabled, isLoaded }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'au' },
      fields: ['formatted_address', 'geometry.location']
    });

    const autocomplete = autocompleteRef.current;

    const handlePlaceSelect = () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();
        onChange(place.formatted_address, lat, lng);
      }
    };

    autocomplete.addListener('place_changed', handlePlaceSelect);

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, onChange]);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Enter Australian street address..."
    />
  );
});

AddressAutocomplete.displayName = 'AddressAutocomplete';

// Delivery Type Section Component (copied from main form)
const DeliveryTypeSection: React.FC<{
  type: string;
  editData: any;
  setEditData: any;
  errors: any;
  setErrors: any;
}> = ({ type, editData, setEditData, errors, setErrors }) => {
  const config = editData.deliveryTypeConfigs?.[type] || {
    duration: '',
    frequency: 'scheduled',
    schedule: {}
  };

 const typeDisplayNames: { [key: string]: string } = {
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

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hourOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const minuteOptions = ['00', '15', '30', '45'];
  const amPmOptions = ['AM', 'PM'];

  const getDescriptionPlaceholder = () => {
    switch (type) {
      case 'F2F Group': return "Please describe how your face to face group program is delivered";
      case 'Telehealth': return "Please describe how your telehealth program is delivered";
      case '1:1': return "Please describe how your individual program is delivered";
      case 'Hybrid': return "Please describe how your hybrid program is delivered";
      default: return "Please describe how your program is delivered";
    }
  };

  return (
    <div className="ml-8 space-y-4 mt-2">
      <div>
        <Label htmlFor={`${type}-duration`}>Program Length *</Label>
        <Select
          value={config.duration}
          onValueChange={(value: string) => {
            setEditData((prev: Partial<ServiceData>) => ({
              ...prev,
              deliveryTypeConfigs: {
                ...prev.deliveryTypeConfigs,
                [type]: {
                  ...config,
                  duration: value,
                  customDuration: value !== 'Other' ? '' : config.customDuration
                }
              }
            }));
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
                setEditData((prev: Partial<ServiceData>) => ({
                  ...prev,
                  deliveryTypeConfigs: {
                    ...prev.deliveryTypeConfigs,
                    [type]: {
                      ...config,
                      customDuration: e.target.value
                    }
                  }
                }));
              }}
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Label>Day and Time *</Label>
        
        <div className="space-y-4">
          {daysOfWeek.map(day => {
            const isDaySelected = Boolean(config.schedule && config.schedule[day]);
            const daySchedule = config.schedule && config.schedule[day] ? config.schedule[day] : {
              startHour: '9', startMinute: '00', startAmPm: 'AM',
              endHour: '10', endMinute: '00', endAmPm: 'AM'
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
                          startHour: '9', startMinute: '00', startAmPm: 'AM',
                          endHour: '10', endMinute: '00', endAmPm: 'AM'
                        };
                      } else {
                        if (newSchedule[day]) {
                          delete newSchedule[day];
                        }
                      }
                      
                      setEditData((prev: Partial<ServiceData>) => ({
                        ...prev,
                        deliveryTypeConfigs: {
                          ...prev.deliveryTypeConfigs,
                          [type]: {
                            ...config,
                            schedule: newSchedule
                          }
                        }
                      }));
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
                              newSchedule[day] = { ...daySchedule, startHour: value };
                             setEditData((prev: Partial<ServiceData>) => ({
                                ...prev,
                                deliveryTypeConfigs: {
                                  ...prev.deliveryTypeConfigs,
                                  [type]: { ...config, schedule: newSchedule }
                                }
                              }));
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
                              newSchedule[day] = { ...daySchedule, startMinute: value };
                             setEditData((prev: Partial<ServiceData>) => ({
                                ...prev,
                                deliveryTypeConfigs: {
                                  ...prev.deliveryTypeConfigs,
                                  [type]: { ...config, schedule: newSchedule }
                                }
                              }));
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
                              newSchedule[day] = { ...daySchedule, startAmPm: value };
                              setEditData((prev: Partial<ServiceData>) => ({
                                ...prev,
                                deliveryTypeConfigs: {
                                  ...prev.deliveryTypeConfigs,
                                  [type]: { ...config, schedule: newSchedule }
                                }
                              }));
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
                              newSchedule[day] = { ...daySchedule, endHour: value };
                              setEditData((prev: Partial<ServiceData>) => ({
                                ...prev,
                                deliveryTypeConfigs: {
                                  ...prev.deliveryTypeConfigs,
                                  [type]: { ...config, schedule: newSchedule }
                                }
                              }));
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
                              newSchedule[day] = { ...daySchedule, endMinute: value };
                              setEditData((prev: Partial<ServiceData>) => ({
                                ...prev,
                                deliveryTypeConfigs: {
                                  ...prev.deliveryTypeConfigs,
                                  [type]: { ...config, schedule: newSchedule }
                                }
                              }));
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
                              newSchedule[day] = { ...daySchedule, endAmPm: value };
                              setEditData((prev: Partial<ServiceData>) => ({
                                ...prev,
                                deliveryTypeConfigs: {
                                  ...prev.deliveryTypeConfigs,
                                  [type]: { ...config, schedule: newSchedule }
                                }
                              }));
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
      </div>

      <div>
        <Label htmlFor={`${type}-description`}>{typeDisplayNames[type]} Description *</Label>
        <Textarea
          id={`${type}-description`}
          placeholder={getDescriptionPlaceholder()}
          value={
            type === 'Hybrid' ? editData.hybridDescription || '' :
            type === 'F2F Group' ? editData.f2fDescription || '' :
            type === 'Telehealth' ? editData.telehealthDescription || '' :
            editData.individualDescription || ''
          }
          onChange={(e) => {
            if (type === 'Hybrid') {
              setEditData((prev: Partial<ServiceData>) => ({ ...prev, hybridDescription: e.target.value }));
            } else if (type === 'F2F Group') {
              setEditData((prev: Partial<ServiceData>) => ({ ...prev, f2fDescription: e.target.value }));
            } else if (type === 'Telehealth') {
              setEditData((prev: Partial<ServiceData>) => ({ ...prev, telehealthDescription: e.target.value }));
            } else if (type === '1:1') {
              setEditData((prev: Partial<ServiceData>) => ({ ...prev, individualDescription: e.target.value }));
            }
          }}
        />
      </div>
    </div>
  );
};

// Enhanced Edit Modal Component with ALL fields from main form
const EditModal = React.memo<{
  service: ServiceData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<ServiceData>) => void;
  updating: boolean;
  isGoogleLoaded: boolean;
}>(({ service, isOpen, onClose, onSave, updating, isGoogleLoaded }) => {
  const [editData, setEditData] = useState<Partial<ServiceData>>({});
  const [activeSection, setActiveSection] = useState<'basic' | 'program' | 'delivery' | 'privacy'>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [providerCertificationFile, setProviderCertificationFile] = useState<File | null>(null);

  useEffect(() => {
    if (service) {
      setEditData({
        ...service,
        programTypes: service.programTypes || [],
        deliveryTypes: service.deliveryTypes || [],
        attendanceOptions: service.attendanceOptions || {
          coronaryHeartDisease: false,
          heartFailure: false,
          heartRhythmProblems: false,
          deviceInsertion: false,
          other: false,
          otherSpecify: ''
        },
        programServices: service.programServices || {
          exerciseOnly: false,
          educationOnly: false,
          exerciseAndEducation: false,
          other: false,
          otherSpecify: ''
        },
        enrollmentOptions: service.enrollmentOptions || {
          selfReferral: false,
          gpReferral: false,
          hospitalReferral: false,
          other: false,
          otherSpecify: '',
          notAcceptingReferrals: false
        },
        deliveryTypeConfigs: service.deliveryTypeConfigs || {}
      });
      setProviderCertificationFile(null);
      setErrors({});
    }
  }, [service]);

  const handleSave = async () => {
    let dataToSave = { ...editData };

    if (providerCertificationFile) {
      try {
        const formData = new FormData();
        formData.append('file', providerCertificationFile);
        formData.append('serviceName', editData.serviceName || '');
        
        const uploadResponse = await fetch('/api/upload-certificate', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('File upload failed');
        }
        
        const uploadResult = await uploadResponse.json();
        dataToSave.certificateFileUrl = uploadResult.fileUrl;
      } catch (error) {
        console.error('File upload error:', error);
        setErrors({ providerCertificationFile: 'Failed to upload file. Please try again.' });
        return;
      }
    }

    onSave(dataToSave);
  };

  const handleAddressChange = useCallback((address: string, lat?: number, lng?: number) => {
    setEditData(prev => ({
      ...prev,
      streetAddress: address,
      ...(lat !== undefined && lng !== undefined && { lat, lng })
    }));
  }, []);

  const handleAttendanceOptionChange = (key: string, checked: boolean) => {
    setEditData((prev: Partial<ServiceData>) => ({
      ...prev,
      attendanceOptions: {
        ...prev.attendanceOptions,
        [key]: checked,
        ...(key === 'other' && !checked && { otherSpecify: '' })
      }
    }));
  };

  const handleProgramServiceChange = (key: string, checked: boolean) => {
    setEditData((prev: Partial<ServiceData>) => ({
      ...prev,
      programServices: {
        ...prev.programServices,
        [key]: checked,
        ...(key === 'other' && !checked && { otherSpecify: '' })
      }
    }));
  };

  const handleEnrollmentOptionChange = (key: string, checked: boolean) => {
    setEditData((prev: Partial<ServiceData>) => ({
      ...prev,
      enrollmentOptions: {
        ...prev.enrollmentOptions,
        [key]: checked,
        ...(key === 'other' && !checked && { otherSpecify: '' }),
        ...(key === 'notAcceptingReferrals' && checked && {
          selfReferral: false,
          gpReferral: false,
          hospitalReferral: false,
          other: false,
          otherSpecify: ''
        })
      }
    }));
  };

  const handleProgramTypeChange = (programType: string, checked: boolean) => {
    setEditData((prev: Partial<ServiceData>) => ({
      ...prev,
      programTypes: checked
        ? [...(prev.programTypes || []), programType]
        : (prev.programTypes || []).filter(type => type !== programType)
    }));
  };

  const handleDeliveryTypeChange = (deliveryType: string, checked: boolean) => {
    setEditData((prev: Partial<ServiceData>) => ({
      ...prev,
      deliveryTypes: checked
        ? [...(prev.deliveryTypes || []), deliveryType]
        : (prev.deliveryTypes || []).filter(type => type !== deliveryType)
    }));
  };

  const updateEnrollmentString = (options: any) => {
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
    
    setEditData(prev => ({ ...prev, enrollmentInfo: enrollmentText }));
  };

  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Edit Service: {service.serviceName}</h2>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setActiveSection('basic')}
                className={`px-3 py-1 text-sm rounded ${
                  activeSection === 'basic' ? 'bg-[#C8102E] text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setActiveSection('program')}
                className={`px-3 py-1 text-sm rounded ${
                  activeSection === 'program' ? 'bg-[#C8102E] text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Program Details
              </button>
              <button
                onClick={() => setActiveSection('delivery')}
                className={`px-3 py-1 text-sm rounded ${
                  activeSection === 'delivery' ? 'bg-[#C8102E] text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Delivery & Enrollment
              </button>
              <button
                onClick={() => setActiveSection('privacy')}
                className={`px-3 py-1 text-sm rounded ${
                  activeSection === 'privacy' ? 'bg-[#C8102E] text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Privacy & Settings
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={updating}
              className="bg-[#C8102E] hover:bg-red-700 text-white"
            >
              {updating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
            <Button variant="outline" onClick={onClose} disabled={updating}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
       
        <div className="p-6 space-y-6">
          {/* Basic Information Section */}
          {activeSection === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serviceName">Service Name</Label>
                  <Input
                    id="serviceName"
                    value={editData.serviceName || ''}
                    onChange={(e) => {
                      let value = e.target.value;
                      value = value.replace(/\//g, '-');
                      if (value.startsWith(' ')) {
                        value = value.trimStart();
                      }
                      value = value.replace(/  +/g, ' ');
                      setEditData(prev => ({ ...prev, serviceName: value }));
                    }}
                    onBlur={(e) => {
                      const trimmedValue = e.target.value.trim();
                      setEditData(prev => ({ ...prev, serviceName: trimmedValue }));
                    }}
                  />
                </div>
               
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={editData.website || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
               
                <div>
                  <Label htmlFor="primaryCoordinator">Program Coordinator</Label>
                  <Input
                    id="primaryCoordinator"
                    value={editData.primaryCoordinator || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, primaryCoordinator: e.target.value }))}
                  />
                </div>
               
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={editData.phone || ''}
                    onChange={(e) => {
                      let numericValue = e.target.value.replace(/\D/g, '');
                      if (numericValue.length > 10) {
                        numericValue = numericValue.slice(0, 10);
                      }
                      setEditData(prev => ({ ...prev, phone: numericValue }));
                    }}
                    inputMode="numeric"
                    placeholder="e.g. 0412345678"
                  />
                </div>
               
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editData.email || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
               
                <div>
                  <Label htmlFor="fax">Fax</Label>
                  <Input
                    id="fax"
                    value={editData.fax || ''}
                    onChange={(e) => {
                      let numericValue = e.target.value.replace(/\D/g, '');
                      setEditData(prev => ({ ...prev, fax: numericValue }));
                    }}
                  />
                </div>
               
                <div>
                  <Label htmlFor="programType">Program Type</Label>
                  <Select
                    value={editData.programType || ''}
                    onValueChange={(value) => setEditData(prev => ({ ...prev, programType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Public">Public</SelectItem>
                      <SelectItem value="Private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
               
                <div>
                  <Label htmlFor="interpreterAvailable">Interpreter Available</Label>
                  <Select
                    value={editData.interpreterAvailable || ''}
                    onValueChange={(value) => setEditData(prev => ({ ...prev, interpreterAvailable: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="streetAddress">Street Address</Label>
                <AddressAutocomplete
                  value={editData.streetAddress || ''}
                  onChange={handleAddressChange}
                  disabled={updating}
                  isLoaded={isGoogleLoaded}
                />
                {!isGoogleLoaded && (
                  <div className="text-sm text-gray-500 mt-1">Loading Google Maps...</div>
                )}
              </div>
             
              <div>
                <Label htmlFor="directions">Directions</Label>
                <Textarea
                  id="directions"
                  value={editData.directions || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, directions: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lat">Latitude</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    value={editData.lat || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, lat: parseFloat(e.target.value) || undefined }))}
                  />
                </div>
               
                <div>
                  <Label htmlFor="lng">Longitude</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="any"
                    value={editData.lng || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, lng: parseFloat(e.target.value) || undefined }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={editData.isActive || false}
                  onCheckedChange={(checked) => setEditData(prev => ({ ...prev, isActive: checked as boolean }))}
                />
                <Label htmlFor="isActive">Service is active</Label>
              </div>

              {/* ACRA/ICCPR Certification Section */}
              <div>
                <Label>ACRA/ICCPR certification status:</Label>
                
                <Alert className="mb-4 border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Important:</strong> All service information will be submitted and accessible to end users immediately. 
                    Provider certification will be reviewed by our team before being verified and displayed.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="providerCertification"
                      checked={editData.providerCertificationSubmitted || false}
                      onCheckedChange={(checked: boolean | 'indeterminate') => {
                        setEditData(prev => ({ 
                          ...prev, 
                          providerCertificationSubmitted: checked as boolean
                        }));
                        if (!checked) {
                          setProviderCertificationFile(null);
                        }
                      }}
                    />
                    <Label htmlFor="providerCertification">
                      I want my service to be ACRA/ICCPR verified (Provider certification)
                    </Label>
                  </div>
                  
                  {editData.providerCertificationSubmitted && (
                    <div className="ml-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="mb-3">
                        <p className="text-sm text-gray-700 mb-2">
                          <strong>To get ACRA/ICCPR verification:</strong>
                        </p>
                        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                          <li>Upload your provider certification document</li>
                          <li>Our team will review and verify your certification</li>
                          <li>Your service will show as "ACRA/ICCPR Verified" once approved</li>
                        </ul>
                      </div>
                      
                      <FileUpload
                        file={providerCertificationFile}
                        existingFileUrl={editData.certificateFileUrl}
                        isEditMode={true}
                        onFileSelect={(file) => {
                          setProviderCertificationFile(file);
                          if (errors.providerCertificationFile) {
                            setErrors(prev => ({ ...prev, providerCertificationFile: '' }));
                          }
                        }}
                        error={errors.providerCertificationFile}
                        required={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Program Details Section */}
          {activeSection === 'program' && (
            <div className="space-y-6">
              {/* Program Types */}
              <div>
                <Label className="text-base font-medium">Program Types</Label>
                <div className="space-y-2 mt-2">
                  {[
                    'Cardiac Rehabilitation Program',
                    'Heart Failure Program',
                    'Cardiac Rehabilitation & Heart Failure Program',
                  ].map((programType) => (
                    <div key={programType} className="flex items-center space-x-2">
                      <Checkbox
                        id={programType}
                        checked={(editData.programTypes || []).includes(programType)}
                        onCheckedChange={(checked) => handleProgramTypeChange(programType, checked as boolean)}
                      />
                      <Label htmlFor={programType}>{programType}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Program Description</Label>
                <Textarea
                  id="description"
                  value={editData.description || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder="Please describe your program and the benefits to heart health"
                />
              </div>

              {/* Who can attend */}
              <div>
                <Label className="text-base font-medium">Who can attend?</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="coronaryHeartDisease"
                      checked={editData.attendanceOptions?.coronaryHeartDisease || false}
                      onCheckedChange={(checked) => handleAttendanceOptionChange('coronaryHeartDisease', checked as boolean)}
                    />
                    <Label htmlFor="coronaryHeartDisease">
                      Coronary heart disease; angina, heart attack, stent, bypass surgery
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="heartFailure"
                      checked={editData.attendanceOptions?.heartFailure || false}
                      onCheckedChange={(checked) => handleAttendanceOptionChange('heartFailure', checked as boolean)}
                    />
                    <Label htmlFor="heartFailure">Heart Failure or cardiomyopathy</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="heartRhythmProblems"
                      checked={editData.attendanceOptions?.heartRhythmProblems || false}
                      onCheckedChange={(checked) => handleAttendanceOptionChange('heartRhythmProblems', checked as boolean)}
                    />
                    <Label htmlFor="heartRhythmProblems">
                      Heart electrical rhythm conditions e.g. Atrial fibrillation
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="deviceInsertion"
                      checked={editData.attendanceOptions?.deviceInsertion || false}
                      onCheckedChange={(checked) => handleAttendanceOptionChange('deviceInsertion', checked as boolean)}
                    />
                    <Label htmlFor="deviceInsertion">
                      People after a device insertion; e.g. Pacemaker, ICD
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="attendanceOther"
                      checked={editData.attendanceOptions?.other || false}
                      onCheckedChange={(checked) => handleAttendanceOptionChange('other', checked as boolean)}
                    />
                    <Label htmlFor="attendanceOther">Other, please specify</Label>
                  </div>

                  {editData.attendanceOptions?.other && (
                    <Textarea
                      value={editData.attendanceOptions?.otherSpecify || ''}
                      onChange={(e) => {
                        setEditData(prev => ({
                          ...prev,
                          attendanceOptions: {
                            ...prev.attendanceOptions,
                            otherSpecify: e.target.value
                          }
                        }));
                      }}
                      placeholder="Please specify other conditions"
                      rows={2}
                    />
                  )}
                </div>
              </div>

              {/* What services are offered */}
              <div>
                <Label className="text-base font-medium">What services are offered?</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="exerciseOnly"
                      checked={editData.programServices?.exerciseOnly || false}
                      onCheckedChange={(checked) => {
                        handleProgramServiceChange('exerciseOnly', checked as boolean);
                        if (checked) {
                          handleProgramServiceChange('educationOnly', false);
                          handleProgramServiceChange('exerciseAndEducation', false);
                        }
                      }}
                    />
                    <Label htmlFor="exerciseOnly">Exercise only program</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="educationOnly"
                      checked={editData.programServices?.educationOnly || false}
                      onCheckedChange={(checked) => {
                        handleProgramServiceChange('educationOnly', checked as boolean);
                        if (checked) {
                          handleProgramServiceChange('exerciseOnly', false);
                          handleProgramServiceChange('exerciseAndEducation', false);
                        }
                      }}
                    />
                    <Label htmlFor="educationOnly">Education only program</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="exerciseAndEducation"
                      checked={editData.programServices?.exerciseAndEducation || false}
                      onCheckedChange={(checked) => {
                        handleProgramServiceChange('exerciseAndEducation', checked as boolean);
                        if (checked) {
                          handleProgramServiceChange('exerciseOnly', false);
                          handleProgramServiceChange('educationOnly', false);
                        }
                      }}
                    />
                    <Label htmlFor="exerciseAndEducation">Exercise and Education included in program</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="programServicesOther"
                      checked={editData.programServices?.other || false}
                      onCheckedChange={(checked) => handleProgramServiceChange('other', checked as boolean)}
                    />
                    <Label htmlFor="programServicesOther">Other services provided, please specify</Label>
                  </div>

                  {editData.programServices?.other && (
                    <Textarea
                      value={editData.programServices?.otherSpecify || ''}
                      onChange={(e) => {
                        setEditData(prev => ({
                          ...prev,
                          programServices: {
                            ...prev.programServices,
                            otherSpecify: e.target.value
                          }
                        }));
                      }}
                      placeholder="Please provide more information"
                      rows={2}
                    />
                  )}
                </div>
              </div>

              {/* Exercise Details */}
              {(editData.programServices?.exerciseOnly || editData.programServices?.exerciseAndEducation) && (
                <div>
                  <Label htmlFor="exerciseInfo">Exercise Details</Label>
                  <Textarea
                    id="exerciseInfo"
                    value={editData.exerciseInfo || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, exerciseInfo: e.target.value }))}
                    rows={3}
                    placeholder="Please provide details about the exercise program"
                  />
                </div>
              )}

              {/* Education Details */}
              {(editData.programServices?.educationOnly || editData.programServices?.exerciseAndEducation) && (
                <div>
                  <Label htmlFor="educationInfo">Education Details</Label>
                  <Textarea
                    id="educationInfo"
                    value={editData.educationInfo || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, educationInfo: e.target.value }))}
                    rows={3}
                    placeholder="Please provide details about the education program"
                  />
                </div>
              )}
            </div>
          )}

          {/* Delivery & Enrollment Section */}
          {activeSection === 'delivery' && (
            <div className="space-y-6">
              {/* Delivery Types */}
              <div>
                <Label className="text-base font-medium">Program delivery information:</Label>
                <div className="space-y-4">
                  {[
                    { value: 'F2F Group', label: 'Face to face group program' },
                    { value: 'Telehealth', label: 'Telehealth program (via phone/internet)' },
                    { value: '1:1', label: 'Individual program' },
                    { value: 'Hybrid', label: 'Hybrid program (including face to face/individual and telehealth delivery)' }
                  ].map((typeObj) => (
                    <div key={typeObj.value} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={typeObj.value}
                          checked={(editData.deliveryTypes || []).includes(typeObj.value)}
                          onCheckedChange={(checked: boolean | 'indeterminate') => {
                            const currentTypes = editData.deliveryTypes || [];
                            const newTypes = checked 
                              ? [...currentTypes, typeObj.value]
                              : currentTypes.filter((t) => t !== typeObj.value);
                            setEditData(prev => ({ ...prev, deliveryTypes: newTypes }));
                            
                            if (!checked) {
                              const newConfigs = { ...editData.deliveryTypeConfigs };
                              delete newConfigs[typeObj.value];
                              setEditData(prev => ({ ...prev, deliveryTypeConfigs: newConfigs }));
                              
                              if (typeObj.value === 'Hybrid') {
                                setEditData(prev => ({ ...prev, hybridDescription: '' }));
                              } else if (typeObj.value === 'F2F Group') {
                                setEditData(prev => ({ ...prev, f2fDescription: '' }));
                              } else if (typeObj.value === 'Telehealth') {
                                setEditData(prev => ({ ...prev, telehealthDescription: '' }));
                              } else if (typeObj.value === '1:1') {
                                setEditData(prev => ({ ...prev, individualDescription: '' }));
                              }
                            } else {
                              setEditData(prev => ({
                                ...prev,
                                deliveryTypeConfigs: {
                                  ...prev.deliveryTypeConfigs,
                                  [typeObj.value]: {
                                    duration: '',
                                    frequency: 'scheduled',
                                    schedule: {}
                                  }
                                }
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={typeObj.value}>{typeObj.label}</Label>
                      </div>
                      
                      {(editData.deliveryTypes || []).includes(typeObj.value) && (
                        <DeliveryTypeSection 
                          type={typeObj.value} 
                          editData={editData} 
                          setEditData={setEditData} 
                          errors={errors} 
                          setErrors={setErrors} 
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Enrollment Options */}
              <div>
                <Label className="text-base font-medium">How Do I Enrol in the Program?</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="selfReferral"
                      checked={editData.enrollmentOptions?.selfReferral || false}
                      onCheckedChange={(checked) => {
                        handleEnrollmentOptionChange('selfReferral', checked as boolean);
                        updateEnrollmentString({
                          ...editData.enrollmentOptions,
                          selfReferral: checked as boolean
                        });
                      }}
                    />
                    <Label htmlFor="selfReferral">Self-referral</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="gpReferral"
                      checked={editData.enrollmentOptions?.gpReferral || false}
                      onCheckedChange={(checked) => {
                        handleEnrollmentOptionChange('gpReferral', checked as boolean);
                        updateEnrollmentString({
                          ...editData.enrollmentOptions,
                          gpReferral: checked as boolean
                        });
                      }}
                    />
                    <Label htmlFor="gpReferral">General Practitioner (GP) referral</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hospitalReferral"
                      checked={editData.enrollmentOptions?.hospitalReferral || false}
                      onCheckedChange={(checked) => {
                          handleEnrollmentOptionChange('hospitalReferral', checked as boolean);
                        updateEnrollmentString({
                          ...editData.enrollmentOptions,
                          hospitalReferral: checked as boolean
                        });
                      }}
                    />
                    <Label htmlFor="hospitalReferral">Hospital referral</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enrollmentOther"
                      checked={editData.enrollmentOptions?.other || false}
                      onCheckedChange={(checked) => {
                        handleEnrollmentOptionChange('other', checked as boolean);
                        updateEnrollmentString({
                          ...editData.enrollmentOptions,
                          other: checked as boolean
                        });
                      }}
                    />
                    <Label htmlFor="enrollmentOther">Other</Label>
                  </div>

                  {editData.enrollmentOptions?.other && (
                    <Textarea
                      value={editData.enrollmentOptions?.otherSpecify || ''}
                      onChange={(e) => {
                        const newOptions = {
                          ...editData.enrollmentOptions,
                          otherSpecify: e.target.value
                        };
                        setEditData(prev => ({
                          ...prev,
                          enrollmentOptions: newOptions
                        }));
                        updateEnrollmentString(newOptions);
                      }}
                      placeholder="Please specify other enrollment options"
                      rows={2}
                    />
                  )}

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notAcceptingReferrals"
                      checked={editData.enrollmentOptions?.notAcceptingReferrals || false}
                      onCheckedChange={(checked) => {
                        handleEnrollmentOptionChange('notAcceptingReferrals', checked as boolean);
                        updateEnrollmentString({
                          ...editData.enrollmentOptions,
                          notAcceptingReferrals: checked as boolean
                        });
                      }}
                    />
                    <Label htmlFor="notAcceptingReferrals" className="text-amber-700">
                      Currently not accepting external referrals
                    </Label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="enrollmentInfo">Enrollment Information</Label>
                <Textarea
                  id="enrollmentInfo"
                  value={editData.enrollmentInfo || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, enrollmentInfo: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Privacy & Settings Section */}
          {activeSection === 'privacy' && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="specialConditionsSupport">More Information</Label>
                <Textarea
                  id="specialConditionsSupport"
                  value={editData.specialConditionsSupport || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, specialConditionsSupport: e.target.value }))}
                  rows={4}
                  placeholder="If you would like to include any additional information about your service."
                />
              </div>

              <div>
                <Label htmlFor="privacyStatement">Privacy Statement</Label>
                <Textarea
                  id="privacyStatement"
                  value={editData.privacyStatement || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, privacyStatement: e.target.value }))}
                  rows={4}
                  placeholder="Privacy statement content..."
                />
              </div>

              {/* Provider Certification Status */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <Label className="text-base font-medium">Provider Certification Status</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="providerCertificationSubmitted"
                      checked={editData.providerCertificationSubmitted || false}
                      onCheckedChange={(checked) => setEditData(prev => ({ 
                        ...prev, 
                        providerCertificationSubmitted: checked as boolean 
                      }))}
                    />
                    <Label htmlFor="providerCertificationSubmitted">Certification Submitted</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="providerCertificationVerified"
                      checked={editData.providerCertificationVerified || false}
                      onCheckedChange={(checked) => setEditData(prev => ({ 
                        ...prev, 
                        providerCertificationVerified: checked as boolean 
                      }))}
                    />
                    <Label htmlFor="providerCertificationVerified">Certification Verified</Label>
                  </div>
                </div>

                <div className="mt-3">
                  <Label htmlFor="verificationStatus">Verification Status</Label>
                  <Select
                    value={editData.verificationStatus || ''}
                    onValueChange={(value) => setEditData(prev => ({ ...prev, verificationStatus: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editData.certificateFileUrl && (
                  <div className="mt-3">
                    <Label>Certificate File</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(editData.certificateFileUrl, '_blank')}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        View Certificate
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

EditModal.displayName = 'EditModal';

// Table Row Component
const TableRow = React.memo<{
  service: ServiceData;
  index: number;
  selectedColumns: string[];
  onEdit: (service: ServiceData) => void;
  onViewCertificate: (service: ServiceData) => void;
  showVerificationActions?: boolean;
}>(({ service, index, selectedColumns, onEdit, onViewCertificate, showVerificationActions = false }) => {
  const formatCellValue = useCallback((value: any, column: string): React.ReactNode => {
    if (value === null || value === undefined) return '-';
   
    switch (column) {
      case 'providerCertification':
      case 'programCertification':
      case 'isActive':
        return (
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Yes' : 'No'}
          </Badge>
        );
     
      case 'providerCertificationSubmitted':
        return (
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Submitted' : 'Not Submitted'}
          </Badge>
        );
     
      case 'verificationStatus':
        if (!value) return '-';
        return (
          <Badge
            variant="outline"
            className={
              value === 'verified' ? 'text-green-600 border-green-300' :
              value === 'rejected' ? 'text-red-600 border-red-300' :
              'text-amber-600 border-amber-300'
            }
          >
            {value === 'verified' && <CheckCircle className="w-3 h-3 mr-1" />}
            {value === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
            {value === 'pending' && <Clock className="w-3 h-3 mr-1" />}
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </Badge>
        );
     
      case 'certificateFileUrl':
        return value ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(value, '_blank')}
          >
            <FileText className="w-3 h-3 mr-1" />
            View
          </Button>
        ) : '-';
     
      case 'programTypes':
      case 'deliveryTypes':
        return Array.isArray(value) ? value.join(', ') : value;
     
      case 'createdAt':
      case 'updatedAt':
        return new Date(value).toLocaleDateString();
     
      case 'email':
        return (
          <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
            {value}
          </a>
        );
     
      case 'phone':
        return (
          <a href={`tel:${value}`} className="text-blue-600 hover:underline">
            {value}
          </a>
        );
        
      case 'description':
      case 'specialConditionsSupport':
      case 'privacyStatement':
        if (typeof value === 'string' && value.length > 50) {
          return (
            <div title={value}>
              {value.substring(0, 50)}...
            </div>
          );
        }
        return value;
     
      default:
        return value.toString();
    }
  }, []);

  return (
    <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
      {selectedColumns.map(column => (
        <td
          key={column}
          className="px-4 py-3 text-sm text-gray-900 border-r border-gray-100 align-top"
        >
          {formatCellValue(service[column as keyof ServiceData], column)}
        </td>
      ))}
      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap sticky right-0 bg-inherit">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(service)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          {showVerificationActions && service.providerCertificationSubmitted && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewCertificate(service)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              {service.verificationStatus === 'pending' ? 'Verify' : 'View'}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
});

TableRow.displayName = 'TableRow';

// Custom hook for debounced search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Main Admin Dashboard Component
const AdminDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [editingService, setEditingService] = useState<ServiceData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard');
 
  const [viewingCertificate, setViewingCertificate] = useState<ServiceData | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const { isLoaded: isGoogleLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const mainColumns = useMemo(() => [
    'serviceName',
    'primaryCoordinator',
    'streetAddress',
    'phone',
    'email',
    'programType',
    'createdAt'
  ], []);

  const allColumns = useMemo(() => [
    'id', 'serviceName', 'website', 'primaryCoordinator', 'streetAddress', 'directions',
    'phone', 'email', 'fax', 'programType', 'providerCertification', 'programCertification',
    'providerCertificationSubmitted', 'verificationStatus', 'certificateFileUrl',
    'programTypes', 'description', 'exerciseInfo', 'educationInfo', 'deliveryTypes',
    'hybridDescription', 'f2fDescription', 'telehealthDescription', 'individualDescription',
    'enrollmentInfo', 'interpreterAvailable', 'specialConditionsSupport', 'privacyStatement',
    'lat', 'lng', 'isActive', 'createdAt', 'updatedAt'
  ], []);

  const columnLabels: Record<string, string> = useMemo(() => ({
    id: 'ID', serviceName: 'Service Name', website: 'Website',
    primaryCoordinator: 'Program Coordinator', streetAddress: 'Address', directions: 'Directions',
    phone: 'Phone', email: 'Email', fax: 'Fax', programType: 'Type',
    providerCertification: 'Provider Cert (Verified)', programCertification: 'Program Cert',
    providerCertificationSubmitted: 'Cert Submitted', verificationStatus: 'Verification Status',
    certificateFileUrl: 'Certificate File', programTypes: 'Program Types', description: 'Description',
    exerciseInfo: 'Exercise Info', educationInfo: 'Education Info', deliveryTypes: 'Delivery Types',
    hybridDescription: 'Hybrid Description', f2fDescription: 'F2F Description',
    telehealthDescription: 'Telehealth Description', individualDescription: 'Individual Description',
    enrollmentInfo: 'Enrollment Info', interpreterAvailable: 'Interpreter Available',
    specialConditionsSupport: 'Special Conditions', privacyStatement: 'Privacy Statement',
    lat: 'Latitude', lng: 'Longitude', isActive: 'Active', createdAt: 'Created', updatedAt: 'Updated'
  }), []);

  useEffect(() => {
    if (activeTab === 'pending') {
      setSelectedColumns([
        'serviceName', 'primaryCoordinator', 'email', 'phone',
        'providerCertificationSubmitted', 'verificationStatus', 'certificateFileUrl', 'createdAt'
      ]);
    } else {
      setSelectedColumns(mainColumns);
    }
  }, [mainColumns, activeTab]);

  useEffect(() => {
    validateSession();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowColumnDropdown(false);
      }
    };

    if (showColumnDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnDropdown]);

  const validateSession = async () => {
    try {
      const response = await fetch('/api/admin/auth/validate', {
        credentials: 'include'
      });
     
      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          setIsAuthenticated(true);
          setAdmin(data.admin);
          await loadServices();
        }
      }
    } catch (error) {
      console.error('Session validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/services', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setServices(data.services);
        setError('');
      } else if (response.status === 401) {
        setIsAuthenticated(false);
        setAdmin(null);
      } else {
        setError('Failed to load services');
      }
    } catch (err) {
      setError('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (adminData: AdminData) => {
    setIsAuthenticated(true);
    setAdmin(adminData);
    loadServices();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setAdmin(null);
      setServices([]);
      setCurrentView('dashboard');
    }
  };

  const refreshData = useCallback(async () => {
    await loadServices();
  }, []);

  const handleEdit = useCallback((service: ServiceData) => {
    setEditingService(service);
    setShowEditModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowEditModal(false);
    setEditingService(null);
  }, []);

  const handleViewCertificate = useCallback((service: ServiceData) => {
    setViewingCertificate(service);
    setShowCertificateModal(true);
  }, []);

  const handleCloseCertificateModal = useCallback(() => {
    setShowCertificateModal(false);
    setViewingCertificate(null);
  }, []);

  const handleVerifyProviderCertification = useCallback(async (serviceId: number, action: 'verify' | 'reject', notes?: string) => {
    setVerifying(true);
   
    try {
      const response = await fetch('/api/admin/verify-certification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          serviceId,
          action,
          notes
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        setError(`Failed to ${action} certification: HTTP ${response.status} - ${response.statusText}`);
        return;
      }

      const data = await response.json();

      if (!data.success) {
        setError(`Failed to ${action} certification: ${data.message || 'Unknown error'}`);
        return;
      }

      setServices(prev => prev.map(service =>
        service.id === serviceId
          ? {
              ...service,
              providerCertification: action === 'verify',
              providerCertificationVerified: action === 'verify',
              verificationStatus: action === 'verify' ? 'verified' : 'rejected'
            }
          : service
      ));
     
      handleCloseCertificateModal();
      setError('');
     
    } catch (err) {
      console.error('Network error during verification:', err);
      setError(`Network error: Failed to ${action} certification. Please check your connection.`);
    } finally {
      setVerifying(false);
    }
  }, [handleCloseCertificateModal]);

  const handleSaveService = useCallback(async (editData: Partial<ServiceData>) => {
    if (!editData.website) return;
   
    setUpdating(true);
    try {
      let enrollmentText = '';
      if (editData.enrollmentOptions?.notAcceptingReferrals) {
        enrollmentText = 'Currently not accepting external referrals.';
      } else {
        const enrollmentMethods = [];
        if (editData.enrollmentOptions?.selfReferral) enrollmentMethods.push('Self-referral');
        if (editData.enrollmentOptions?.gpReferral) enrollmentMethods.push('General Practitioner (GP) referral');
        if (editData.enrollmentOptions?.hospitalReferral) enrollmentMethods.push('Hospital referral');
        if (editData.enrollmentOptions?.other && editData.enrollmentOptions?.otherSpecify) {
          enrollmentMethods.push(`Other: ${editData.enrollmentOptions.otherSpecify}`);
        }
        enrollmentText = `Enrollment methods: ${enrollmentMethods.join(', ')}`;
      }

      const updatePayload = {
        serviceName: editData.serviceName,
        website: editData.website,
        primaryCoordinator: editData.primaryCoordinator,
        streetAddress: editData.streetAddress,
        directions: editData.directions,
        phone: editData.phone,
        email: editData.email,
        fax: editData.fax,
        programType: editData.programType,
        lat: editData.lat,
        lng: editData.lng,
        
        certification: {
          providerCertification: editData.providerCertificationVerified || false,
        },
        providerCertificationSubmitted: editData.providerCertificationSubmitted || false,
        providerCertificationVerified: editData.providerCertificationVerified || false,
        certificateFileUrl: editData.certificateFileUrl,
        verificationStatus: editData.verificationStatus,
        
        programTypes: editData.programTypes || [],
        description: editData.description,
        attendanceOptions: editData.attendanceOptions || {},
        programServices: editData.programServices || {},
        exercise: editData.exerciseInfo,
        education: editData.educationInfo,
        
        deliveryTypes: editData.deliveryTypes || [],
        deliveryTypeConfigs: editData.deliveryTypeConfigs || {},
        hybridDescription: editData.hybridDescription,
        f2fDescription: editData.f2fDescription,
        telehealthDescription: editData.telehealthDescription,
        individualDescription: editData.individualDescription,
        
        enrollment: editData.enrollmentInfo || enrollmentText,
        enrollmentOptions: editData.enrollmentOptions || {},
        interpreterAvailable: editData.interpreterAvailable,
        specialConditionsSupport: editData.specialConditionsSupport,
        
        privacyStatement: editData.privacyStatement || 'Heart Foundation Privacy Statement Accepted',
        privacyPolicyAccepted: true
      };

      const encodedWebsite = encodeURIComponent(editData.website);
      const response = await fetch(`/api/1241029013026-service/${encodedWebsite}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatePayload)
      });

      if (response.ok) {
        setServices(prev => prev.map(service =>
          service.id === editingService?.id ? { ...service, ...editData } : service
        ));
        handleCloseModal();
        setError('');
      } else {
        const errorData = await response.json();
        setError(`Failed to update service: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Update error:', err);
      setError('Failed to update service - network error');
    } finally {
      setUpdating(false);
    }
  }, [editingService, handleCloseModal]);

  const filteredServices = useMemo(() => {
    let filtered = services;
   
    if (activeTab === 'pending') {
      filtered = services.filter(service =>
        service.providerCertificationSubmitted && service.verificationStatus === 'pending'
      );
    }
   
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(service =>
        Object.values(service).some(value =>
          value && value.toString().toLowerCase().includes(searchLower)
        )
      );
    }
   
    return filtered;
  }, [services, debouncedSearchTerm, activeTab]);

  const toggleColumn = useCallback((column: string) => {
    setSelectedColumns(prev => {
      if (prev.includes(column)) {
        return prev.filter(col => col !== column);
      } else {
        return [...prev, column];
      }
    });
  }, []);

  const selectAllColumns = useCallback(() => {
    setSelectedColumns([...allColumns]);
  }, [allColumns]);

  const deselectAllColumns = useCallback(() => {
    if (activeTab === 'pending') {
      setSelectedColumns([
        'serviceName', 'primaryCoordinator', 'email', 'phone',
        'providerCertificationSubmitted', 'verificationStatus', 'certificateFileUrl', 'createdAt'
      ]);
    } else {
      setSelectedColumns(mainColumns);
    }
  }, [mainColumns, activeTab]);

  const exportToCSV = useCallback(() => {
    const exportColumns = selectedColumns.filter(col => col !== 'actions');
    const headers = exportColumns.map(col => columnLabels[col]).join(',');
    const rows = filteredServices.map(service =>
      exportColumns.map(col => {
        const value = service[col as keyof ServiceData];
        if (Array.isArray(value)) return `"${value.join('; ')}"`;
        if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
        return value || '';
      }).join(',')
    );
   
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cardiac-services-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [selectedColumns, filteredServices, columnLabels, activeTab]);

  const pendingVerificationsCount = useMemo(() => {
    return services.filter(service =>
      service.providerCertificationSubmitted && service.verificationStatus === 'pending'
    ).length;
  }, [services]);

  if (!isAuthenticated) {
    return <LoginWithReset onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EditModal
        service={editingService}
        isOpen={showEditModal}
        onClose={handleCloseModal}
        onSave={handleSaveService}
        updating={updating}
        isGoogleLoaded={isGoogleLoaded}
      />

      <CertificateViewModal
        service={viewingCertificate}
        isOpen={showCertificateModal}
        onClose={handleCloseCertificateModal}
        onVerify={handleVerifyProviderCertification}
        verifying={verifying}
      />

      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {currentView === 'dashboard' ? 'Admin Dashboard' : 'Admin Settings'}
            </h1>
            {admin && (
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                <User className="w-3 h-3 mr-1" />
                {admin.username}
              </Badge>
            )}
            {currentView === 'dashboard' && (
              <>
                <Badge variant="outline">{services.length} Total Services</Badge>
                {pendingVerificationsCount > 0 && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {pendingVerificationsCount} Pending Verification
                  </Badge>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentView === 'dashboard' ? (
              <>
                <Button onClick={refreshData} variant="outline" disabled={loading}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={exportToCSV} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  onClick={() => setCurrentView('settings')}
                  variant="outline"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setCurrentView('dashboard')}
                variant="outline"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            )}
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {currentView === 'settings' ? (
          <AdminSettings />
        ) : (
          <>
            <div className="mb-6">
              <div className="flex border-b border-gray-200">
                <button
                  className={`px-4 py-2 font-medium text-sm border-b-2 ${
                    activeTab === 'all'
                      ? 'border-[#C8102E] text-[#C8102E]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('all')}
                >
                  All Services
                </button>
                <button
                  className={`px-4 py-2 font-medium text-sm border-b-2 relative ${
                    activeTab === 'pending'
                      ? 'border-[#C8102E] text-[#C8102E]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('pending')}
                >
                  Pending Verification
                  {pendingVerificationsCount > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      {pendingVerificationsCount}
                    </Badge>
                  )}
                </button>
              </div>
            </div>

            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search services..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {activeTab === 'all' && (
                    <div className="relative" ref={dropdownRef}>
                      <Button
                        variant="outline"
                        onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                        className="flex items-center gap-2"
                      >
                        Select Columns ({selectedColumns.length})
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                     
                      {showColumnDropdown && (
                        <div className="absolute top-full mt-2 right-0 w-72 bg-white border rounded-lg shadow-lg z-[100] max-h-80 overflow-y-auto">
                          <div className="p-3">
                            <div className="text-sm font-medium mb-3 flex items-center justify-between">
                              <span>Select columns to display:</span>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={selectAllColumns}
                                  className="text-xs px-2 py-1 h-auto"
                                >
                                  All
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={deselectAllColumns}
                                  className="text-xs px-2 py-1 h-auto"
                                >
                                  Default
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {allColumns.map(column => (
                                <div key={column} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`col-${column}`}
                                    checked={selectedColumns.includes(column)}
                                    onCheckedChange={() => toggleColumn(column)}
                                  />
                                  <Label htmlFor={`col-${column}`} className="text-sm cursor-pointer flex-1">
                                    {columnLabels[column]}
                                  </Label>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 pt-3 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowColumnDropdown(false)}
                                className="w-full"
                              >
                                Close
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {error && (
              <Card className="mb-6 border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="text-red-600 text-sm">{error}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setError('')}
                    className="mt-2"
                  >
                    Dismiss
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[calc(100vh-400px)]">
                  <table className="w-full min-w-max">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        {selectedColumns.map(column => (
                          <th
                            key={column}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b whitespace-nowrap"
                          >
                            {columnLabels[column]}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b whitespace-nowrap sticky right-0 bg-gray-50 z-20">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan={selectedColumns.length + 1} className="px-4 py-8 text-center">
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#C8102E]"></div>
                              <span className="ml-2">Loading...</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredServices.length === 0 ? (
                        <tr>
                          <td colSpan={selectedColumns.length + 1} className="px-4 py-8 text-center text-gray-500">
                            {debouncedSearchTerm ? 'No services found matching your search.' :
                             activeTab === 'pending' ? 'No services pending verification.' : 'No services found.'}
                          </td>
                        </tr>
                      ) : (
                        filteredServices.map((service, index) => (
                          <TableRow
                            key={service.id}
                            service={service}
                            index={index}
                            selectedColumns={selectedColumns}
                            onEdit={handleEdit}
                            onViewCertificate={handleViewCertificate}
                            showVerificationActions={activeTab === 'pending'}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {filteredServices.length > 0 && (
              <div className="mt-4 text-sm text-gray-500 text-center">
                Showing {filteredServices.length} of {services.length} services
                {debouncedSearchTerm && ` (filtered by "${debouncedSearchTerm}")`}
                {activeTab === 'pending' && ` • ${pendingVerificationsCount} pending verification`}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;