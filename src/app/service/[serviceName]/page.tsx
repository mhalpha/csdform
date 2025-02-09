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
  attendance: string;
  exercise: string;
  education: string;
  deliveryType: string;
  hybridDescription?: string;
  enrollment: string;
  interpreterAvailable: boolean;
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
      <MarkerF
        position={{ lat, lng }}
        title={serviceName}
      />
    </GoogleMap>
  );
});

ServiceMap.displayName = 'ServiceMap';

const StyledCard = ({ children }: { children: React.ReactNode }) => (
  <Card style={{ backgroundColor: '#f2f1f0' }} className="shadow-sm">
    {children}
  </Card>
);



const ServicePage = () => {
  const params = useParams();
  const [serviceData, setServiceData] = useState<ServiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: 'AIzaSyAm-eP8b7-FH2A8nzYucTG9NcPTz0OiAX0',
    // Add this to prevent multiple loads
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
        <StyledCard>
          <CardContent className="p-6">
            <div className="text-center text-red-500">{error}</div>
          </CardContent>
        </StyledCard>
      </div>
    );
  }
 

  return (

    
    <div className="min-h-screen bg-white">
         {/* Header Logo */}
   
         {/* Hero Section */}
    <div className="relative">
    <div className="bg-[#C8102E] relative overflow-hidden">
    <div className="container mx-auto px-4 py-8 lg:py-12 relative z-10">
    <div className="lg:w-1/2">
    <h1 className="text-white text-3xl lg:text-4xl font-bold mb-4">
                   {serviceData.serviceName}
    </h1>
                 {/* Service Badge */}
    <div className="inline-flex bg-[#1B365D] text-white px-4 py-1 rounded-full text-sm mb-6">
                   {serviceData.programType}
    </div>
                 {/* Contact Details */}
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
    <span>ACRA/ICCPR</span>
    </div>
                   )}
    </div>
    </div>
    </div>
             {/* Map Overlay */}
             {isLoaded && serviceData.lat && serviceData.lng && (
    <div className="absolute right-0 top-0 w-1/2 h-full hidden lg:block">
    <ServiceMap
                   lat={serviceData.lat}
                   lng={serviceData.lng}
                   serviceName={serviceData.serviceName}
                 />
    </div>
             )}
             {/* Curved Shape */}
    
    </div>
    </div>
         {/* Main Content */}
         <div className="w-full">
<style jsx>{`
   .grid-fixed {
     display: grid;
     grid-template-columns: [left] minmax(0, 600px) [center] 1fr [right] minmax(0, 600px);
     max-width: 1600px;
     margin: 0 auto;
     padding: 0 2rem;
     column-gap: 4rem; // Increased space between columns
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
 {/* Service Overview */}
<section className="bg-[#e5eaee] w-full py-12">
<div className="full-width-aligned">
<h2 className="text-xl font-bold mb-4">Service Overview</h2>
<p className="text-gray-700">{serviceData.description}</p>
</div>
</section>
 {/* Two Column Sections */}
<section className="w-full py-12">
<div className="grid-fixed">
<div className="left-content">
<h2 className="text-xl font-bold text-[#1B365D] mb-4">Who can attend?</h2>
<p className="text-gray-700">{serviceData.attendance}</p>
</div>
<div className="right-content">
<h2 className="text-xl font-bold text-[#1B365D] mb-4">Type of delivery & Duration</h2>
<div className="space-y-2">
<div>• {serviceData.deliveryType}</div>
         {serviceData.hybridDescription && (
<div className="text-gray-600">{serviceData.hybridDescription}</div>
         )}
</div>
</div>
</div>
</section>
 {/* Education & Exercise Section */}
<section className="bg-[#e5eaee]  w-full py-12">
<div className="grid-fixed">
<div className="left-content">
<h2 className="text-xl font-bold text-[#1B365D] mb-4">Education</h2>
<p className="text-gray-700">{serviceData.education}</p>
</div>
<div className="right-content">
<h2 className="text-xl font-bold text-[#1B365D] mb-4">Exercise</h2>
<p className="text-gray-700">{serviceData.exercise}</p>
</div>
</div>
</section>
 {/* Enrolment Section */}
<section className="w-full py-12">
<div className="full-width-aligned">
<h2 className="text-xl font-bold text-[#1B365D] mb-4">How do I enrol in the program?</h2>
<p className="text-gray-700">{serviceData.enrollment}</p>
</div>
</section>
 {/* Additional Info Section */}
<section className="bg-[#e5eaee] w-full py-12">
<div className="grid-fixed">
<div className="left-content">
<h2 className="text-xl font-bold text-[#1B365D] mb-4">Interpreter Services?</h2>
<p>{serviceData.interpreterAvailable ? 'Yes' : 'No'}</p>
</div>
<div className="right-content">
<h2 className="text-xl font-bold text-[#1B365D] mb-4">Support for specific conditions</h2>
<p className="text-gray-700">{serviceData.specialConditionsSupport}</p>
</div>
</div>
</section>
</div>
         {/* Footer */}
    <footer className="bg-[#C8102E] py-8">
    <div className="container mx-auto px-4">
    <div className="flex justify-between items-center">
   
    <div className="flex gap-4">
    <Link href="#" className="text-white">
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
    </svg>
    </Link>
    <Link href="#" className="text-white">
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
    </svg>
    </Link>
    <Link href="#" className="text-white">
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