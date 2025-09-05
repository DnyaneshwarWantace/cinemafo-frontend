import React, { useState, useEffect } from 'react';
import { Settings, FileText, Eye, EyeOff, Upload, Save, X, Plus, Trash2, Monitor, Image, Link, BarChart3, Users, Globe, Palette, Shield, Database, Bell, Zap, LogOut, Home } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';

interface AdminSettings {
  appearance: {
    announcementBar: {
      enabled: boolean;
      text: string;
      backgroundColor: string;
      textColor: string;
      height: number;
      textSize: string;
      textWeight: string;
      textStyle: string;
    };
    floatingSocialButtons: {
      enabled: boolean;
      discordEnabled: boolean;
      telegramEnabled: boolean;
      discordUrl: string;
      telegramUrl: string;
    };
    customCSS: string;
  };
  content: {
    disclaimer: string;
    aboutUs: string;
    socialLinks: {
      discord: string;
      telegram: string;
    };
  };
  ads: {
    heroOverlayAd: { enabled: boolean; imageUrl: string; cloudinaryUrl?: string; clickUrl: string; };
    mainPageAd1: { enabled: boolean; imageUrl: string; cloudinaryUrl?: string; clickUrl: string; };
    mainPageAd2: { enabled: boolean; imageUrl: string; cloudinaryUrl?: string; clickUrl: string; };
    mainPageAd3: { enabled: boolean; imageUrl: string; cloudinaryUrl?: string; clickUrl: string; };
    mainPageAd4: { enabled: boolean; imageUrl: string; cloudinaryUrl?: string; clickUrl: string; };
    searchTopAd: { enabled: boolean; imageUrl: string; cloudinaryUrl?: string; clickUrl: string; };
    searchBottomAd: { enabled: boolean; imageUrl: string; cloudinaryUrl?: string; clickUrl: string; };
    moviesPageAd: { enabled: boolean; imageUrl: string; cloudinaryUrl?: string; clickUrl: string; };
    moviesPageBottomAd: { enabled: boolean; imageUrl: string; cloudinaryUrl?: string; clickUrl: string; };
    showsPageAd: { enabled: boolean; imageUrl: string; cloudinaryUrl?: string; clickUrl: string; };
    showsPageBottomAd: { enabled: boolean; imageUrl: string; cloudinaryUrl?: string; clickUrl: string; };
    playerPageAd: { enabled: boolean; imageUrl: string; cloudinaryUrl?: string; clickUrl: string; };
  };
}

// Helper function to handle API calls with token refresh
const apiCallWithRefresh = async (apiCall: () => Promise<Response>) => {
  const response = await apiCall();
  
  if (response.status === 401) {
    const errorData = await response.json();
    if (errorData.expired) {
      // Try to refresh the token
      try {
        await adminApi.refreshToken();
        // Retry the request with the new token
        const newToken = localStorage.getItem('adminToken');
        const retryResponse = await apiCall();
        
        if (!retryResponse.ok) {
          throw new Error('Request failed after token refresh');
        }
        
        return retryResponse;
      } catch (refreshError) {
        // If refresh fails, clear token and throw error
        localStorage.removeItem('adminToken');
        throw new Error('Session expired. Please log in again.');
      }
    }
  }
  
  return response;
};

// API functions
const adminApi = {
  login: async (username: string, password: string) => {
    const response = await fetch(`${import.meta.env.VITE_ADMIN_URL || 'https://cinemafo.lol//api/admin'}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    const data = await response.json();
    localStorage.setItem('adminToken', data.token);
    return data;
  },

  refreshToken: async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      throw new Error('No token to refresh');
    }

    const response = await fetch(`${import.meta.env.VITE_ADMIN_URL || 'https://cinemafo.lol//api/admin'}/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    const data = await response.json();
    localStorage.setItem('adminToken', data.token);
    return data;
  },

  getSettings: async () => {
    const token = localStorage.getItem('adminToken');
    const response = await apiCallWithRefresh(() => 
      fetch(`${import.meta.env.VITE_ADMIN_URL || 'https://cinemafo.lol//api/admin'}/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
      })
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch settings');
    }
    
    return response.json();
  },

  updateAnnouncement: async (settings: any) => {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${import.meta.env.VITE_ADMIN_URL || 'https://cinemafo.lol//api/admin'}/settings/announcement`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settings)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update announcement settings');
    }
    
    return response.json();
  },

  updateSocialButtons: async (settings: any) => {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${import.meta.env.VITE_ADMIN_URL || 'https://cinemafo.lol//api/admin'}/settings/social-buttons`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settings)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update social buttons settings');
    }
    
    return response.json();
  },

  updateSocialLinks: async (socialLinks: any) => {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${import.meta.env.VITE_ADMIN_URL || 'https://cinemafo.lol//api/admin'}/settings/social-links`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(socialLinks)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update social links');
    }
    
    return response.json();
  },

  updateContent: async (contentData: any) => {
    console.log('📝 Frontend: Updating content settings (disclaimer & about us only)...');
    console.log('📤 Frontend: Sending data:', contentData);
    
    const token = localStorage.getItem('adminToken');
    console.log('🔑 Frontend: Token exists:', !!token);
    
    const response = await fetch(`${import.meta.env.VITE_ADMIN_URL || 'https://cinemafo.lol//api/admin'}/settings/content`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(contentData)
    });
    
    console.log('📊 Frontend: Response status:', response.status);
    console.log('📊 Frontend: Response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Frontend: Response error:', errorText);
      throw new Error('Failed to update content settings');
    }
    
    const result = await response.json();
    console.log('✅ Frontend: Success response:', result);
    return result;
  },

  updateAds: async (settings: any) => {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${import.meta.env.VITE_ADMIN_URL || 'https://cinemafo.lol//api/admin'}/settings/ads`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settings)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update ads settings');
    }
    
    return response.json();
  },

  uploadAdImage: async (adKey: string, imageUrl: string) => {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${import.meta.env.VITE_ADMIN_URL || 'https://cinemafo.lol//api/admin'}/upload-ad-image`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ adKey, imageUrl })
    });
    
    if (!response.ok) {
              throw new Error('Failed to upload ad image to Tenor');
    }
    
    return response.json();
  },

  updateCSS: async (css: string) => {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${import.meta.env.VITE_ADMIN_URL || 'https://cinemafo.lol//api/admin'}/settings/css`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ customCSS: css })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update CSS');
    }
    
    return response.json();
  }
};

const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem('adminToken');
    return !!token;
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const queryClient = useQueryClient();

  // Fetch settings
  const { data: settingsData, isLoading, error: settingsError } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: adminApi.getSettings,
    enabled: isAuthenticated,
    retry: 1
  });

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData);
      setError(null);
    }
  }, [settingsData]);

  useEffect(() => {
    if (settingsError) {
      if ((settingsError as any).message?.includes('401')) {
        setError('Your session has expired. Please log in again.');
        setIsAuthenticated(false);
        localStorage.removeItem('adminToken');
      } else {
        setError('Failed to load settings. Please try refreshing the page.');
      }
    }
  }, [settingsError]);

  // Mutations
  const updateAnnouncementMutation = useMutation({
    mutationFn: adminApi.updateAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      toast({
        title: "Success",
        description: "Announcement settings saved successfully!",
      });
    },
    onError: (error) => {
      setError('Failed to save announcement settings. Please try again.');
      console.error('Error saving announcement settings:', error);
    }
  });

  const updateSocialButtonsMutation = useMutation({
    mutationFn: adminApi.updateSocialButtons,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      toast({
        title: "Success",
        description: "Social buttons settings saved successfully!",
      });
    },
    onError: (error) => {
      setError('Failed to save social buttons settings. Please try again.');
      console.error('Error saving social buttons settings:', error);
    }
  });

  const updateSocialLinksMutation = useMutation({
    mutationFn: adminApi.updateSocialLinks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      toast({
        title: "Success",
        description: "Social links saved successfully!",
      });
    },
    onError: (error) => {
      setError('Failed to save social links. Please try again.');
      console.error('Error saving social links:', error);
    }
  });

  const updateContentMutation = useMutation({
    mutationFn: adminApi.updateContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      toast({
        title: "Success",
        description: "Content settings saved successfully!",
      });
    },
    onError: (error) => {
      setError('Failed to save content settings. Please try again.');
      console.error('Error saving content settings:', error);
    }
  });

  const updateAdsMutation = useMutation({
    mutationFn: adminApi.updateAds,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      toast({
        title: "Success",
        description: "Ad settings saved successfully!",
      });
    },
    onError: (error) => {
      setError('Failed to save ad settings. Please try again.');
      console.error('Error saving ad settings:', error);
    }
  });

  const uploadAdImageMutation = useMutation({
    mutationFn: ({ adKey, imageUrl }: { adKey: string; imageUrl: string }) => 
      adminApi.uploadAdImage(adKey, imageUrl),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      toast({
        title: "Success",
        description: data.message || "Image uploaded to ImgBB successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Function to upload all ads automatically
  const uploadAllAds = async () => {
    if (!settings) return;
    
    const adsToUpload = Object.entries(settings.ads).filter(([adKey, adConfig]) => 
      adConfig.imageUrl && !adConfig.cloudinaryUrl
    );
    
    if (adsToUpload.length === 0) {
      toast({
        title: "No ads to upload",
        description: "All ads are already uploaded or don't have image URLs.",
      });
      return;
    }
    
    toast({
      title: "Starting upload",
      description: `Uploading ${adsToUpload.length} ads to ImgBB...`,
    });
    
    // Upload ads one by one
    for (let i = 0; i < adsToUpload.length; i++) {
      const [adKey, adConfig] = adsToUpload[i];
      
      try {
        toast({
          title: `Uploading ${adKey}`,
          description: `Progress: ${i + 1}/${adsToUpload.length}`,
        });
        
        const result = await adminApi.uploadAdImage(adKey, adConfig.imageUrl);
        
        // Update settings after each successful upload
        if (settings) {
          const newSettings = {
            ...settings,
            ads: {
              ...settings.ads,
              [adKey]: {
                ...settings.ads[adKey as keyof typeof settings.ads],
                cloudinaryUrl: result.cloudinaryUrl
              }
            }
          };
          setSettings(newSettings);
        }
        
        // Small delay between uploads
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Failed to upload ${adKey}:`, error);
        toast({
          title: `Failed to upload ${adKey}`,
          description: error.message || "Upload failed",
          variant: "destructive",
        });
      }
    }
    
    toast({
      title: "Upload complete",
      description: `Finished uploading ${adsToUpload.length} ads.`,
    });
    
    // Refresh settings
    queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
  };

  // Auto-refresh settings every 5 seconds to check for background downloads
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, queryClient]);

  // Function to generate CSS for announcement bar
  const generateAnnouncementCSS = () => {
    if (!settings?.appearance?.announcementBar) return '';
    
    const { backgroundColor, textColor, height, textSize, textWeight, textStyle } = settings.appearance.announcementBar;
    
    return `
/* Announcement Bar Custom CSS */
.announcement-bar {
  background: ${backgroundColor} !important;
  height: ${height}px !important;
}

.announcement-bar-text {
  color: ${textColor} !important;
  font-size: ${textSize === 'text-xs' ? '0.75rem' : 
               textSize === 'text-sm' ? '0.875rem' : 
               textSize === 'text-base' ? '1rem' : 
               textSize === 'text-lg' ? '1.125rem' : 
               textSize === 'text-xl' ? '1.25rem' : '0.875rem'} !important;
  font-weight: ${textWeight === 'font-light' ? '300' : 
                textWeight === 'font-normal' ? '400' : 
                textWeight === 'font-medium' ? '500' : 
                textWeight === 'font-semibold' ? '600' : 
                textWeight === 'font-bold' ? '700' : '500'} !important;
  font-style: ${textStyle} !important;
}

/* Adjust navbar position based on announcement height */
.navbar-with-announcement {
  top: ${height}px !important;
}

/* Adjust main content padding */
.main-content-with-announcement {
  padding-top: ${height + 80}px !important;
}

.main-content-without-announcement {
  padding-top: 80px !important;
}
    `.trim();
  };

  const updateCSSMutation = useMutation({
    mutationFn: (css: { customCSS: string }) => adminApi.updateCSS(css.customCSS),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      toast({
        title: "Success",
        description: "Custom CSS saved successfully!",
      });
    },
    onError: (error) => {
      setError('Failed to save custom CSS. Please try again.');
      console.error('Error saving custom CSS:', error);
    }
  });

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setError(null);
      await adminApi.login(username, password);
      setIsAuthenticated(true);
      setUsername('');
      setPassword('');
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
    } catch (err) {
      setError('Login failed. Please check your credentials.');
      console.error('Login error:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    queryClient.clear();
  };

  const updateAdSettings = (adKey: string, field: string, value: any) => {
    if (!settings) return;
    
    const currentAd = settings.ads?.[adKey as keyof typeof settings.ads] || { enabled: false, imageUrl: '', clickUrl: '', cloudinaryUrl: '' };
    
    // If imageUrl is being changed, clear the cloudinaryUrl
    let newAdConfig = {
      ...currentAd,
      [field]: value
    };
    
    if (field === 'imageUrl') {
      newAdConfig.cloudinaryUrl = ''; // Clear the old uploaded URL
      // Force save immediately to clear the cloudinaryUrl from database
      const forceUpdateSettings = {
        ...settings,
        ads: {
          ...settings.ads,
          [adKey]: newAdConfig
        }
      };
      setSettings(forceUpdateSettings);
      updateAdsMutation.mutate(forceUpdateSettings.ads);
      return; // Exit early to prevent double update
    }
    
    const newSettings = {
      ...settings,
      ads: {
        ...settings.ads,
        [adKey]: newAdConfig
      }
    };
    
    setSettings(newSettings);
    
    // Immediately save the ad settings when a toggle changes
    if (field === 'enabled') {
      updateAdsMutation.mutate(newSettings.ads);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800/50 border-gray-700 backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">Admin Login</CardTitle>
            <CardDescription className="text-gray-300">Enter your credentials to access the admin panel</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              <div>
                <Label htmlFor="username" className="text-white">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="cinemafo"
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-white">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="cinemafo"
                    className="bg-gray-700 border-gray-600 text-white pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                disabled={isLoggingIn || !username || !password}
              >
                {isLoggingIn ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-white">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center text-red-400">
          <p className="text-lg">No settings data available. Please contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <img 
                  src="/logo.svg" 
                  alt="CINEMA.FO" 
                  className="h-10 w-auto transition-all duration-300 filter brightness-110"
                />
                <div className="ml-4">
                  <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                  <p className="text-gray-300 text-sm">Content Management System</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => window.open('/', '_blank')}
                className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
              >
                <Home className="w-4 h-4 mr-2" />
                View Site
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-gray-800">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-blue-600">
              <FileText className="w-4 h-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-blue-600">
              <Palette className="w-4 h-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="ads" className="data-[state=active]:bg-blue-600">
              <Image className="w-4 h-4 mr-2" />
              Ads
            </TabsTrigger>
            <TabsTrigger value="social" className="data-[state=active]:bg-blue-600">
              <Users className="w-4 h-4 mr-2" />
              Social
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Bell className="w-5 h-5 mr-2" />
                    Announcement Bar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Status</span>
                    <Switch
                      checked={settings.appearance.announcementBar.enabled}
                      onCheckedChange={(checked) => {
                        setSettings(prev => prev ? {
                          ...prev,
                          appearance: {
                            ...prev.appearance,
                            announcementBar: {
                              ...prev.appearance.announcementBar,
                              enabled: checked
                            }
                          }
                        } : null);
                        updateAnnouncementMutation.mutate({
                          ...settings.appearance.announcementBar,
                          enabled: checked
                        });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Social Buttons
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Status</span>
                    <Switch
                      checked={settings.appearance.floatingSocialButtons.enabled}
                      onCheckedChange={(checked) => {
                        setSettings(prev => prev ? {
                          ...prev,
                          appearance: {
                            ...prev.appearance,
                            floatingSocialButtons: {
                              ...prev.appearance.floatingSocialButtons,
                              enabled: checked
                            }
                          }
                        } : null);
                        updateSocialButtonsMutation.mutate({
                          ...settings.appearance.floatingSocialButtons,
                          enabled: checked
                        });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Image className="w-5 h-5 mr-2" />
                    Active Ads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-400">
                    {Object.values(settings.ads).filter(ad => ad.enabled).length}
                  </div>
                  <p className="text-gray-300 text-sm">Active ad spots</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
                <CardDescription className="text-gray-300">
                  Quickly enable demo ads or disable all ads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => {
                      if (!settings) return;
                      const demoSettings = {
                        ...settings,
                        ads: {
                          heroOverlayAd: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=0', clickUrl: 'https://example.com', cloudinaryUrl: '' },
                          mainPageAd1: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=1', clickUrl: 'https://example.com', cloudinaryUrl: '' },
                          mainPageAd2: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=2', clickUrl: 'https://example.com', cloudinaryUrl: '' },
                          mainPageAd3: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=3', clickUrl: 'https://example.com', cloudinaryUrl: '' },
                          mainPageAd4: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=4', clickUrl: 'https://example.com', cloudinaryUrl: '' },
                          searchTopAd: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=5', clickUrl: 'https://example.com', cloudinaryUrl: '' },
                          searchBottomAd: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=6', clickUrl: 'https://example.com', cloudinaryUrl: '' },
                          moviesPageAd: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=7', clickUrl: 'https://example.com', cloudinaryUrl: '' },
                          moviesPageBottomAd: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=11', clickUrl: 'https://example.com', cloudinaryUrl: '' },
                          showsPageAd: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=8', clickUrl: 'https://example.com', cloudinaryUrl: '' },
                          showsPageBottomAd: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=12', clickUrl: 'https://example.com', cloudinaryUrl: '' },
                          playerPageAd: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=10', clickUrl: 'https://example.com', cloudinaryUrl: '' }
                        }
                      };
                      setSettings(demoSettings);
                      updateAdsMutation.mutate(demoSettings.ads);
                      toast({
                        title: "Success",
                        description: "Demo ads enabled! Check all pages to see them.",
                      });
                    }}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Enable All Demo Ads
                  </Button>

                  <Button
                    onClick={() => {
                      if (!settings) return;
                      const disabledSettings = {
                        ...settings,
                        ads: Object.keys(settings.ads || {}).reduce((acc, key) => {
                          acc[key] = { enabled: false, imageUrl: '', clickUrl: '', cloudinaryUrl: '' };
                          return acc;
                        }, {} as any)
                      };
                      setSettings(disabledSettings);
                      updateAdsMutation.mutate(disabledSettings.ads);
                      toast({
                        title: "Success",
                        description: "All ads disabled!",
                      });
                    }}
                    className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Disable All Ads
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Content Management</CardTitle>
                <CardDescription className="text-gray-300">
                  Update your site's content and legal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="disclaimer" className="text-white">Disclaimer</Label>
                  <Textarea
                    id="disclaimer"
                    value={settings.content.disclaimer}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      content: { ...prev.content, disclaimer: e.target.value }
                    } : null)}
                    className="bg-gray-700 border-gray-600 text-white"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="aboutUs" className="text-white">About Us</Label>
                  <Textarea
                    id="aboutUs"
                    value={settings.content.aboutUs}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      content: { ...prev.content, aboutUs: e.target.value }
                    } : null)}
                    className="bg-gray-700 border-gray-600 text-white"
                    rows={4}
                  />
                </div>
                
                <Button 
                  onClick={() => updateContentMutation.mutate({
                    disclaimer: settings.content.disclaimer,
                    aboutUs: settings.content.aboutUs
                  })}
                  disabled={updateContentMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updateContentMutation.isPending ? 'Saving...' : 'Save Content'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Announcement Bar</CardTitle>
                <CardDescription className="text-gray-300">
                  Configure the announcement bar at the top of the site
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-white">Enable Announcement Bar</Label>
                  <Switch
                    checked={settings.appearance.announcementBar.enabled}
                    onCheckedChange={(checked) => {
                      setSettings(prev => prev ? {
                        ...prev,
                        appearance: {
                          ...prev.appearance,
                          announcementBar: {
                            ...prev.appearance.announcementBar,
                            enabled: checked
                          }
                        }
                      } : null);
                      updateAnnouncementMutation.mutate({
                        ...settings.appearance.announcementBar,
                        enabled: checked
                      });
                    }}
                  />
                </div>
                {settings.appearance.announcementBar.enabled && (
                  <>
                    <div>
                      <Label htmlFor="announcementText" className="text-white">Announcement Text</Label>
                      <Input
                        id="announcementText"
                        value={settings.appearance.announcementBar.text}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          appearance: {
                            ...prev.appearance,
                            announcementBar: {
                              ...prev.appearance.announcementBar,
                              text: e.target.value
                            }
                          }
                        } : null)}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="backgroundColor" className="text-white">Background Color/Style</Label>
                        <div className="flex gap-2">
                          <Input
                            id="backgroundColor"
                            value={settings.appearance.announcementBar.backgroundColor}
                            onChange={(e) => setSettings(prev => prev ? {
                              ...prev,
                              appearance: {
                                ...prev.appearance,
                                announcementBar: {
                                  ...prev.appearance.announcementBar,
                                  backgroundColor: e.target.value
                                }
                              }
                            } : null)}
                            className="bg-gray-700 border-gray-600 text-white flex-1"
                            placeholder="linear-gradient(135deg, #1e40af, #1e3a8a) or #3b82f6"
                          />
                          <Input
                            type="color"
                            value={settings.appearance.announcementBar.backgroundColor.startsWith('#') ? settings.appearance.announcementBar.backgroundColor : '#3b82f6'}
                            onChange={(e) => setSettings(prev => prev ? {
                              ...prev,
                              appearance: {
                                ...prev.appearance,
                                announcementBar: {
                                  ...prev.appearance.announcementBar,
                                  backgroundColor: e.target.value
                                }
                              }
                            } : null)}
                            className="bg-gray-700 border-gray-600 h-10 w-16"
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Use hex colors (#3b82f6) or gradients (linear-gradient(135deg, #1e40af, #1e3a8a))
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="textColor" className="text-white">Text Color</Label>
                        <Input
                          id="textColor"
                          type="color"
                          value={settings.appearance.announcementBar.textColor}
                          onChange={(e) => setSettings(prev => prev ? {
                            ...prev,
                            appearance: {
                              ...prev.appearance,
                              announcementBar: {
                                ...prev.appearance.announcementBar,
                                textColor: e.target.value
                              }
                            }
                          } : null)}
                          className="bg-gray-700 border-gray-600 h-10"
                        />
                      </div>
                    </div>
                    

                    
                    <div>
                      <Label htmlFor="height" className="text-white">Height (px)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={settings.appearance.announcementBar.height}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          appearance: {
                            ...prev.appearance,
                            announcementBar: {
                              ...prev.appearance.announcementBar,
                              height: parseInt(e.target.value) || 48
                            }
                          }
                        } : null)}
                        className="bg-gray-700 border-gray-600 text-white"
                        min="30"
                        max="100"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="textSize" className="text-white">Text Size</Label>
                        <select
                          id="textSize"
                          value={settings.appearance.announcementBar.textSize}
                          onChange={(e) => setSettings(prev => prev ? {
                            ...prev,
                            appearance: {
                              ...prev.appearance,
                              announcementBar: {
                                ...prev.appearance.announcementBar,
                                textSize: e.target.value
                              }
                            }
                          } : null)}
                          className="w-full bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2"
                        >
                          <option value="text-xs">Extra Small</option>
                          <option value="text-sm">Small</option>
                          <option value="text-base">Base</option>
                          <option value="text-lg">Large</option>
                          <option value="text-xl">Extra Large</option>
                          <option value="text-sm md:text-base">Responsive</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="textWeight" className="text-white">Text Weight</Label>
                        <select
                          id="textWeight"
                          value={settings.appearance.announcementBar.textWeight}
                          onChange={(e) => setSettings(prev => prev ? {
                            ...prev,
                            appearance: {
                              ...prev.appearance,
                              announcementBar: {
                                ...prev.appearance.announcementBar,
                                textWeight: e.target.value
                              }
                            }
                          } : null)}
                          className="w-full bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2"
                        >
                          <option value="font-light">Light</option>
                          <option value="font-normal">Normal</option>
                          <option value="font-medium">Medium</option>
                          <option value="font-semibold">Semi Bold</option>
                          <option value="font-bold">Bold</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="textStyle" className="text-white">Text Style</Label>
                        <select
                          id="textStyle"
                          value={settings.appearance.announcementBar.textStyle}
                          onChange={(e) => setSettings(prev => prev ? {
                            ...prev,
                            appearance: {
                              ...prev.appearance,
                              announcementBar: {
                                ...prev.appearance.announcementBar,
                                textStyle: e.target.value
                              }
                            }
                          } : null)}
                          className="w-full bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2"
                        >
                          <option value="normal">Normal</option>
                          <option value="italic">Italic</option>
                        </select>
                      </div>
                    </div>
                    <Button 
                      onClick={() => updateAnnouncementMutation.mutate(settings.appearance.announcementBar)}
                      disabled={updateAnnouncementMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {updateAnnouncementMutation.isPending ? 'Saving...' : 'Save Announcement'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Custom CSS</CardTitle>
                <CardDescription className="text-gray-300">
                  Edit and customize CSS for the announcement bar and advanced styling
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white">CSS Editor</Label>
                  <Textarea
                    value={settings.appearance.customCSS || generateAnnouncementCSS()}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      appearance: {
                        ...prev.appearance,
                        customCSS: e.target.value
                      }
                    } : null)}
                    className="bg-gray-900 border-gray-600 text-white font-mono text-sm h-64 resize-none"
                    placeholder="/* Generated CSS for announcement bar and custom styling... */"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Edit the generated CSS or add your own custom styles. This will be applied globally to the site.
                  </p>
                </div>
                
                <Button 
                  onClick={() => updateCSSMutation.mutate({ customCSS: settings.appearance.customCSS })}
                  disabled={updateCSSMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {updateCSSMutation.isPending ? 'Saving...' : 'Save CSS'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ads" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Advertisement Settings</CardTitle>
                <CardDescription className="text-gray-300">
                  Configure ad placements across your site
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(settings.ads).map(([adKey, adConfig]) => (
                  <div key={adKey} className="space-y-4 p-4 border border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label className="text-white capitalize">
                        {adKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Label>
                      <Switch
                        checked={adConfig.enabled}
                        onCheckedChange={(checked) => updateAdSettings(adKey, 'enabled', checked)}
                      />
                    </div>
                    {adConfig.enabled && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`${adKey}Image`} className="text-white">Image URL</Label>
                            <div className="flex gap-2">
                              <Input
                                id={`${adKey}Image`}
                                value={adConfig.imageUrl}
                                onChange={(e) => updateAdSettings(adKey, 'imageUrl', e.target.value)}
                                className="bg-gray-700 border-gray-600 text-white flex-1"
                                placeholder="https://example.com/ad-image.gif"
                              />

                            </div>
                            {adConfig.imageUrl && !adConfig.cloudinaryUrl && (
                              <p className="text-xs text-yellow-400 mt-1">
                                ⚠️ Image URL set but not uploaded. Use "Upload All Ads" button below.
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`${adKey}Click`} className="text-white">Click URL</Label>
                            <Input
                              id={`${adKey}Click`}
                              value={adConfig.clickUrl}
                              onChange={(e) => updateAdSettings(adKey, 'clickUrl', e.target.value)}
                              className="bg-gray-700 border-gray-600 text-white"
                              placeholder="https://example.com"
                            />
                          </div>
                        </div>
                        {adConfig.cloudinaryUrl && (
                          <div>
                            <Label className="text-white">✅ ImgBB Image URL (Ready to use)</Label>
                            <Input
                              value={adConfig.cloudinaryUrl}
                              readOnly
                              className="bg-blue-900/20 border-blue-600 text-blue-300"
                            />
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-blue-400">
                                ✅ Image uploaded to ImgBB successfully! This image is stored in the cloud and optimized for fast loading.
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  const newSettings = {
                                    ...settings,
                                    ads: {
                                      ...settings.ads,
                                      [adKey]: {
                                        ...adConfig,
                                        cloudinaryUrl: ''
                                      }
                                    }
                                  };
                                  setSettings(newSettings);
                                  updateAdsMutation.mutate(newSettings.ads);
                                  toast({
                                    title: "Cleared",
                                    description: "Uploaded image removed. Upload a new image to continue.",
                                  });
                                }}
                                className="text-xs px-2 py-1 h-6"
                              >
                                Clear
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button 
                    onClick={() => updateAdsMutation.mutate(settings.ads)}
                    disabled={updateAdsMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updateAdsMutation.isPending ? 'Saving...' : 'Save All Ads'}
                  </Button>
                  
                  <Button 
                    onClick={uploadAllAds}
                    disabled={uploadAdImageMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {uploadAdImageMutation.isPending ? 'Uploading...' : '☁️ Upload All Ads'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Ad Templates */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Ad Templates</CardTitle>
                <CardDescription className="text-gray-300">
                  Quick ad templates to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Demo Ad Templates */}
                  {[
                    { name: 'Gaming Ad', imageUrl: 'https://picsum.photos/400/200?random=gaming', clickUrl: 'https://gaming-site.com', category: 'Entertainment' },
                    { name: 'Tech Ad', imageUrl: 'https://picsum.photos/400/200?random=tech', clickUrl: 'https://tech-site.com', category: 'Technology' },
                    { name: 'Fashion Ad', imageUrl: 'https://picsum.photos/400/200?random=fashion', clickUrl: 'https://fashion-site.com', category: 'Lifestyle' },
                    { name: 'Food Ad', imageUrl: 'https://picsum.photos/400/200?random=food', clickUrl: 'https://food-site.com', category: 'Food & Drink' },
                    { name: 'Travel Ad', imageUrl: 'https://picsum.photos/400/200?random=travel', clickUrl: 'https://travel-site.com', category: 'Travel' },
                    { name: 'Education Ad', imageUrl: 'https://picsum.photos/400/200?random=education', clickUrl: 'https://edu-site.com', category: 'Education' }
                  ].map((template) => (
                    <div key={template.name} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-blue-400 transition-colors">
                      <img 
                        src={template.imageUrl} 
                        alt={template.name} 
                        className="w-full h-24 object-cover rounded mb-3"
                      />
                      <h4 className="text-white font-medium mb-1">{template.name}</h4>
                      <p className="text-gray-400 text-xs mb-3">{template.category}</p>
                      <Button
                        onClick={() => {
                          // Find first available slot and apply template
                          const availableSlot = Object.keys(settings?.ads || {}).find(key => 
                            !settings?.ads?.[key as keyof typeof settings.ads]?.enabled
                          );
                          if (availableSlot && settings) {
                            const newSettings = {
                              ...settings,
                              ads: {
                                ...settings.ads,
                                [availableSlot]: {
                                  enabled: true,
                                  imageUrl: template.imageUrl,
                                  clickUrl: template.clickUrl
                                }
                              }
                            };
                            setSettings(newSettings);
                            updateAdsMutation.mutate(newSettings.ads);
                            toast({
                              title: "Success",
                              description: `Applied ${template.name} to ${availableSlot}`,
                            });
                          }
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
                      >
                        Apply Template
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="space-y-6">
            {/* Social Media Links - Always Configurable */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Social Media Links</CardTitle>
                <CardDescription className="text-gray-300">
                  Configure social media links used in footer, header, and other components
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="socialDiscordUrl" className="text-white">Discord URL</Label>
                  <Input
                    id="socialDiscordUrl"
                    value={settings.content.socialLinks?.discord || ''}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      content: {
                        ...prev.content,
                        socialLinks: {
                          ...prev.content.socialLinks,
                          discord: e.target.value
                        }
                      }
                    } : null)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="https://discord.gg/your-server"
                  />
                </div>
                <div>
                  <Label htmlFor="socialTelegramUrl" className="text-white">Telegram URL</Label>
                  <Input
                    id="socialTelegramUrl"
                    value={settings.content.socialLinks?.telegram || ''}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      content: {
                        ...prev.content,
                        socialLinks: {
                          ...prev.content.socialLinks,
                          telegram: e.target.value
                        }
                      }
                    } : null)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="https://t.me/your-channel"
                  />
                </div>
                <Button 
                  onClick={() => updateSocialLinksMutation.mutate(settings.content.socialLinks)}
                  disabled={updateSocialLinksMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updateSocialLinksMutation.isPending ? 'Saving...' : 'Save Social Links'}
                </Button>
              </CardContent>
            </Card>

            {/* Floating Social Buttons - Separate Toggle */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Floating Social Buttons</CardTitle>
                <CardDescription className="text-gray-300">
                  Control the floating social media buttons that appear on the website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-white">Enable Floating Social Buttons</Label>
                    <Switch
                      checked={settings.appearance.floatingSocialButtons.enabled}
                      onCheckedChange={(checked) => {
                        setSettings(prev => prev ? {
                          ...prev,
                          appearance: {
                            ...prev.appearance,
                            floatingSocialButtons: {
                              ...prev.appearance.floatingSocialButtons,
                              enabled: checked
                            }
                          }
                        } : null);
                        updateSocialButtonsMutation.mutate({
                          ...settings.appearance.floatingSocialButtons,
                          enabled: checked
                        });
                      }}
                    />
                  </div>
                  
                  {settings.appearance.floatingSocialButtons.enabled && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label className="text-white">Enable Discord Button</Label>
                        <Switch
                          checked={settings.appearance.floatingSocialButtons.discordEnabled}
                          onCheckedChange={(checked) => {
                            setSettings(prev => prev ? {
                              ...prev,
                              appearance: {
                                ...prev.appearance,
                                floatingSocialButtons: {
                                  ...prev.appearance.floatingSocialButtons,
                                  discordEnabled: checked
                                }
                              }
                            } : null);
                            updateSocialButtonsMutation.mutate({
                              ...settings.appearance.floatingSocialButtons,
                              discordEnabled: checked
                            });
                          }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-white">Enable Telegram Button</Label>
                        <Switch
                          checked={settings.appearance.floatingSocialButtons.telegramEnabled}
                          onCheckedChange={(checked) => {
                            setSettings(prev => prev ? {
                              ...prev,
                              appearance: {
                                ...prev.appearance,
                                floatingSocialButtons: {
                                  ...prev.appearance.floatingSocialButtons,
                                  telegramEnabled: checked
                                }
                              }
                            } : null);
                            updateSocialButtonsMutation.mutate({
                              ...settings.appearance.floatingSocialButtons,
                              telegramEnabled: checked
                            });
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
                
                {settings.appearance.floatingSocialButtons.enabled && (
                  <div className="pt-4 border-t border-gray-600">
                    <p className="text-sm text-gray-400 mb-4">
                      Floating buttons will use the social media links configured above
                    </p>
                    <Button 
                      onClick={() => updateSocialButtonsMutation.mutate(settings.appearance.floatingSocialButtons)}
                      disabled={updateSocialButtonsMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {updateSocialButtonsMutation.isPending ? 'Saving...' : 'Save Floating Buttons'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel; 