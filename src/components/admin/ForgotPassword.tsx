import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { ArrowLeft, Key, Lock, Shield } from 'lucide-react';

interface ForgotPasswordProps {
  onBack: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  const [step, setStep] = useState<'username' | 'recovery-code' | 'reset'>('username');
  const [username, setUsername] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [resetToken, setResetToken] = useState('');

  const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'https://cinemafo.lol/api';

  const handleCheckUsername = async () => {
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/admin/check-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check username');
      }

      setUserInfo(data);
      
      if (!data.hasRecoveryCodes) {
        setError('No recovery codes available for this account. Please generate recovery codes first from Account Settings.');
        return;
      }

      setStep('recovery-code');
    } catch (err: any) {
      setError(err.message || 'Failed to check username');
    } finally {
      setLoading(false);
    }
  };


  const handleVerifyRecoveryCode = async () => {
    if (!recoveryCode.trim()) {
      setError('Please enter your recovery code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/admin/verify-recovery-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          code: recoveryCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid recovery code');
      }

      setResetToken(data.resetToken);
      setSuccess('Recovery code verified! You can now reset your password.');
      setStep('reset');
    } catch (err: any) {
      setError(err.message || 'Failed to verify recovery code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess('Password reset successfully! You can now login with your new password.');
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900/90 border-gray-700 text-white">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </Button>
          </div>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription className="text-gray-400">
            {step === 'username' && 'Enter your username to begin password recovery'}
            {step === 'recovery-code' && 'Enter your recovery code'}
            {step === 'reset' && 'Set your new password'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-900/50 border-green-700 text-green-200">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Enter Username */}
          {step === 'username' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCheckUsername()}
                  placeholder="Enter your username"
                  className="bg-gray-800 border-gray-700"
                  disabled={loading}
                />
              </div>

              <Button 
                onClick={handleCheckUsername} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Checking...' : 'Continue'}
              </Button>
            </div>
          )}

          {/* Step 2: Recovery Code */}
          {step === 'recovery-code' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Recovery Code</Label>
                <Input
                  id="code"
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleVerifyRecoveryCode()}
                  placeholder="XXXX-XXXX"
                  className="bg-gray-800 border-gray-700 font-mono"
                  disabled={loading}
                  maxLength={10}
                />
                <p className="text-xs text-gray-400">Enter one of your 8-character backup codes</p>
              </div>

              <Button 
                onClick={handleVerifyRecoveryCode} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
          )}

          {/* Step 3: Reset Password */}
          {step === 'reset' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="bg-gray-800 border-gray-700"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <p className="text-xs text-gray-400">Must be at least 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleResetPassword()}
                  placeholder="Confirm new password"
                  className="bg-gray-800 border-gray-700"
                  disabled={loading}
                />
              </div>

              <Button 
                onClick={handleResetPassword} 
                disabled={loading}
                className="w-full"
              >
                <Lock className="w-4 h-4 mr-2" />
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;

