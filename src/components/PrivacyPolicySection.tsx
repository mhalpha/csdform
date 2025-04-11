import React from 'react';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";


export const PrivacyPolicySection: React.FC<{ formik: any }> = ({ formik }) => {
  return (
    <div className="space-y-4">
      <div className="border p-4 bg-slate-50 rounded-md">
        <Label className="font-semibold block mb-2">Privacy Statement *</Label>
        <div className="text-sm space-y-2">
          <p>
            Your Service Information is being collected by the National Heart Foundation of Australia ABN 98 008 419 761 
            (Heart Foundation, we, us, our) to provide our Cardiac Service Directory and for other purposes as set out 
            in our Privacy Policy. This service information collected will be published directly in the public domain on 
            our Cardiac Services Directory. The Heart Foundation does not edit or change the information you provide.
          </p>
          <p>
            We will also share the published service information you provide us to ACRA - Australian Cardiovascular 
            Health and Rehabilitation Association to support advocacy.
          </p>
          <p>
            If you have any questions on our Cardiac Service Directory email servicesdirectory@heartfoundation.org.au
          </p>
          <p>
            If you have any questions about this privacy collection statement or how we handle personal information, 
            please contact our Privacy Officer via GPO Box 9966 in your capital city, privacy@heartfoundation.org.au 
            or by calling 13 11 12.
          </p>
        </div>
      </div>

      <div className="flex items-start space-x-2">
        <Checkbox
          id="privacyPolicyAccepted"
          checked={formik.values.privacyPolicyAccepted}
          onCheckedChange={(checked) => {
            formik.setFieldValue('privacyPolicyAccepted', checked);
          }}
        />
        <Label htmlFor="privacyPolicyAccepted" className="text-sm">
          I have read and accept the Privacy Statement *
        </Label>
      </div>
      {formik.touched.privacyPolicyAccepted && formik.errors.privacyPolicyAccepted && (
        <div className="text-red-500 text-sm">{formik.errors.privacyPolicyAccepted}</div>
      )}
    </div>
  );
};

export default PrivacyPolicySection;