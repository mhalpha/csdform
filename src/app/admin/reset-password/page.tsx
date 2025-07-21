// src/app/admin/reset-password/page.tsx
'use client'
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Eye, 
  EyeOff, 
  Lock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft
} from "lucide-react";

// Component that uses useSearchParams - wrapped in Suspense
const PasswordResetContent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setResetToken(token);
      setIsValidToken(true);
    } else {
      setMessage({ 
        type: 'error', 
        text: 'Invalid reset link. Please request a new password reset.' 
      });
      setIsValidToken(false);
    }
  }, [searchParams]);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 8000);
  };

  const validatePasswordStrength = (password: string): { valid: boolean; message: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/(?=.*\d)/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character (@$!%*?&)' };
    }
    return { valid: true, message: 'Password is strong' };
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetToken) {
      showMessage('error', 'Invalid reset token');
      return;
    }

    if (!formData.newPassword || !formData.confirmPassword) {
      showMessage('error', 'Please fill in all fields');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showMessage('error', 'Passwords do not match');
      return;
    }

    const passwordValidation = validatePasswordStrength(formData.newPassword);
    if (!passwordValidation.valid) {
      showMessage('error', passwordValidation.message);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset',
          resetToken: resetToken,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `${data.message} Redirecting to login...` 
        });
        
        // Clear form
        setFormData({ newPassword: '', confirmPassword: '' });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/admin');
        }, 3000);
      } else {
        showMessage('error', data.message || 'Failed to reset password');
        
        // If token is invalid/expired, offer to go back to login
        if (response.status === 400 && data.message.includes('Invalid or expired')) {
          setIsValidToken(false);
        }
      }
    } catch (err) {
      showMessage('error', 'Network error occurred. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    router.push('/admin');
  };

  const PasswordStrengthIndicator: React.FC<{ password: string }> = ({ password }) => {
    const checks = [
      { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
      { label: 'Contains lowercase letter', test: (p: string) => /[a-z]/.test(p) },
      { label: 'Contains uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
      { label: 'Contains number', test: (p: string) => /\d/.test(p) },
      { label: 'Contains special character', test: (p: string) => /[@$!%*?&]/.test(p) }
    ];

    if (!password) return null;

    return (
      <div className="mt-2 space-y-1">
        <div className="text-xs font-medium text-gray-700">Password Requirements:</div>
        {checks.map((check, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {check.test(password) ? (
              <CheckCircle className="w-3 h-3 text-green-500" />
            ) : (
              <div className="w-3 h-3 border border-gray-300 rounded-full" />
            )}
            <span className={check.test(password) ? 'text-green-600' : 'text-gray-500'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (isValidToken === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-red-600">
              <XCircle className="w-6 h-6" />
              Invalid Reset Link
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              This password reset link is invalid or has expired. Reset links are only valid for 1 hour.
            </p>
            
            <div className="space-y-2">
              <Button 
                onClick={goToLogin}
                className="w-full bg-[#C8102E] hover:bg-[#A00E26]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
              <p className="text-xs text-gray-500">
                You can request a new password reset from the login page
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Lock className="w-6 h-6" />
            Set New Password
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Choose a strong password for your admin account
          </p>
        </CardHeader>
        <CardContent>
          {/* Messages */}
          {message && (
            <Alert className={`mb-4 ${
              message.type === 'error' ? 'border-red-200 bg-red-50' : 
              message.type === 'success' ? 'border-green-200 bg-green-50' :
              'border-blue-200 bg-blue-50'
            }`}>
              {message.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : message.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-blue-600" />
              )}
              <AlertDescription className={
                message.type === 'error' ? 'text-red-800' : 
                message.type === 'success' ? 'text-green-800' :
                'text-blue-800'
              }>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <PasswordStrengthIndicator password={formData.newPassword} />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <div className="text-xs text-red-500 mt-1">Passwords do not match</div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#C8102E] hover:bg-[#A00E26]"
              disabled={loading || formData.newPassword !== formData.confirmPassword || !formData.newPassword}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating Password...
                </div>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={goToLogin}
                className="text-sm text-gray-600 hover:text-gray-800 hover:underline flex items-center justify-center"
                disabled={loading}
              >
                <ArrowLeft className="w-3 h-3 mr-1" />
                Back to Login
              </button>
            </div>
          </form>

          {/* Security Information */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Security Information</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• This reset link can only be used once</li>
              <li>• Your new password will be encrypted and stored securely</li>
              <li>• All existing sessions will be logged out for security</li>
              <li>• You'll need to log in again with your new password</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <Card className="w-full max-w-md">
      <CardContent className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8102E]"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </CardContent>
    </Card>
  </div>
);

// Main page component with Suspense wrapper
const PasswordResetPage: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PasswordResetContent />
    </Suspense>
  );
};

export default PasswordResetPage;