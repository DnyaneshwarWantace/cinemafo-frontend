import React, { useState } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Image, Globe, Eye, EyeOff, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminLogin = ({ onLogin }: { onLogin: (password: string) => boolean }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogin(password)) {
      toast({
        title: "Login Successful",
        description: "Welcome to CINEMA.FO Admin Panel",
      });
    } else {
      setError('Invalid password');
      toast({
        title: "Login Failed",
        description: "Incorrect password",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Card className="w-full max-w-md bg-gray-900 border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white mb-2">Admin Panel</CardTitle>
          <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            CINEMA.FO
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white pr-10"
                  placeholder="Enter admin password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const AdminDashboard = () => {
  const { settings, updateSettings, logout } = useAdmin();
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your changes have been saved successfully.",
    });
  };

  const AdSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white mb-4">Advertisement Management</h3>
      
      {Object.entries(settings.ads).map(([key, ad]) => (
        <Card key={key} className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={ad.enabled}
                onCheckedChange={(checked) =>
                  updateSettings({
                    ads: {
                      ...settings.ads,
                      [key]: { ...ad, enabled: checked }
                    }
                  })
                }
              />
              <Label className="text-white">Enable Ad</Label>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Image URL</Label>
              <Input
                value={ad.imageUrl}
                onChange={(e) =>
                  updateSettings({
                    ads: {
                      ...settings.ads,
                      [key]: { ...ad, imageUrl: e.target.value }
                    }
                  })
                }
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Enter image URL"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Click URL</Label>
              <Input
                value={ad.clickUrl}
                onChange={(e) =>
                  updateSettings({
                    ads: {
                      ...settings.ads,
                      [key]: { ...ad, clickUrl: e.target.value }
                    }
                  })
                }
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Enter destination URL"
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <div className="text-xl bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              CINEMA.FO
            </div>
          </div>
          <Button onClick={logout} variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
            <LogOut size={16} className="mr-2" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="general" className="text-white data-[state=active]:bg-blue-600">
              <Settings size={16} className="mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="ads" className="text-white data-[state=active]:bg-blue-600">
              <Image size={16} className="mr-2" />
              Advertisements
            </TabsTrigger>
            <TabsTrigger value="social" className="text-white data-[state=active]:bg-blue-600">
              <Globe size={16} className="mr-2" />
              Social Links
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">General Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Announcement Bar */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.showAnnouncementBar}
                      onCheckedChange={(checked) =>
                        updateSettings({ showAnnouncementBar: checked })
                      }
                    />
                    <Label className="text-white">Show Announcement Bar</Label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Announcement Text</Label>
                    <Input
                      value={settings.announcementText}
                      onChange={(e) => updateSettings({ announcementText: e.target.value })}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Enter announcement text"
                    />
                  </div>
                </div>

                {/* About Us Text */}
                <div className="space-y-2">
                  <Label className="text-white">About Us Text</Label>
                  <Textarea
                    value={settings.aboutUsText}
                    onChange={(e) => updateSettings({ aboutUsText: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white min-h-[100px]"
                    placeholder="Enter about us text"
                  />
                </div>

                {/* Disclaimer Text */}
                <div className="space-y-2">
                  <Label className="text-white">Disclaimer Text</Label>
                  <Textarea
                    value={settings.disclaimerText}
                    onChange={(e) => updateSettings({ disclaimerText: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white min-h-[100px]"
                    placeholder="Enter disclaimer text"
                  />
                </div>

                {/* Custom CSS */}
                <div className="space-y-2">
                  <Label className="text-white">Custom CSS</Label>
                  <Textarea
                    value={settings.customCSS}
                    onChange={(e) => updateSettings({ customCSS: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white min-h-[200px] font-mono text-sm"
                    placeholder="Enter custom CSS code..."
                  />
                </div>

                {/* Floating Buttons */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.showFloatingButtons}
                      onCheckedChange={(checked) =>
                        updateSettings({ showFloatingButtons: checked })
                      }
                    />
                    <Label className="text-white">Show Floating Social Buttons (Desktop)</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ads">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Advertisement Management</CardTitle>
              </CardHeader>
              <CardContent>
                <AdSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="space-y-6">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Social Media Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-white">Discord Link</Label>
                  <Input
                    value={settings.discordLink}
                    onChange={(e) => updateSettings({ discordLink: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Enter Discord invite link"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Telegram Link</Label>
                  <Input
                    value={settings.telegramLink}
                    onChange={(e) => updateSettings({ telegramLink: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Enter Telegram link"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end">
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Save All Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

const Admin = () => {
  const { settings, login } = useAdmin();

  if (!settings.isLoggedIn) {
    return <AdminLogin onLogin={login} />;
  }

  return <AdminDashboard />;
};

export default Admin;