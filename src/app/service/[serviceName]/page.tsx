'use client'
import React, { useEffect, useState } from 'react';
import { GoogleMap, useLoadScript, MarkerF } from '@react-google-maps/api';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import {
  Phone,
  Mail,
  MapPin,
  Award,
} from "lucide-react";
import Link from 'next/link';

interface ServiceData {
  serviceName: string;
  primaryCoordinator: string;
  streetAddress: string;
  directions: string;
  phone: string;
  email: string;
  fax: string;
  programType: string;
  certification: {
    providerCertification: boolean;
    programCertification: boolean;
  };
  silentListing: boolean;
  description: string;
  attendanceOptions: {
    coronaryHeartDisease: boolean;
    heartFailure: boolean;
    heartRhythmProblems: boolean;
    deviceInsertion: boolean;
    other: boolean;
    otherSpecify: string;
  };
  programServices: {
    exerciseOnly: boolean;
    educationOnly: boolean;
    exerciseAndEducation: boolean;
    other: boolean;
    otherSpecify: string;
  };
  exercise: string;
  education: string;
  deliveryTypes: string[];
  deliveryTypeConfigs: {
    [key: string]: {
      duration: string;
      customDuration?: string;
      frequency: string;
      customFrequency?: string;
    };
  };
  hybridDescription?: string;
  enrollment: string;
  interpreterAvailable: string;
  specialConditionsSupport: string;
  lat: number;
  lng: number;
}

const ServiceMap = React.memo(({ lat, lng, serviceName }: { lat: number; lng: number; serviceName: string }) => {
  const mapOptions = {
    styles: [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }]
      }
    ]
  };

  return (
    <GoogleMap
      zoom={15}
      center={{ lat, lng }}
      mapContainerClassName="w-full h-full"
      options={mapOptions}
    >
      <MarkerF position={{ lat, lng }} title={serviceName} />
    </GoogleMap>
  );
});

ServiceMap.displayName = 'ServiceMap';

const formatAttendanceOptions = (options: ServiceData['attendanceOptions']) => {
  const items = [];
  if (options.coronaryHeartDisease) {
    items.push('People with Coronary heart disease; angina, heart attack, stent, bypass surgery');
  }
  if (options.heartFailure) {
    items.push('Heart failure or cardiomyopathy');
  }
  if (options.heartRhythmProblems) {
    items.push('Heart electrical rhythm problems; e.g. Atrial Fibrillation');
  }
  if (options.deviceInsertion) {
    items.push('People after a device insertion; e.g. Pacemaker, ICD');
  }
  if (options.other && options.otherSpecify) {
    items.push(options.otherSpecify);
  }
  return items.join('\n');
};

const ServiceContent: React.FC<{ serviceData: ServiceData }> = ({ serviceData }) => {
  // Prepare all possible sections
  const sections = [
    // Overview is always full width, so we handle it separately
    {
      id: 'delivery',
      show: serviceData.deliveryTypes.length > 0,
      content: (
        <div>
          <h2 className="text-xl font-bold text-[#1B365D] mb-2">Program Delivery</h2>
          <h3 className="text-lg font-bold text-gray-600 mb-4">Types & Duration</h3>
          <div className="space-y-4">
            {serviceData.deliveryTypes.map(type => (
              serviceData.deliveryTypeConfigs[type] && (
                <div key={type} className="mb-4">
                  <h4 className="font-semibold text-[#1B365D] mb-2">{type}</h4>
                  <div className="pl-4">
                    <p>Duration: {
                      serviceData.deliveryTypeConfigs[type].duration === 'Other' 
                        ? serviceData.deliveryTypeConfigs[type].customDuration 
                        : serviceData.deliveryTypeConfigs[type].duration
                    }</p>
                    <p>Frequency: {
                      serviceData.deliveryTypeConfigs[type].frequency === 'Other'
                        ? serviceData.deliveryTypeConfigs[type].customFrequency
                        : serviceData.deliveryTypeConfigs[type].frequency
                    }</p>
                  </div>
                </div>
              )
            ))}
            {serviceData.hybridDescription && (
              <div className="mt-4 bg-gray-50 p-4 rounded">
                <h4 className="font-semibold text-[#1B365D] mb-2">Hybrid Delivery Details</h4>
                <p className="text-gray-600">{serviceData.hybridDescription}</p>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'attendance',
      show: Boolean(formatAttendanceOptions(serviceData.attendanceOptions)),
      content: (
        <div>
          <h2 className="text-xl font-bold text-[#1B365D] mb-2">Who can attend?</h2>
          <h3 className="text-lg font-bold text-gray-600 mb-4">Eligible Conditions</h3>
          <p className="text-gray-700 whitespace-pre-line">
            {formatAttendanceOptions(serviceData.attendanceOptions)}
          </p>
        </div>
      )
    },
    {
      id: 'enrollment',
      show: Boolean(serviceData.enrollment),
      content: (
        <div>
          <h2 className="text-xl font-bold text-[#1B365D] mb-2">Program Enrollment</h2>
          <h3 className="text-lg font-bold text-gray-600 mb-4">How to Join</h3>
          <p className="text-gray-700">{serviceData.enrollment}</p>
        </div>
      )
    },
    
    {
      id: 'education',
      show: Boolean(serviceData.education),
      content: (
        <div>
          <h2 className="text-xl font-bold text-[#1B365D] mb-2">Education Program</h2>
          <h3 className="text-lg font-bold text-gray-600 mb-4">Educational Components</h3>
          <p className="text-gray-700">{serviceData.education}</p>
        </div>
      )
    },
    
    {
      id: 'exercise',
      show: Boolean(serviceData.exercise),
      content: (
        <div>
          <h2 className="text-xl font-bold text-[#1B365D] mb-2">Exercise Program</h2>
          <h3 className="text-lg font-bold text-gray-600 mb-4">Physical Activities</h3>
          <p className="text-gray-700">{serviceData.exercise}</p>
        </div>
      )
    },
    {
      id: 'interpreter',
      show: Boolean(serviceData.interpreterAvailable),
      content: (
        <div>
          <h2 className="text-xl font-bold text-[#1B365D] mb-2">Language Support</h2>
          <h3 className="text-lg font-bold text-gray-600 mb-4">Interpreter Services</h3>
          <p>{serviceData.interpreterAvailable}</p>
        </div>
      )
    },
    {
      id: 'additional',
      show: Boolean(serviceData.specialConditionsSupport),
      content: (
        <div>
          <h2 className="text-xl font-bold text-[#1B365D] mb-2">Additional Support</h2>
          <h3 className="text-lg font-bold text-gray-600 mb-4">Special Conditions</h3>
          <p className="text-gray-700">{serviceData.specialConditionsSupport}</p>
        </div>
      )
    }
  ];

  // Filter out hidden sections
  const visibleSections = sections.filter(section => section.show);

  // Group sections into rows
  const rows: Array<Array<typeof sections[0]>> = [];
  for (let i = 0; i < visibleSections.length; i += 2) {
    if (i + 1 < visibleSections.length) {
      // If we have two sections, pair them
      rows.push([visibleSections[i], visibleSections[i + 1]]);
    } else {
      // If we have an odd number of sections, the last one goes alone
      rows.push([visibleSections[i]]);
    }
  }

  return (
    <div className="w-full">
      {/* Keep existing style jsx */}
      <style jsx>{`
        .grid-fixed {
          display: grid;
          grid-template-columns: [left] minmax(0, 600px) [center] 1fr [right] minmax(0, 600px);
          max-width: 1600px;
          margin: 0 auto;
          padding: 0 2rem;
          column-gap: 4rem;
        }
        .left-content {
          grid-column: left;
        }
        .right-content {
          grid-column: right;
        }
        .full-width-aligned {
          max-width: 600px;
          margin-left: calc((100% - 1600px) / 2 + 2rem);
          padding-right: 2rem;
        }
        @media (max-width: 1600px) {
          .full-width-aligned {
            margin-left: 2rem;
          }
        }
        @media (max-width: 768px) {
          .grid-fixed {
            grid-template-columns: 1fr;
            padding: 0 1.5rem;
            gap: 3rem;
          }
          .left-content,
          .right-content,
          .full-width-aligned {
            grid-column: auto;
            max-width: 100%;
            margin-left: 0;
            padding-right: 0;
          }
        }
      `}</style>

      {/* Overview Section */}
      {/* Overview Section - Same styling as other sections */}
{serviceData.description && (
  <section className="bg-[#e5eaee] w-full py-12">
    <div className="grid-fixed">
      <div className="left-content">
        <div>
          <h2 className="text-xl font-bold text-[#1B365D] mb-2">Service Overview</h2>
          <h3 className="text-lg font-bold text-gray-600 mb-4">Program Details</h3>
          <p className="text-gray-700">{serviceData.description}</p>
        </div>
      </div>
    </div>
  </section>
)}

      {/* Dynamic Sections */}
      {rows.map((row, rowIndex) => (
        <section 
          key={rowIndex} 
          className={`w-full py-12 ${rowIndex % 2 === 1 ? 'bg-[#e5eaee]' : ''}`}
        >
          <div className="grid-fixed">
            {row.map((section, index) => (
              <div 
                key={section.id} 
                className={index === 0 ? 'left-content' : 'right-content'}
              >
                {section.content}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

const ServicePage = () => {
  const params = useParams();
  const [serviceData, setServiceData] = useState<ServiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: 'AIzaSyAm-eP8b7-FH2A8nzYucTG9NcPTz0OiAX0',
    id: 'google-map-script'
  });

  useEffect(() => {
    const fetchServiceData = async () => {
      if (!params?.serviceName) return;

      try {
        const decodedName = decodeURIComponent(String(params.serviceName));
        const encodedServiceName = encodeURIComponent(decodedName);
        const response = await axios.get(`/api/1241029013026-service/${encodedServiceName}`);
        setServiceData(response.data);
      } catch (error) {
        setError('Service not found or error loading service information.');
        console.error('Error fetching service:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServiceData();
  }, [params?.serviceName]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !serviceData) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-500">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative">
        <div className="bg-[#C8102E] relative overflow-hidden">
          <div className="container mx-auto px-4 py-8 lg:py-12 relative z-10">
            <div className="lg:w-1/2">
              <h1 className="text-white text-3xl lg:text-4xl font-bold mb-4">
                {serviceData.serviceName}
              </h1>
              <div className="inline-flex bg-[#1B365D] text-white px-4 py-1 rounded-full text-sm mb-6">
                {serviceData.programType}
              </div>
              <div className="space-y-3 text-white">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5" />
                  <span>{serviceData.streetAddress}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5" />
                  <span>{serviceData.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5" />
                  <span>{serviceData.email}</span>
                </div>
                {serviceData.certification.providerCertification && (
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5" />
                    <span>ACRA/ICCPR Certified</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {isLoaded && serviceData.lat && serviceData.lng && (
            <div className="absolute right-0 top-0 w-1/2 h-full hidden lg:block">
              <ServiceMap
                lat={serviceData.lat}
                lng={serviceData.lng}
                serviceName={serviceData.serviceName}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <ServiceContent serviceData={serviceData} />

      {/* Footer */}
      <footer className="bg-[#C8102E] py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <Link href="#" className="text-white hover:text-gray-200">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </Link>
              <Link href="#" className="text-white hover:text-gray-200">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ServicePage;