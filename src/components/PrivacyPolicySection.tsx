// components/PrivacyPolicySection.tsx
import React from 'react';
import { Controller } from 'react-hook-form';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const PrivacyPolicySection: React.FC<{ methods: any }> = ({ methods }) => {
  const { control, setValue, formState: { errors } } = methods;
  
  // The text that will be stored in the database when checkbox is checked
  const privacyStatementText = `Heart Foundation Privacy Statement Accepted: Your Service Information is being collected by the National Heart Foundation of Australia ABN 98 008 419 761 (Heart Foundation, we, us, our) to provide our Cardiac Service Directory and for other purposes as set out in our Privacy Policy. This service information collected will be published directly in the public domain on our Cardiac Services Directory. Heart Foundation does not edit or change the information you provide; however, we may contact you from time to time to request you review and update the details provided. We will also share the published service information you provide us to ACRA - Australian Cardiovascular Health and Rehabilitation Association to support Heart Health advocacy. Contact: servicesdirectory@heartfoundation.org.au or privacy@heartfoundation.org.au or 13 11 12.`;

  const handlePrivacyAcceptanceChange = (checked: boolean | 'indeterminate') => {
    setValue('privacyPolicyAccepted', checked);
    
    // When checked, store the privacy statement text in the database field
    // When unchecked, clear the field
    if (checked) {
      setValue('privacyStatement', privacyStatementText);
    } else {
      setValue('privacyStatement', '');
    }
  };

  return (
    <div className="space-y-4">
      <div className="border p-4 bg-slate-50 rounded-md">
        <Label className="font-semibold block mb-2">Privacy Collection Notice – Services Directory *</Label>
        <div className="text-sm space-y-2">
          <p>
            Your Service Information is being collected by the National Heart Foundation of Australia ABN 98 008 419 761 
            (Heart Foundation, we, us, our) to provide our{" "}
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
            . This service information collected will be published directly in the public domain on our{" "}
            <a 
              href="https://www.heartfoundation.org.au/your-heart/cardiac-services-directory" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Cardiac Services Directory
            </a>
            . Heart Foundation does not edit or change the information you provide; however, we may contact you from time to time to request you review and update the details provided.
          </p>
          <p>
            We will also share the published service information you provide us to ACRA - Australian Cardiovascular 
            Health and Rehabilitation Association to support Heart Health advocacy.
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
            If you have any questions about this privacy collection statement or how we handle personal information, 
            please contact our Privacy Officer via GPO Box 9966 in your capital city,{" "}
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
              onCheckedChange={(checked) => {
                field.onChange(checked);
                handlePrivacyAcceptanceChange(checked);
              }}
            />
          )}
        />
        <Label htmlFor="privacyPolicyAccepted" className="text-sm">
          I have read and accept the Privacy Statement *
        </Label>
      </div>
      {errors.privacyPolicyAccepted && (
        <div className="text-red-500 text-sm">{errors.privacyPolicyAccepted.message}</div>
      )}
    </div>
  );
};

export default PrivacyPolicySection;