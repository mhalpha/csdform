// components/AdminSettings.tsx
'use client'
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Eye, 
  EyeOff, 
  Lock, 
  User, 
  Save,
  AlertCircle,
  CheckCircle,
  Shield,
  Settings
} from "lucide-react";

interface AdminData {
  id: number;
  username: string;
  email: string;
  fullName: string;
}

interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordResetForm {
  username: string;
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}

const AdminSettings: React.FC = () => {
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'reset'>('password');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Password change form
  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Password reset form
  const [resetForm, setResetForm] = useState<PasswordResetForm>({
    username: '',
    resetToken: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [resetStep, setResetStep] = useState<'generate' | 'reset'>('generate');

  useEffect(() => {
    validateSession();
  }, []);

  const validateSession = async () => {
    try {
      const response = await fetch('/api/admin/auth/validate', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          setAdmin(data.admin);
        }
      }
    } catch (error) {
      console.error('Session validation error:', error);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showMessage('error', 'All fields are required');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }

    const passwordValidation = validatePasswordStrength(passwordForm.newPassword);
    if (!passwordValidation.valid) {
      showMessage('error', passwordValidation.message);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(passwordForm)
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('success', 'Password changed successfully! Please log in again.');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/admin';
        }, 2000);
      } else {
        showMessage('error', data.message || 'Failed to change password');
      }
    } catch (error) {
      showMessage('error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetForm.username) {
      showMessage('error', 'Username is required');
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
          action: 'generate',
          username: resetForm.username
        })
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('success', 'Reset token generated! Check console for token (in production, this would be sent via email).');
        setResetForm(prev => ({ ...prev, resetToken: data.resetToken || '' }));
        setResetStep('reset');
      } else {
        showMessage('error', data.message || 'Failed to generate reset token');
      }
    } catch (error) {
      showMessage('error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetForm.resetToken || !resetForm.newPassword || !resetForm.confirmPassword) {
      showMessage('error', 'All fields are required');
      return;
    }

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      showMessage('error', 'Passwords do not match');
      return;
    }

    const passwordValidation = validatePasswordStrength(resetForm.newPassword);
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
          resetToken: resetForm.resetToken,
          newPassword: resetForm.newPassword,
          confirmPassword: resetForm.confirmPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('success', 'Password reset successfully! You can now log in with your new password.');
        setResetForm({ username: '', resetToken: '', newPassword: '', confirmPassword: '' });
        setResetStep('generate');
        
        // Redirect to login
        setTimeout(() => {
          window.location.href = '/admin';
        }, 2000);
      } else {
        showMessage('error', data.message || 'Failed to reset password');
      }
    } catch (error) {
      showMessage('error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Admin Settings</h1>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          {message.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 ${
            activeTab === 'profile'
              ? 'border-[#C8102E] text-[#C8102E]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('profile')}
        >
          <User className="w-4 h-4 inline mr-2" />
          Profile
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 ${
            activeTab === 'password'
              ? 'border-[#C8102E] text-[#C8102E]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('password')}
        >
          <Lock className="w-4 h-4 inline mr-2" />
          Change Password
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 ${
            activeTab === 'reset'
              ? 'border-[#C8102E] text-[#C8102E]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('reset')}
        >
          <Shield className="w-4 h-4 inline mr-2" />
          Reset Password
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && admin && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Username</Label>
                <Input value={admin.username} disabled />
              </div>
              <div>
                <Label>Full Name</Label>
                <Input value={admin.fullName || 'Not set'} disabled />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={admin.email || 'Not set'} disabled />
              </div>
              <div>
                <Label>Admin ID</Label>
                <Input value={admin.id.toString()} disabled />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Password Tab */}
      {activeTab === 'password' && (
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    required
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
                <PasswordStrengthIndicator password={passwordForm.newPassword} />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
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
                {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <div className="text-xs text-red-500 mt-1">Passwords do not match</div>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={loading || passwordForm.newPassword !== passwordForm.confirmPassword}
                className="bg-[#C8102E] hover:bg-red-700 text-white"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reset Password Tab */}
      {activeTab === 'reset' && (
        <Card>
          <CardHeader>
            <CardTitle>Password Reset</CardTitle>
          </CardHeader>
          <CardContent>
            {resetStep === 'generate' ? (
              <form onSubmit={handlePasswordResetGenerate} className="space-y-4">
                <div>
                  <Label htmlFor="resetUsername">Username</Label>
                  <Input
                    id="resetUsername"
                    type="text"
                    value={resetForm.username}
                    onChange={(e) => setResetForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter username"
                    required
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Enter the username to generate a password reset token
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-[#C8102E] hover:bg-red-700 text-white"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Shield className="w-4 h-4 mr-2" />
                  )}
                  Generate Reset Token
                </Button>
              </form>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <Label htmlFor="resetToken">Reset Token</Label>
                  <Input
                    id="resetToken"
                    type="text"
                    value={resetForm.resetToken}
                    onChange={(e) => setResetForm(prev => ({ ...prev, resetToken: e.target.value }))}
                    placeholder="Enter reset token"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="resetNewPassword">New Password</Label>
                  <Input
                    id="resetNewPassword"
                    type="password"
                    value={resetForm.newPassword}
                    onChange={(e) => setResetForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    required
                  />
                  <PasswordStrengthIndicator password={resetForm.newPassword} />
                </div>

                <div>
                  <Label htmlFor="resetConfirmPassword">Confirm New Password</Label>
                  <Input
                    id="resetConfirmPassword"
                    type="password"
                    value={resetForm.confirmPassword}
                    onChange={(e) => setResetForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                  {resetForm.confirmPassword && resetForm.newPassword !== resetForm.confirmPassword && (
                    <div className="text-xs text-red-500 mt-1">Passwords do not match</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={loading || resetForm.newPassword !== resetForm.confirmPassword}
                    className="bg-[#C8102E] hover:bg-red-700 text-white"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Reset Password
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setResetStep('generate');
                      setResetForm({ username: '', resetToken: '', newPassword: '', confirmPassword: '' });
                    }}
                  >
                    Back to Generate
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminSettings;