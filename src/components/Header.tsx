// src/components/Header.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Header() {

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
         
            <Image 
              src="/logo.jpg" 
              alt="National Heart Foundation Logo" 
              width={150} 
              height={40} 
              priority
            />
          
        </div>
      </div>
    </header>
  );
}