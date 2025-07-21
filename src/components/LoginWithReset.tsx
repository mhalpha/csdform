// src/components/LoginWithReset.tsx
'use client'
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Eye, 
  EyeOff, 
  User, 
  Lock,
  Mail,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface AdminData {
  id: number;
  username: string;
  email: string;
  fullName: string;
}

interface LoginWithResetProps {
  onLogin: (admin: AdminData) => void;
}

const LoginWithReset: React.FC<LoginWithResetProps> = ({ onLogin }) => {
  const [currentView, setCurrentView] = useState<'login' | 'forgot'>('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [forgotForm, setForgotForm] = useState({ email: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 8000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.admin);
      } else {
        showMessage('error', data.message || 'Login failed');
      }
    } catch (err) {
      showMessage('error', 'Network error occurred. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!forgotForm.email) {
      showMessage('error', 'Please enter your email address');
      setLoading(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotForm.email)) {
      showMessage('error', 'Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate',
          email: forgotForm.email
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.sent) {
          showMessage('success', data.message);
          setForgotForm({ email: '' });
        } else {
          showMessage('error', data.message);
        }
      } else {
        showMessage('error', data.message || 'Failed to send reset email');
      }
    } catch (err) {
      showMessage('error', 'Network error occurred. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const switchToLogin = () => {
    setCurrentView('login');
    setMessage(null);
    setForgotForm({ email: '' });
  };

  const switchToForgot = () => {
    setCurrentView('forgot');
    setMessage(null);
    setLoginForm({ username: '', password: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {currentView === 'login' ? (
              <>
                <User className="w-6 h-6" />
                Admin Login
              </>
            ) : (
              <>
                <Lock className="w-6 h-6" />
                Reset Password
              </>
            )}
          </CardTitle>
          {currentView === 'forgot' && (
            <p className="text-sm text-gray-600 mt-2">
              Enter your email address and we'll send you a password reset link
            </p>
          )}
        </CardHeader>
        <CardContent>
          {/* Messages */}
          {message && (
            <Alert className={`mb-4 ${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
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

          {/* Login Form */}
          {currentView === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-[#C8102E] hover:bg-[#A00E26]"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Logging in...
                  </div>
                ) : (
                  'Login'
                )}
              </Button>

              {/* Forgot Password Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={switchToForgot}
                  className="text-sm text-[#C8102E] hover:text-[#A00E26] hover:underline"
                  disabled={loading}
                >
                  Forgot your password?
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password Form */}
          {currentView === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={forgotForm.email}
                    onChange={(e) => setForgotForm({ email: e.target.value })}
                    placeholder="Enter your email address"
                    required
                    autoComplete="email"
                    className="pl-10"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  We will send a password reset link to this email address.
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-[#C8102E] hover:bg-[#A00E26]"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </div>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Reset Link
                  </>
                )}
              </Button>

              {/* Back to Login Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={switchToLogin}
                  className="text-sm text-gray-600 hover:text-gray-800 hover:underline flex items-center justify-center"
                  disabled={loading}
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {/* Help Information */}
          {currentView === 'login' && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• If you forgot your password, click "Forgot your password?" above</li>
                <li>• Password reset links expire after 1 hour</li>
              </ul>
            </div>
          )}

          {currentView === 'forgot' && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">📧 What happens next?</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• We will send a secure reset link</li>
                <li>• The email will arrive in 1-2 minutes</li>
                <li>• The link will expire in 1 hour for security</li>
                <li>• Click the link to set a new password</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginWithReset;