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
  BicepsFlexed,
  Languages,
  LogIn,
  CalendarDays,
  BadgeInfo,
  User,
} from "lucide-react";
import Link from 'next/link';
import Image from 'next/image'

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
  f2fDescription?: string;
  telehealthDescription?: string;
  individualDescription?: string;
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
    disableDefaultUI: true,
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
  
  const otherSections = [];
  if (serviceData.directions) {
    otherSections.push({
      id: 'directions',
      title: 'Directions',
      icon: <Navigation className="w-6 h-6 mr-2 text-[#1B365D]" />,
      content: <p className="text-gray-700">{serviceData.directions}</p>
    });
  }
  if (formatAttendanceOptions(serviceData.attendanceOptions).length > 0) {
    otherSections.push({
      id: 'attendance',
      title: 'Who can attend?',
      icon: <Users className="w-6 h-6 mr-2 text-[#1B365D]" />,
      content: (
        <ul className="list-disc pl-5 space-y-2">
          {formatAttendanceOptions(serviceData.attendanceOptions).map((item, index) => (
            <li key={index} className="text-gray-700">{item}</li>
          ))}
        </ul>
      )
    });
  }
  if (serviceData.education) {
    otherSections.push({
      id: 'education',
      title: 'Education Program',
      icon: <BookOpen className="w-6 h-6 mr-2 text-[#1B365D]" />,
      content: <p className="text-gray-700">{serviceData.education}</p>
    });
  }
  if (serviceData.exercise) {
    otherSections.push({
      id: 'exercise',
      title: 'Exercise Program',
      icon: <BicepsFlexed className="w-6 h-6 mr-2 text-[#1B365D]" />,
      content: <p className="text-gray-700">{serviceData.exercise}</p>
    });
  }

  if (Boolean(serviceData.enrollment) ||
    (serviceData.enrollmentOptions && Object.values(serviceData.enrollmentOptions).some(val => val === true))) {
    otherSections.push({
      id: 'enrollment',
      title: 'How Do I Enrol?',
      icon: <LogIn className="w-6 h-6 mr-2 text-[#1B365D]" />,
      content: (
        <>
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
        </>
      )
    });
  }

  if (serviceData.specialConditionsSupport) {
    otherSections.push({
      id: 'moreInfo',
      title: 'More Information',
      icon: <BadgeInfo className="w-6 h-6 mr-2 text-[#1B365D]" />,
      content: <p className="text-gray-700">{serviceData.specialConditionsSupport}
      </p>
    });
  }

  if (serviceData.interpreterAvailable) {
    otherSections.push({
      id: 'interpreter',
      title: 'Interpreter Services',
      icon: <Languages className="w-6 h-6 mr-2 text-[#1B365D]" />,
      content: <p className="text-gray-700 font-medium">
        {serviceData.interpreterAvailable === 'Yes' ? 'Yes' : 'No'}
      </p>
    });
  }
  
  const programInformationSection = serviceData.description && (
    <div>
      <h2 className="text-xl font-bold text-[#1B365D] mb-4 flex items-center">
        <Info className="w-6 h-6 mr-2 text-[#1B365D]" />
        Program Information
      </h2>
      <p className="text-gray-700">{serviceData.description}</p>
    </div>
  );
  
 
  const programDeliverySection = serviceData.deliveryTypes.length > 0 && (
    <div>
      <h2 className="text-xl font-bold text-[#1B365D] mb-4 flex items-center">
        <CalendarDays className="w-6 h-6 mr-2 text-[#1B365D]" />
        Program Delivery
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
      
        {serviceData.deliveryTypes.map((type, index) => (
          serviceData.deliveryTypeConfigs[type] && (
            <React.Fragment key={type}>
              <div className="p-4 rounded-lg">
                <h4 className="font-semibold text-[#1B365D] mb-2">
                  {type === 'F2F Group' ? 'Face to face group program' :
                    type === 'Telehealth' ? 'Telehealth program (via phone/internet)' :
                      type === '1:1' ? 'Individual program' :
                        type === 'Hybrid' ? 'Hybrid program (including face to face/individual and telehealth delivery)' :
                          type}
                </h4>
                <div className="space-y-3">
                  <p className="font-medium">Program Length: {
                    serviceData.deliveryTypeConfigs[type].duration === 'Other'
                      ? serviceData.deliveryTypeConfigs[type].customDuration
                      : serviceData.deliveryTypeConfigs[type].duration
                  }</p>
                  {serviceData.deliveryTypeConfigs[type].schedule && (
                    <div className="mt-3">
                      <p className="font-medium">Schedule:</p>
                      <div className="mt-2 space-y-2">
                        {Object.entries(serviceData.deliveryTypeConfigs[type].schedule || {}).map(([day, timeInfo]) => (
                          <div key={day} className="flex flex-wrap items-start">
                            <span className="font-medium w-24 min-w-24 mr-2">{day}:</span>
                            <span className="flex-1">
                              {timeInfo.startHour}:{timeInfo.startMinute} {timeInfo.startAmPm} –
                              {timeInfo.endHour}:{timeInfo.endMinute} {timeInfo.endAmPm}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
         
                {type === 'F2F Group' && serviceData.f2fDescription && (
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                    <p className="text-gray-700">{serviceData.f2fDescription}</p>
                  </div>
                )}
                {type === 'Telehealth' && serviceData.telehealthDescription && (
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                    <p className="text-gray-700">{serviceData.telehealthDescription}</p>
                  </div>
                )}
                {type === '1:1' && serviceData.individualDescription && (
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                    <p className="text-gray-700">{serviceData.individualDescription}</p>
                  </div>
                )}
                {type === 'Hybrid' && serviceData.hybridDescription && (
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                    <p className="text-gray-700">{serviceData.hybridDescription}</p>
                  </div>
                )}
              </div>
              
   
              {(index + 1) % 2 !== 0 && index !== serviceData.deliveryTypes.length - 1 && (
                <div className="hidden md:block absolute h-4/5 w-px bg-gray-200 top-1/2 -translate-y-1/2"
                  style={{ left: 'calc(50% - 3px)' }}></div>
              )}
            </React.Fragment>
          )
        ))}
      </div>
    </div>
  );
  
  return (
    <div className="w-full">
      {/* Program Information Section */}
      {programInformationSection && (
        <section className="bg-[#e5eaee] w-full py-12">
          <div className="container mx-auto max-w-7xl px-4">
            {programInformationSection}
          </div>
        </section>
      )}
      
      {otherSections.length > 0 && (
        <section className="w-full py-12 bg-gray-50">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative overflow-hidden">
              {otherSections.map((section, index) => (
                <React.Fragment key={section.id}>
                  <div className="p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-[#1B365D] mb-3 flex items-center">
                      {section.icon}
                      {section.title}
                    </h3>
                    <div>{section.content}</div>
                  </div>
             
                  {(index + 1) % 3 !== 0 && index !== otherSections.length - 1 && (
                    <div
                      className="hidden lg:block absolute h-4/5 w-px bg-gray-200"
                      style={{
                        top: '50%',
                        transform: 'translateY(-50%)',
                        left: `calc(${(100 / 3) * (index % 3 + 1)}% - ${(index % 3 + 1) * 3}px)`
                      }}
                    ></div>
                  )}

                  {(index + 1) % 2 !== 0 && index !== otherSections.length - 1 && (
                    <div
                      className="hidden md:block lg:hidden absolute h-4/5 w-px bg-gray-200"
                      style={{
                        top: '50%',
                        transform: 'translateY(-50%)',
                        left: 'calc(50% - 3px)'
                      }}
                    ></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>
      )}

      {programDeliverySection && (
        <section className="w-full py-12 bg-white">
          <div className="container mx-auto max-w-7xl px-4">
            {programDeliverySection}
          </div>
        </section>
      )}
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
      // IMPORTANT: Changed from params?.serviceName to params?.website
      if (!params?.website) return;

      try {
        // Changed parameter name from serviceName to website
        const decodedWebsite = decodeURIComponent(String(params.website));
        const encodedWebsite = encodeURIComponent(decodedWebsite);
        
        // Use the website parameter to fetch service data
        const response = await axios.get(`/api/1241029013026-service/${encodedWebsite}`);
        setServiceData(response.data);
      } catch (error) {
        setError('Service not found or error loading service information.');
        console.error('Error fetching service:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServiceData();
  }, [params?.website]); // Changed dependency to params?.website

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
      <div className="relative bg-[#C8102E]">
        <div className="overflow-hidden">
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
                  <Link 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(serviceData.streetAddress)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {serviceData.streetAddress}
                  </Link>
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
                  <Link 
                    href={`mailto:${serviceData.email}`} 
                    className="hover:underline"
                  >
                    {serviceData.email}
                  </Link>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 flex-shrink-0" />
                  <Link 
                    href={`tel:${serviceData.phone.replace(/[^\d+]/g, '')}`} 
                    className="hover:underline"
                  >
                    {serviceData.phone}
                  </Link>
                </div>

                {/* Certification */}
                
                {serviceData.certification.providerCertification && (
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 flex-shrink-0" />
                    <span>ACRA/ICCPR Provider Certified</span>
                  </div>
                )}
                {serviceData.certification.programCertification && (
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 flex-shrink-0" />
                    <span>ACRA/ICCPR Program Certified</span>
                  </div>
                )}
              </div>
            </div>
            <div className="hidden lg:block">
              <svg viewBox="0 0 738 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute z-[-1] w-full h-full top-0 left-[-200px]">
                <path d="M613.397 -45.2247C601.156 -80.9209 578.473 -122.228 559.09 -147.896C532.207 -184.846 490.622 -221.975 458.098 -239.465C407.812 -269.729 347.565 -278.564 316.361 -277.967C247.353 -278.265 191.666 -255.224 175.464 -248.18C47.0484 -192.188 -17.9995 -72.2655 -22.5 -63.7295C-27.0005 -72.2655 -92.0484 -192.188 -220.464 -248.18C-236.606 -255.224 -292.293 -278.205 -361.301 -277.967C-392.505 -278.623 -452.692 -269.729 -503.038 -239.524C-535.502 -222.035 -577.087 -184.906 -604.03 -147.956C-623.473 -122.288 -646.096 -80.921 -658.337 -45.2844C-662.297 -33.7637 -682.04 19.124 -683 91.4716C-682.76 124.541 -680.36 209.066 -628.033 318.244C-607.451 361.104 -577.507 413.991 -533.162 472.49C-496.977 521.14 -453.592 570.088 -425.629 599.695C-383.024 645.241 -313.115 712.455 -256.228 762.716C-221.244 793.756 -152.956 852.554 -110.771 887.952C-71.3459 921.618 -36.0616 951.882 -23.3401 962.627V964C-23.3401 964 -22.8 963.522 -22.5 963.343C-22.26 963.582 -21.9 963.821 -21.6599 964V962.627C-8.93835 951.942 26.3459 921.618 65.7707 887.952C107.956 852.554 176.244 793.697 211.228 762.716C268.175 712.455 338.084 645.241 380.629 599.695C408.592 570.088 451.917 521.199 488.162 472.49C532.507 414.051 562.451 361.163 583.033 318.244C635.36 209.066 637.76 124.541 638 91.4716C637.1 19.124 617.357 -33.7637 613.337 -45.2844" fill="#C8102E"></path>
              </svg>
            </div>
          </div>
          {isLoaded && serviceData.lat && serviceData.lng && (
            <div className="absolute right-0 top-0 w-2/3 h-full hidden lg:block -z-2">
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