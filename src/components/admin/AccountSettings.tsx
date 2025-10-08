import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { User, Lock, Key } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const AccountSettings: React.FC = () => {
  const { toast } = useToast();
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  
  // Change Username State
  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  
  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // Recovery Codes State
  const [recoveryCodesPassword, setRecoveryCodesPassword] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  
  const [error, setError] = useState<string | null>(null);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'https://cinema.fo/api';

  useEffect(() => {
    fetchAccountInfo();
  }, []);

  const fetchAccountInfo = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${BASE_URL}/admin/account-info`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch account info');
      }

      const data = await response.json();
      setAccountInfo(data);
      setNewUsername(data.username);
    } catch (err) {
      console.error('Error fetching account info:', err);
    }
  };

  const handleChangeUsername = async () => {
    if (!newUsername.trim() || !usernamePassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newUsername.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${BASE_URL}/admin/change-username`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newUsername,
          password: usernamePassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change username');
      }

      toast({
        title: "Success",
        description: "Username changed successfully!",
      });

      setUsernamePassword('');
      fetchAccountInfo();
    } catch (err: any) {
      setError(err.message || 'Failed to change username');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${BASE_URL}/admin/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      toast({
        title: "Success",
        description: "Password changed successfully!",
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      fetchAccountInfo();
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };


  const handleGenerateRecoveryCodes = async () => {
    if (!recoveryCodesPassword) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${BASE_URL}/admin/generate-recovery-codes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          password: recoveryCodesPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate recovery codes');
      }

      setGeneratedCodes(data.codes);
      toast({
        title: "Success",
        description: "Recovery codes generated successfully! Save them securely.",
      });

      setRecoveryCodesPassword('');
      fetchAccountInfo();
    } catch (err: any) {
      setError(err.message || 'Failed to generate recovery codes');
    } finally {
      setLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    const codesText = generatedCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    toast({
      title: "Copied",
      description: "Recovery codes copied to clipboard!",
    });
  };

  const downloadRecoveryCodes = () => {
    const codesText = generatedCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recovery-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Downloaded",
      description: "Recovery codes saved to file!",
    });
  };

  if (!accountInfo) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Loading account information...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Account Info Summary */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Username:</span>
            <span className="font-semibold">{accountInfo.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Recovery Codes:</span>
            <span className={accountInfo.unusedRecoveryCodes > 0 ? "text-green-400" : "text-red-400"}>
              {accountInfo.unusedRecoveryCodes > 0 ? `${accountInfo.unusedRecoveryCodes} available` : 'Not generated'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Last Password Change:</span>
            <span>{new Date(accountInfo.lastPasswordChange).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Change Username */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Change Username
          </CardTitle>
          <CardDescription>Update your admin username</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newUsername">New Username</Label>
            <Input
              id="newUsername"
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter new username"
              className="bg-gray-700 border-gray-600"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="usernamePassword">Confirm with Password</Label>
            <Input
              id="usernamePassword"
              type="password"
              value={usernamePassword}
              onChange={(e) => setUsernamePassword(e.target.value)}
              placeholder="Enter your password"
              className="bg-gray-700 border-gray-600"
              disabled={loading}
            />
          </div>
          <Button 
            onClick={handleChangeUsername} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Changing...' : 'Change Username'}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your admin password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="bg-gray-700 border-gray-600"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="bg-gray-700 border-gray-600"
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
            <Input
              id="confirmNewPassword"
              type={showPasswords ? 'text' : 'password'}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Confirm new password"
              className="bg-gray-700 border-gray-600"
              disabled={loading}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showPasswords"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="showPasswords" className="text-sm text-gray-400 cursor-pointer">
              Show passwords
            </label>
          </div>
          <Button 
            onClick={handleChangePassword} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Changing...' : 'Change Password'}
          </Button>
        </CardContent>
      </Card>

      {/* Recovery Codes */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Recovery Codes
          </CardTitle>
          <CardDescription>
            {accountInfo.unusedRecoveryCodes > 0
              ? `You have ${accountInfo.unusedRecoveryCodes} unused recovery code(s). Generate new ones if needed.`
              : 'Generate backup codes to recover your account without email'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {generatedCodes.length > 0 ? (
            <div className="space-y-4">
              <Alert className="bg-yellow-900/20 border-yellow-700">
                <AlertDescription>
                  <strong>Important:</strong> Save these codes in a secure place. Each code can only be used once.
                </AlertDescription>
              </Alert>
              
              <div className="p-4 bg-gray-700 rounded-lg font-mono space-y-2">
                {generatedCodes.map((code, index) => (
                  <div key={index} className="text-lg">{code}</div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={copyRecoveryCodes}
                  variant="outline"
                  className="flex-1"
                >
                  Copy Codes
                </Button>
                <Button 
                  onClick={downloadRecoveryCodes}
                  variant="outline"
                  className="flex-1"
                >
                  Download Codes
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="recoveryCodesPassword">Confirm with Password</Label>
                <Input
                  id="recoveryCodesPassword"
                  type="password"
                  value={recoveryCodesPassword}
                  onChange={(e) => setRecoveryCodesPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="bg-gray-700 border-gray-600"
                  disabled={loading}
                />
              </div>

              <Button 
                onClick={handleGenerateRecoveryCodes} 
                disabled={loading}
                className="w-full"
              >
                <Key className="w-4 h-4 mr-2" />
                {loading ? 'Generating...' : 'Generate Recovery Codes'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSettings;

