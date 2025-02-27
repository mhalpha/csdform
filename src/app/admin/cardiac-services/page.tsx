// src/app/admin/cardiac-services/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import debounce from 'lodash/debounce';
import { CardiacService, EditingField } from '@/types/cardiacService';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [services, setServices] = useState<CardiacService[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [alert, setAlert] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<{[key: string]: any}>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      console.log('Fetching services...');
      
      const response = await fetch('/api/cardiac-services');
      const contentType = response.headers.get('content-type');
      
      if (!response.ok) {
        let errorMessage = 'Failed to fetch services';
        
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } else {
          const textError = await response.text();
          errorMessage = textError || errorMessage;
        }
        
        console.error('Error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage
        });
        
        showAlert('error', errorMessage);
        return;
      }

      const data = await response.json();
      console.log('Fetched services:', data);
      
      if (!Array.isArray(data)) {
        console.error('Invalid data format:', data);
        showAlert('error', 'Invalid data format received from server');
        return;
      }

      setServices(data);
      showAlert('success', `Successfully loaded ${data.length} services`);
    } catch (error) {
      console.error('Error fetching services:', error);
      showAlert('error', error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchServices();
  }, [session]);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const startEditing = (index: number, field: string, value: any) => {
    setEditingField({ row: index, field, originalValue: value });
    setPendingChanges({ [field]: value });
  };

  const handleFieldChange = (field: string, value: any) => {
    setPendingChanges(prev => ({ ...prev, [field]: value }));
  };

  const cancelEdit = () => {
    setEditingField(null);
    setPendingChanges({});
  };

  const confirmEdit = async () => {
    if (!editingField) return;
  
    try {
      const service = services[editingField.row];
      const updatedService = { ...service } as CardiacService;
      
      // Update the changed fields
      Object.keys(pendingChanges).forEach(field => {
        if (field.includes('.')) {
          // Handle nested objects (e.g., 'certification.providerCertification')
          const [parent, child] = field.split('.');
          if (parent in updatedService) {
            (updatedService[parent] as any) = {
              ...(updatedService[parent] as any),
              [child]: pendingChanges[field]
            };
          }
        } else {
          if (field in updatedService) {
            updatedService[field] = pendingChanges[field];
          }
        }
      });
  
      const response = await fetch(`/api/cardiac-services/${service.serviceName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedService)
      });
  
      if (!response.ok) throw new Error('Failed to update service');
  
      // Update local state
      const newServices = [...services];
      newServices[editingField.row] = updatedService;
      setServices(newServices);
      
      showAlert('success', 'Service updated successfully');
    } catch (error) {
      showAlert('error', 'Failed to update service');
    } finally {
      setEditingField(null);
      setPendingChanges({});
    }
  };

  const debouncedSearch = debounce((term: string) => {
    setSearchTerm(term.toLowerCase());
  }, 300);

  const filteredServices = services.filter(service => 
    Object.values(service).some(value => 
      String(value).toLowerCase().includes(searchTerm)
    )
  );

  const renderEditableCell = (service: CardiacService, field: string, value: any, index: number) => {
    const isEditing = editingField?.row === index && editingField?.field === field;
    
    if (isEditing) {
      if (typeof value === 'boolean') {
        return (
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={pendingChanges[field] ?? value}
              onCheckedChange={(checked) => handleFieldChange(field, checked)}
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={confirmEdit}>Save</Button>
              <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
            </div>
          </div>
        );
      }
      
      return (
        <div className="space-y-2">
          <Input
            autoFocus
            value={pendingChanges[field] ?? value}
            onChange={(e) => handleFieldChange(field, e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={confirmEdit}>Save</Button>
            <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
          </div>
        </div>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <div 
          className="cursor-pointer hover:bg-gray-100 p-1 rounded"
          onClick={() => startEditing(index, field, value)}
        >
          <Checkbox checked={value} disabled />
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div 
          className="cursor-pointer hover:bg-gray-100 p-1 rounded"
          onClick={() => startEditing(index, field, value)}
        >
          {value.join(', ')}
        </div>
      );
    }

    if (typeof value === 'object' && value !== null) {
      return Object.entries(value).map(([key, val]) => (
        <div key={key} className="text-sm">
          <span className="font-medium">{key}:</span>
          {renderEditableCell(
            service,
            `${field}.${key}`,
            val,
            index
          )}
        </div>
      ));
    }

    return (
      <div 
        className="cursor-pointer hover:bg-gray-100 p-1 rounded"
        onClick={() => startEditing(index, field, value)}
      >
        {value?.toString() || ''}
      </div>
    );
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      {alert && (
        <div className={`fixed top-4 right-4 z-50 ${
          alert.type === 'success' ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'
        } border-l-4 p-4 rounded shadow-lg transition-opacity duration-500`}>
          <p className={alert.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {alert.message}
          </p>
        </div>
      )}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Cardiac Services Administration</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search services..."
            onChange={(e) => debouncedSearch(e.target.value)}
            className="mb-4"
          />
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Service Name</th>
                  <th className="p-2 text-left">Coordinator</th>
                  <th className="p-2 text-left">Contact</th>
                  <th className="p-2 text-left">Program Type</th>
                  <th className="p-2 text-left">Description</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((service, index) => (
                  <tr key={`${service.serviceName}-${index}`} className="border-b hover:bg-gray-50">
                    <td className="p-2">{renderEditableCell(service, 'serviceName', service.serviceName, index)}</td>
                    <td className="p-2">{renderEditableCell(service, 'primaryCoordinator', service.primaryCoordinator, index)}</td>
                    <td className="p-2">
                      {renderEditableCell(service, 'email', service.email, index)}
                      {renderEditableCell(service, 'phone', service.phone, index)}
                    </td>
                    <td className="p-2">{renderEditableCell(service, 'programType', service.programType, index)}</td>
                    <td className="p-2">{renderEditableCell(service, 'description', service.description, index)}</td>
                    <td className="p-2">{renderEditableCell(service, 'silentListing', service.silentListing, index)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}