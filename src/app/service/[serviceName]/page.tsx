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
  Info,
  Navigation,
  Users,
  BookOpen,
  Activity,
  Headphones,
  LogIn,
  CalendarDays,
  User,
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
      schedule?: {
        [day: string]: {
          startHour: string;
          startMinute: string;
          startAmPm: string;
          endHour: string;
          endMinute: string;
          endAmPm: string;
        }
      }
    };
  };
  hybridDescription?: string;
  enrollment: string;
  enrollmentOptions: {
    selfReferral: boolean;
    gpReferral: boolean;
    hospitalReferral: boolean;
    other: boolean;
    otherSpecify: string;
    notAcceptingReferrals: boolean;
  };
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
    ],
    // Disable the UI controls
    disableDefaultUI: true,
    // Alternatively, you can enable only specific controls if needed
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true
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
    items.push('Coronary heart disease; angina, heart attack, stent, bypass surgery');
  }
  if (options.heartFailure) {
    items.push('Heart Failure or cardiomyopathy');
  }
  if (options.heartRhythmProblems) {
    items.push('Heart electrical rhythm conditions e.g. Atrial fibrillation');
  }
  if (options.deviceInsertion) {
    items.push('People after a device insertion; e.g. Pacemaker, ICD (Implantable Cardioverter Defibrillator)');
  }
  if (options.other && options.otherSpecify) {
    items.push(options.otherSpecify);
  }
  return items;
};

const ServiceContent: React.FC<{ serviceData: ServiceData }> = ({ serviceData }) => {
  // Create section components for reuse
  const programInformationSection = serviceData.description && (
    <div>
      <h2 className="text-xl font-bold text-[#1B365D] mb-4 flex items-center">
        <Info className="w-6 h-6 mr-2 text-[#1B365D]" />
        Program Information
      </h2>
      <p className="text-gray-700">{serviceData.description}</p>
    </div>
  );

  const directionsSection = serviceData.directions && (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-[#1B365D] mb-4 flex items-center">
        <Navigation className="w-6 h-6 mr-2 text-[#1B365D]" />
        Directions
      </h2>
      <p className="text-gray-700">{serviceData.directions}</p>
    </div>
  );

  const attendanceSection = formatAttendanceOptions(serviceData.attendanceOptions).length > 0 && (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-[#1B365D] mb-4 flex items-center">
        <Users className="w-6 h-6 mr-2 text-[#1B365D]" />
        Who can attend?
      </h2>
      <ul className="list-disc pl-5 space-y-2">
        {formatAttendanceOptions(serviceData.attendanceOptions).map((item, index) => (
          <li key={index} className="text-gray-700">{item}</li>
        ))}
      </ul>
    </div>
  );

  const educationSection = Boolean(serviceData.education) && (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-[#1B365D] mb-4 flex items-center">
        <BookOpen className="w-6 h-6 mr-2 text-[#1B365D]" />
        Education Program
      </h2>
      <p className="text-gray-700">{serviceData.education}</p>
    </div>
  );

  const exerciseSection = Boolean(serviceData.exercise) && (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-[#1B365D] mb-4 flex items-center">
        <Activity className="w-6 h-6 mr-2 text-[#1B365D]" />
        Exercise Program
      </h2>
      <p className="text-gray-700">{serviceData.exercise}</p>
    </div>
  );

  const interpreterSection = Boolean(serviceData.interpreterAvailable) && (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-[#1B365D] mb-4 flex items-center">
        <Headphones className="w-6 h-6 mr-2 text-[#1B365D]" />
        Interpreter Services
      </h2>
      <p className="text-gray-700 font-medium">
        {serviceData.interpreterAvailable === 'Yes' ? 'Yes' : 'No'}
      </p>
    </div>
  );

  const enrollmentSection = (Boolean(serviceData.enrollment) || 
    (serviceData.enrollmentOptions && Object.values(serviceData.enrollmentOptions).some(val => val === true))) && (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-[#1B365D] mb-4 flex items-center">
        <LogIn className="w-6 h-6 mr-2 text-[#1B365D]" />
        How Do I Enroll?
      </h2>
      
      {serviceData.enrollmentOptions?.notAcceptingReferrals ? (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
          <p className="font-medium text-amber-700">Currently not accepting external referrals</p>
        </div>
      ) : (
        <ul className="list-disc pl-5 space-y-2">
          {serviceData.enrollmentOptions?.selfReferral && (
            <li className="text-gray-700">Self-referral</li>
          )}
          
          {serviceData.enrollmentOptions?.gpReferral && (
            <li className="text-gray-700">General Practitioner (GP) referral</li>
          )}
          
          {serviceData.enrollmentOptions?.hospitalReferral && (
            <li className="text-gray-700">Hospital referral</li>
          )}
          
          {serviceData.enrollmentOptions?.other && serviceData.enrollmentOptions?.otherSpecify && (
            <li className="text-gray-700">{serviceData.enrollmentOptions.otherSpecify}</li>
          )}
        </ul>
      )}
    </div>
  );

  const programDeliverySection = serviceData.deliveryTypes.length > 0 && (
    <div>
     <h2 className="text-xl font-bold text-[#1B365D] mb-4 flex items-center">
  <CalendarDays className="w-6 h-6 mr-2 text-[#1B365D]" />
  Program Delivery
</h2>
<h3 className="text-lg font-bold text-gray-600 mb-4">Type and Time of Program</h3>
      <div className="space-y-4">
        {serviceData.deliveryTypes.map(type => (
          serviceData.deliveryTypeConfigs[type] && (
            <div key={type} className="mb-6">
              <h4 className="font-semibold text-[#1B365D] mb-2">
                {type === 'F2F Group' ? 'Face to face group program' : 
                 type === 'Telehealth' ? 'Telehealth program (via phone/internet)' :
                 type === '1:1' ? 'Individual program' :
                 type === 'Hybrid' ? 'Hybrid program (including face to face/individual and telehealth delivery)' :
                 type}
              </h4>
              <div className="pl-4 space-y-3">
                <p className="font-medium">Program Length: {
                  serviceData.deliveryTypeConfigs[type].duration === 'Other' 
                    ? serviceData.deliveryTypeConfigs[type].customDuration 
                    : serviceData.deliveryTypeConfigs[type].duration
                }</p>
                
                {serviceData.deliveryTypeConfigs[type].schedule && (
                  <div className="mt-3">
                    <p className="font-medium">Schedule:</p>
                    <div className="ml-4 mt-2 space-y-2">
                      {Object.entries(serviceData.deliveryTypeConfigs[type].schedule || {}).map(([day, timeInfo]) => (
                        <div key={day} className="flex flex-wrap items-center">
                          <span className="font-medium w-20">{day}:</span>
                          <span>
                            {timeInfo.startHour}:{timeInfo.startMinute} {timeInfo.startAmPm} – 
                            {timeInfo.endHour}:{timeInfo.endMinute} {timeInfo.endAmPm}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
  );

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

        @media (max-width: 768px) {
          .grid-fixed {
            grid-template-columns: 1fr;
            padding: 0 1.5rem;
            gap: 3rem;
          }
          .left-content,
          .right-content {
            grid-column: auto;
            max-width: 100%;
          }
          .mobile-order-1 {
            order: 1;
          }
          .mobile-order-2 {
            order: 2;
          }
        }
      `}</style>

      {/* Program Information Section (formerly Overview) */}
      {programInformationSection && (
        <section className="bg-[#e5eaee] w-full py-12">
          <div className="grid-fixed">
            <div className="left-content">
              {programInformationSection}
            </div>
          </div>
        </section>
      )}

      {/* Main content section with two columns */}
      <section className="w-full py-12">
        <div className="grid-fixed">
          {/* Left column with multiple sections */}
          <div className="left-content mobile-order-2">
            {directionsSection}
            {attendanceSection}
            {educationSection}
            {exerciseSection}
            {interpreterSection}
            {enrollmentSection}
          </div>
          
          {/* Right column with Program Delivery */}
          <div className="right-content mobile-order-1">
            {programDeliverySection}
          </div>
        </div>
      </section>
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
                {/* Address */}
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 flex-shrink-0" />
                  <span>{serviceData.streetAddress}</span>
                </div>
                
                {/* Program Coordinator */}
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 flex-shrink-0" />
                  <span>
                    <span className="opacity-80">Program Coordinator:</span> {serviceData.primaryCoordinator}
                  </span>
                </div>
                
                {/* Email */}
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 flex-shrink-0" />
                  <span>{serviceData.email}</span>
                </div>
                
                {/* Phone */}
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 flex-shrink-0" />
                  <span>{serviceData.phone}</span>
                </div>
                
                {/* Certification */}
                {(serviceData.certification.providerCertification || serviceData.certification.programCertification) && (
  <div className="flex items-center gap-3">
    <Award className="w-5 h-5 flex-shrink-0" />
    <span>
      {serviceData.certification.providerCertification && serviceData.certification.programCertification
        ? "ACRA/ICCPR Certified"
        : serviceData.certification.providerCertification
          ? "ACRA Certified"
          : "ICCPR Certified"
      }
    </span>
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
    </div>
  );
};

export default ServicePage;