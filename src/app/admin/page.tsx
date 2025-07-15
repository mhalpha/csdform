// src/app/admin/page.tsx
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
import { useLoadScript } from '@react-google-maps/api';
import { Library as GoogleMapsLibrary } from '@googlemaps/js-api-loader';
import { 
  Eye, 
  EyeOff, 
  Search, 
  Download,
  LogOut,
  User,
  RotateCcw,
  Edit,
  Check,
  X,
  ChevronDown,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
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
  // New provider certification verification fields
  providerCertificationSubmitted: boolean;
  providerCertificationVerified: boolean;
  certificateFileUrl?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  programTypes: string[];
  description: string;
  attendanceOptions: any;
  exerciseInfo?: string;
  educationInfo?: string;
  programServices: any;
  deliveryTypes: string[];
  deliveryTypeConfigs: any;
  hybridDescription?: string;
  f2fDescription?: string;
  telehealthDescription?: string;
  individualDescription?: string;
  enrollmentInfo: string;
  enrollmentOptions: any;
  interpreterAvailable: string;
  specialConditionsSupport?: string;
  lat?: number;
  lng?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Certificate View Modal Component
const CertificateViewModal = React.memo<{
  service: ServiceData | null;
  isOpen: boolean;
  onClose: () => void;
  onVerify: (serviceId: number, action: 'verify' | 'reject', notes?: string) => void;
  verifying: boolean;
}>(({ service, isOpen, onClose, onVerify, verifying }) => {
  const [verificationNotes, setVerificationNotes] = useState('');
  const [action, setAction] = useState<'verify' | 'reject' | null>(null);

  const handleVerification = (verificationAction: 'verify' | 'reject') => {
    if (service) {
      onVerify(service.id, verificationAction, verificationNotes);
      setVerificationNotes('');
      setAction(null);
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
          {/* Service Information */}
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

          {/* Verification Status */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <Label className="font-medium">Verification Status</Label>
              {getStatusBadge(service.verificationStatus || 'pending')}
            </div>
            
            {/* Certificate File */}
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

            {/* Verification Actions - Only show if pending */}
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

            {/* Show verification info if already processed */}
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

// Address Autocomplete Component (same as before)
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
      placeholder="Enter street address..."
    />
  );
});

AddressAutocomplete.displayName = 'AddressAutocomplete';

// Modal Component for Editing (updated to handle new certification fields)
const EditModal = React.memo<{
  service: ServiceData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<ServiceData>) => void;
  updating: boolean;
  isGoogleLoaded: boolean;
}>(({ service, isOpen, onClose, onSave, updating, isGoogleLoaded }) => {
  const [editData, setEditData] = useState<Partial<ServiceData>>({});

  useEffect(() => {
    if (service) {
      setEditData({ ...service });
    }
  }, [service]);

  const handleSave = () => {
    onSave(editData);
  };

  const handleAddressChange = useCallback((address: string, lat?: number, lng?: number) => {
    setEditData(prev => ({ 
      ...prev, 
      streetAddress: address,
      ...(lat !== undefined && lng !== undefined && { lat, lng })
    }));
  }, []);

  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Edit Service: {service.serviceName}</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={updating}
              className="bg-[#C8102E] hover:bg-grey text-white"
            >
              {updating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
            <Button variant="outline" onClick={onClose} disabled={updating}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="serviceName">Service Name</Label>
              <Input
                id="serviceName"
                value={editData.serviceName || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, serviceName: e.target.value }))}
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
                value={editData.phone || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
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
                onChange={(e) => setEditData(prev => ({ ...prev, fax: e.target.value }))}
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
            
            {/* Provider Certification Status Display (Read-only for admins in edit mode) */}
            <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg">
              <Label className="font-medium mb-2 block">Provider Certification Status</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Submitted:</span>
                  <Badge variant={editData.providerCertificationSubmitted ? 'default' : 'secondary'}>
                    {editData.providerCertificationSubmitted ? 'Yes' : 'No'}
                  </Badge>
                </div>
                {editData.providerCertificationSubmitted && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Status:</span>
                      <Badge 
                        variant="outline" 
                        className={
                          editData.verificationStatus === 'verified' ? 'text-green-600 border-green-300' :
                          editData.verificationStatus === 'rejected' ? 'text-red-600 border-red-300' :
                          'text-amber-600 border-amber-300'
                        }
                      >
                        {editData.verificationStatus === 'verified' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {editData.verificationStatus === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                        {editData.verificationStatus === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                        {editData.verificationStatus || 'Pending'}
                      </Badge>
                    </div>
                    {editData.certificateFileUrl && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Certificate:</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(editData.certificateFileUrl, '_blank')}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          View Certificate
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            
            
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
              <Label htmlFor="isActive">Is the service active?</Label>
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
          
          {/* Rest of the form fields remain the same as in your original code */}
          <div>
            <Label htmlFor="directions">Directions</Label>
            <Textarea
              id="directions"
              value={editData.directions || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, directions: e.target.value }))}
              rows={2}
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={editData.description || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="exerciseInfo">Exercise Info</Label>
            <Textarea
              id="exerciseInfo"
              value={editData.exerciseInfo || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, exerciseInfo: e.target.value }))}
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="educationInfo">Education Info</Label>
            <Textarea
              id="educationInfo"
              value={editData.educationInfo || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, educationInfo: e.target.value }))}
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="enrollmentInfo">Enrollment Info</Label>
            <Textarea
              id="enrollmentInfo"
              value={editData.enrollmentInfo || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, enrollmentInfo: e.target.value }))}
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="hybridDescription">Hybrid Description</Label>
            <Textarea
              id="hybridDescription"
              value={editData.hybridDescription || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, hybridDescription: e.target.value }))}
              rows={2}
            />
          </div>
          
          <div>
            <Label htmlFor="f2fDescription">F2F Description</Label>
            <Textarea
              id="f2fDescription"
              value={editData.f2fDescription || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, f2fDescription: e.target.value }))}
              rows={2}
            />
          </div>
          
          <div>
            <Label htmlFor="telehealthDescription">Telehealth Description</Label>
            <Textarea
              id="telehealthDescription"
              value={editData.telehealthDescription || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, telehealthDescription: e.target.value }))}
              rows={2}
            />
          </div>
          
          <div>
            <Label htmlFor="individualDescription">Individual Description</Label>
            <Textarea
              id="individualDescription"
              value={editData.individualDescription || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, individualDescription: e.target.value }))}
              rows={2}
            />
          </div>
          
          <div>
            <Label htmlFor="specialConditionsSupport">Special Conditions Support</Label>
            <Textarea
              id="specialConditionsSupport"
              value={editData.specialConditionsSupport || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, specialConditionsSupport: e.target.value }))}
              rows={2}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

EditModal.displayName = 'EditModal';

// Updated Table Row Component with verification status
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
      
      case 'description':
      case 'exerciseInfo':
      case 'educationInfo':
      case 'enrollmentInfo':
      case 'hybridDescription':
      case 'f2fDescription':
      case 'telehealthDescription':
      case 'individualDescription':
      case 'specialConditionsSupport':
        return (
          <div className="max-w-xs truncate" title={value}>
            {value}
          </div>
        );
      
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

// Custom hook for debounced search (same as before)
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

const AdminDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [editingService, setEditingService] = useState<ServiceData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  // New states for certificate verification
  const [viewingCertificate, setViewingCertificate] = useState<ServiceData | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Ref for dropdown click outside
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load Google Maps script
  const { isLoaded: isGoogleLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Main columns to show by default
  const mainColumns = useMemo(() => [
    'serviceName',
    'primaryCoordinator',
    'streetAddress',
    'phone',
    'email',
    'programType',
    'createdAt'
  ], []);

  // All available columns (updated with new certification fields)
  const allColumns = useMemo(() => [
    'id',
    'serviceName',
    'website',
    'primaryCoordinator',
    'streetAddress',
    'directions',
    'phone',
    'email',
    'fax',
    'programType',
    'providerCertification',
    'programCertification',
    'providerCertificationSubmitted',
    'verificationStatus',
    'certificateFileUrl',
    'programTypes',
    'description',
    'exerciseInfo',
    'educationInfo',
    'deliveryTypes',
    'hybridDescription',
    'f2fDescription',
    'telehealthDescription',
    'individualDescription',
    'enrollmentInfo',
    'interpreterAvailable',
    'specialConditionsSupport',
    'lat',
    'lng',
    'isActive',
    'createdAt',
    'updatedAt'
  ], []);

  const columnLabels: Record<string, string> = useMemo(() => ({
    id: 'ID',
    serviceName: 'Service Name',
    website: 'Website',
    primaryCoordinator: 'Program Coordinator',
    streetAddress: 'Address',
    directions: 'Directions',
    phone: 'Phone',
    email: 'Email',
    fax: 'Fax',
    programType: 'Type',
    providerCertification: 'Provider Cert (Verified)',
    programCertification: 'Program Cert',
    providerCertificationSubmitted: 'Cert Submitted',
    verificationStatus: 'Verification Status',
    certificateFileUrl: 'Certificate File',
    programTypes: 'Program Types',
    description: 'Description',
    exerciseInfo: 'Exercise Info',
    educationInfo: 'Education Info',
    deliveryTypes: 'Delivery Types',
    hybridDescription: 'Hybrid Description',
    f2fDescription: 'F2F Description',
    telehealthDescription: 'Telehealth Description',
    individualDescription: 'Individual Description',
    enrollmentInfo: 'Enrollment Info',
    interpreterAvailable: 'Interpreter Available',
    specialConditionsSupport: 'Special Conditions',
    lat: 'Latitude',
    lng: 'Longitude',
    isActive: 'Active',
    createdAt: 'Created',
    updatedAt: 'Updated'
  }), []);

  // Initialize selected columns
  useEffect(() => {
    if (activeTab === 'pending') {
      // For pending verification tab, show certification-related columns
      setSelectedColumns([
        'serviceName',
        'primaryCoordinator',
        'email',
        'phone',
        'providerCertificationSubmitted',
        'verificationStatus',
        'certificateFileUrl',
        'createdAt'
      ]);
    } else {
      setSelectedColumns(mainColumns);
    }
  }, [mainColumns, activeTab]);

  // Show Google Maps load error
  useEffect(() => {
    if (loadError) {
      setError('Failed to load Google Maps. Address autocomplete will not work.');
    }
  }, [loadError]);

  // Click outside handler for dropdown
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

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const credentials = btoa(`${loginForm.username}:${loginForm.password}`);
      const response = await fetch('/api/admin/services', {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        setServices(data.services);
        sessionStorage.setItem('adminCredentials', credentials);
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  }, [loginForm]);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setLoginForm({ username: '', password: '' });
    setServices([]);
    setEditingService(null);
    setShowEditModal(false);
    setViewingCertificate(null);
    setShowCertificateModal(false);
    sessionStorage.removeItem('adminCredentials');
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const credentials = sessionStorage.getItem('adminCredentials');
      if (!credentials) {
        setIsAuthenticated(false);
        return;
      }

      const response = await fetch('/api/admin/services', {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setServices(data.services);
      } else {
        setError('Failed to refresh data');
      }
    } catch (err) {
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
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

  // New function to handle provider certification verification
  const handleVerifyProviderCertification = useCallback(async (serviceId: number, action: 'verify' | 'reject', notes?: string) => {
    setVerifying(true);
    try {
      const credentials = sessionStorage.getItem('adminCredentials');
      if (!credentials) {
        setIsAuthenticated(false);
        return;
      }

      const response = await fetch('/api/admin/verify-certification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        body: JSON.stringify({
          serviceId,
          action,
          notes
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update the services list
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
      } else {
        const errorData = await response.json();
        setError(`Failed to ${action} certification: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`Failed to ${action} certification`);
    } finally {
      setVerifying(false);
    }
  }, [handleCloseCertificateModal]);

  const handleSaveService = useCallback(async (editData: Partial<ServiceData>) => {
    if (!editData.website) return;
    
    setUpdating(true);
    try {
      const credentials = sessionStorage.getItem('adminCredentials');
      if (!credentials) {
        setIsAuthenticated(false);
        return;
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
        certification: {
          providerCertification: editData.providerCertification,
          // programCertification: editData.programCertification, // COMMENTED OUT
        },
        // Include provider certification verification fields
        providerCertificationSubmitted: editData.providerCertificationSubmitted,
        providerCertificationVerified: editData.providerCertificationVerified,
        certificateFileUrl: editData.certificateFileUrl,
        verificationStatus: editData.verificationStatus,
        programTypes: editData.programTypes,
        description: editData.description,
        exercise: editData.exerciseInfo,
        education: editData.educationInfo,
        deliveryTypes: editData.deliveryTypes,
        hybridDescription: editData.hybridDescription,
        f2fDescription: editData.f2fDescription,
        telehealthDescription: editData.telehealthDescription,
        individualDescription: editData.individualDescription,
        enrollment: editData.enrollmentInfo,
        interpreterAvailable: editData.interpreterAvailable,
        specialConditionsSupport: editData.specialConditionsSupport,
        lat: editData.lat,
        lng: editData.lng,
        attendanceOptions: editData.attendanceOptions || {},
        programServices: editData.programServices || {},
        enrollmentOptions: editData.enrollmentOptions || {},
        deliveryTypeConfigs: editData.deliveryTypeConfigs || {},
        privacyPolicyAccepted: true
      };

      const encodedWebsite = encodeURIComponent(editData.website);
      const response = await fetch(`/api/1241029013026-service/${encodedWebsite}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        body: JSON.stringify(updatePayload)
      });

      if (response.ok) {
        setServices(prev => prev.map(service => 
          service.id === editingService?.id ? { ...service, ...editData } : service
        ));
        handleCloseModal();
      } else {
        const errorData = await response.json();
        setError(`Failed to update service: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      setError('Failed to update service');
    } finally {
      setUpdating(false);
    }
  }, [editingService, handleCloseModal]);

  // Memoized filtered services with debounced search
  const filteredServices = useMemo(() => {
    let filtered = services;
    
    // Filter by tab
    if (activeTab === 'pending') {
      filtered = services.filter(service => 
        service.providerCertificationSubmitted && service.verificationStatus === 'pending'
      );
    }
    
    // Filter by search term
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
        'serviceName',
        'primaryCoordinator',
        'email',
        'phone',
        'providerCertificationSubmitted',
        'verificationStatus',
        'certificateFileUrl',
        'createdAt'
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

  // Count pending verifications
  const pendingVerificationsCount = useMemo(() => {
    return services.filter(service => 
      service.providerCertificationSubmitted && service.verificationStatus === 'pending'
    ).length;
  }, [services]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <User className="w-6 h-6" />
              Admin Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}
              <Button 
                type="submit" 
                className="w-full bg-[#C8102E] hover:bg-[#A00E26]"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Edit Modal */}
      <EditModal
        service={editingService}
        isOpen={showEditModal}
        onClose={handleCloseModal}
        onSave={handleSaveService}
        updating={updating}
        isGoogleLoaded={isGoogleLoaded}
      />

      {/* Certificate Verification Modal */}
      <CertificateViewModal
        service={viewingCertificate}
        isOpen={showCertificateModal}
        onClose={handleCloseCertificateModal}
        onVerify={handleVerifyProviderCertification}
        verifying={verifying}
      />

      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <Badge variant="outline">{services.length} Total Services</Badge>
            {pendingVerificationsCount > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                {pendingVerificationsCount} Pending Verification
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={refreshData} variant="outline" disabled={loading}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Custom Tab System */}
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

        {/* Tab Content */}
        {activeTab === 'all' && (
          <div className="space-y-4">
            {/* Controls for All Services */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search services..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Column Selector Dropdown */}
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
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="space-y-4">
            {/* Controls for Pending Verification */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search pending verifications..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {pendingVerificationsCount} services awaiting verification
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error Display */}
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

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-scroll max-h-[calc(100vh-400px)]">
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

        {/* Stats */}
        {filteredServices.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {filteredServices.length} of {services.length} services
            {debouncedSearchTerm && ` (filtered by "${debouncedSearchTerm}")`}
            {activeTab === 'pending' && ` • ${pendingVerificationsCount} pending verification`}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;