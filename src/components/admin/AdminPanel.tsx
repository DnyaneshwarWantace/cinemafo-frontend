import React, { useState, useEffect } from 'react';
import { Settings, FileText, Eye, EyeOff, Upload, Save, X, Plus, Trash2, Monitor, Image, Link, BarChart3, Users, Globe, Palette, Shield, Database, Bell, Zap } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import api from '@/services/api';

interface AdminSettings {
  appearance: {
    announcementBar: {
      enabled: boolean;
      text: string;
      backgroundColor: string;
      textColor: string;
    };
    floatingSocialButtons: {
      enabled: boolean;
      discordUrl: string;
      telegramUrl: string;
    };
    customCSS: string;
  };
  content: {
    disclaimer: string;
    aboutUs: string;
    contactEmail: string;
    socialLinks: {
      discord: string;
      telegram: string;
    };
  };
  ads: {
    mainPageAd1: { enabled: boolean; imageUrl: string; clickUrl: string; };
    mainPageAd2: { enabled: boolean; imageUrl: string; clickUrl: string; };
    mainPageAd3: { enabled: boolean; imageUrl: string; clickUrl: string; };
    mainPageAd4: { enabled: boolean; imageUrl: string; clickUrl: string; };
    searchTopAd: { enabled: boolean; imageUrl: string; clickUrl: string; };
    searchBottomAd: { enabled: boolean; imageUrl: string; clickUrl: string; };
    moviesPageAd: { enabled: boolean; imageUrl: string; clickUrl: string; };
    moviesPageBottomAd: { enabled: boolean; imageUrl: string; clickUrl: string; };
    showsPageAd: { enabled: boolean; imageUrl: string; clickUrl: string; };
    showsPageBottomAd: { enabled: boolean; imageUrl: string; clickUrl: string; };
    playerPageAd: { enabled: boolean; imageUrl: string; clickUrl: string; };
  };
}

const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return api.auth.isAuthenticated();
    } catch {
      return false;
    }
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const queryClient = useQueryClient();

  // Check auth status on mount and when URL changes
  useEffect(() => {
    const checkAuth = () => {
      const isAuth = api.auth.isAuthenticated();
      setIsAuthenticated(isAuth);
      if (!isAuth && !window.location.search.includes('login=true')) {
        window.location.href = '/admin?login=true';
      }
    };
    
    checkAuth();
    window.addEventListener('popstate', checkAuth);
    return () => window.removeEventListener('popstate', checkAuth);
  }, []);

  // Fetch all settings
  const { data: settingsData, isLoading, error: settingsError } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      try {
        console.log('Fetching admin settings...');
        const response = await api.settings.getAllSettings();
        console.log('Admin settings response:', response);
        return response;
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        throw error;
      }
    },
    retry: 1,
    enabled: isAuthenticated,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData);
      setError(null);
    }
  }, [settingsData]);

  useEffect(() => {
    if (settingsError) {
      if ((settingsError as any).response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        setIsAuthenticated(false);
      } else {
      setError('Failed to load settings. Please try refreshing the page.');
      }
      console.error('Settings error:', settingsError);
    }
  }, [settingsError]);

  // Update mutations for each settings type
  const updateAnnouncementMutation = useMutation({
    mutationFn: (announcementSettings: { enabled: boolean; text: string; backgroundColor: string; textColor: string }) => 
      api.settings.updateAnnouncement(announcementSettings),
    onSuccess: (data) => {
      queryClient.setQueryData(['siteSettings'], (oldData: any) => ({
        ...oldData,
        appearance: {
          ...oldData.appearance,
          announcementBar: data
        }
      }));
      toast({
        title: "Success",
        description: "Announcement settings saved successfully!",
        variant: "default",
      });
    },
    onError: (error) => {
      setError('Failed to save announcement settings. Please try again.');
      console.error('Error saving announcement settings:', error);
    }
  });

  const updateSocialButtonsMutation = useMutation({
    mutationFn: (socialSettings: { enabled: boolean; discordUrl: string; telegramUrl: string }) => 
      api.settings.updateSocialButtons(socialSettings),
    onSuccess: (data) => {
      queryClient.setQueryData(['siteSettings'], (oldData: any) => ({
        ...oldData,
        appearance: {
          ...oldData.appearance,
          floatingSocialButtons: data
        }
      }));
      toast({
        title: "Success",
        description: "Social buttons settings saved successfully!",
        variant: "default",
      });
    },
    onError: (error) => {
      setError('Failed to save social buttons settings. Please try again.');
      console.error('Error saving social buttons settings:', error);
    }
  });

  const updateContentMutation = useMutation({
    mutationFn: (contentSettings: {
      disclaimer: string;
      aboutUs: string;
      contactEmail: string;
      socialLinks: { discord: string; telegram: string; }
    }) => api.settings.updateContent(contentSettings),
    onSuccess: (data) => {
      queryClient.setQueryData(['siteSettings'], (oldData: any) => ({
        ...oldData,
        content: data
      }));
      toast({
        title: "Success",
        description: "Content settings saved successfully!",
        variant: "default",
      });
    },
    onError: (error) => {
      setError('Failed to save content settings. Please try again.');
      console.error('Error saving content settings:', error);
    }
  });

  const updateAdsMutation = useMutation({
    mutationFn: (adSettings: Record<string, { enabled: boolean; imageUrl: string; clickUrl: string; }>) => 
      api.settings.updateAds(adSettings),
    onSuccess: (data) => {
      queryClient.setQueryData(['siteSettings'], (oldData: any) => ({
        ...oldData,
        ads: data
      }));
      toast({
        title: "Success",
        description: "Ad settings saved successfully!",
        variant: "default",
      });
    },
    onError: (error) => {
      setError('Failed to save ad settings. Please try again.');
      console.error('Error saving ad settings:', error);
    }
  });

  // Individual save handlers for each section
  const handleSaveAnnouncement = () => {
    if (!settings?.appearance?.announcementBar) return;
    // Send complete announcement bar settings
    const announcementSettings = {
      enabled: settings.appearance.announcementBar.enabled,
      text: settings.appearance.announcementBar.text,
      backgroundColor: settings.appearance.announcementBar.backgroundColor,
      textColor: settings.appearance.announcementBar.textColor
    };
    updateAnnouncementMutation.mutate(announcementSettings);
  };

  const handleSaveSocialButtons = () => {
    if (!settings?.appearance?.floatingSocialButtons) return;
    // Only send social buttons settings
    const socialSettings = {
      enabled: settings.appearance.floatingSocialButtons.enabled,
      discordUrl: settings.appearance.floatingSocialButtons.discordUrl,
      telegramUrl: settings.appearance.floatingSocialButtons.telegramUrl
    };
    updateSocialButtonsMutation.mutate(socialSettings);
  };

  const handleSaveContent = () => {
    if (!settings?.content) return;
    // Only send content settings (remove socialLinks since they're handled in appearance)
    const contentSettings = {
      disclaimer: settings.content.disclaimer,
      aboutUs: settings.content.aboutUs,
      contactEmail: settings.content.contactEmail,
      socialLinks: { discord: '', telegram: '' } // Always clear these
    };
    updateContentMutation.mutate(contentSettings);
  };

  const handleSaveAds = () => {
    if (!settings?.ads) return;
    // Only send ads settings
    const adSettings = Object.entries(settings.ads).reduce((acc, [key, value]) => {
      if (value && typeof value === 'object') {
        acc[key] = {
          enabled: value.enabled ?? false,
          imageUrl: value.imageUrl ?? '',
          clickUrl: value.clickUrl ?? ''
        };
      }
      return acc;
    }, {} as Record<string, { enabled: boolean; imageUrl: string; clickUrl: string; }>);
    updateAdsMutation.mutate(adSettings);
  };

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setError(null);
      await api.auth.login(username, password);
        setIsAuthenticated(true);
      // Remove login=true from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      window.history.replaceState({}, '', url.toString());
      // Refetch settings
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
    } catch (err) {
      setError('Login failed. Please check your credentials.');
      console.error('Login error:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    setIsAuthenticated(false);
    queryClient.clear();
    window.location.href = '/admin?login=true';
  };

  const handleDebugSettings = () => {
    console.log('=== DEBUG SETTINGS ===');
    console.log('Current settings state:', settings);
    console.log('LocalStorage adminSettings:', localStorage.getItem('adminSettings'));
    
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('adminSettingsChanged', { detail: settings }));
    
    try {
      const stored = JSON.parse(localStorage.getItem('adminSettings') || '{}');
      console.log('Parsed stored settings:', stored);
    } catch (e) {
      console.error('Error parsing stored settings:', e);
    }
    
    alert('Debug info logged to console. Settings force-saved and triggered.');
  };

  const handleCSSUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    const file = event.target.files?.[0];
    if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
      const css = e.target?.result as string;
      setSettings({
        ...settings,
            appearance: {
          ...settings.appearance,
          customCSS: css
            }
        });
      };
      reader.readAsText(file);
  };

  const updateAdSettings = (adKey: string, field: string, value: any) => {
    if (!settings) return;
    
    const currentAd = settings.ads?.[adKey as keyof typeof settings.ads] || { enabled: false, imageUrl: '', clickUrl: '' };
    
    const newSettings = {
      ...settings,
        ads: {
        ...settings.ads,
          [adKey]: {
          ...currentAd,
            [field]: value
          }
        }
      };
    
    setSettings(newSettings);
    
    // Immediately save the ad settings when a toggle changes
    if (field === 'enabled') {
      updateAdsMutation.mutate(newSettings.ads);
    }
  };

  // Stats for dashboard
  const adStats = {
    total: Object.keys(settings?.ads || {}).length,
    enabled: Object.values(settings?.ads || {}).filter(ad => ad?.enabled).length,
    disabled: Object.values(settings?.ads || {}).length - Object.values(settings?.ads || {}).filter(ad => ad?.enabled).length
  };

  // Function to find first available ad slot in a category
  const findFirstAvailableSlot = (category: string): string | null => {
    if (!settings?.ads) return null;
    
    let categorySlots: string[] = [];
    if (category === 'main') {
      categorySlots = ['mainPageAd1', 'mainPageAd2', 'mainPageAd3', 'mainPageAd4'];
    } else if (category === 'movies') {
      categorySlots = ['moviesPageAd', 'moviesPageBottomAd'];
    } else if (category === 'shows') {
      categorySlots = ['showsPageAd', 'showsPageBottomAd'];
    } else if (category === 'other') {
      categorySlots = ['searchTopAd', 'searchBottomAd', 'playerPageAd'];
    }

    const availableSlot = categorySlots.find(slot => !settings.ads[slot]?.enabled);
    return availableSlot || null;
  };

  // Function to apply template to a specific ad slot
  const applyTemplate = (template: { name: string; imageUrl: string; clickUrl: string; category: string }) => {
    if (!settings) return;

    // Find the first available slot based on category
    const availableSlot = findFirstAvailableSlot(
      template.category === 'Entertainment' || template.category === 'Technology' ? 'main' :
      template.category === 'Lifestyle' || template.category === 'Food & Drink' ? 'movies' :
      template.category === 'Travel' ? 'shows' : 'other'
    );

    if (availableSlot) {
      setSettings(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ads: {
            ...prev.ads,
            [availableSlot]: {
              enabled: true,
              imageUrl: template.imageUrl,
              clickUrl: template.clickUrl
            }
          }
        };
      });
    }
  };

  // Update the UI to show save buttons in each section
  const renderAnnouncementSection = () => (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center">
        <Bell className="w-6 h-6 mr-2 text-blue-400" />
        Announcement Bar
      </h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">Enable Announcement Bar</label>
          <Switch
            checked={settings?.appearance?.announcementBar?.enabled ?? false}
            onCheckedChange={(checked) => {
              if (settings?.appearance?.announcementBar) {
                const newSettings = {
                  ...settings.appearance.announcementBar,
                  enabled: checked
                };
                setSettings({
                  ...settings,
                  appearance: {
                    ...settings.appearance,
                    announcementBar: newSettings
                  }
                });
                updateAnnouncementMutation.mutate(newSettings);
              }
            }}
          />
            </div>
          <div>
          <label className="text-sm font-medium text-gray-300 block mb-2">Announcement Text</label>
          <textarea
            value={settings?.appearance?.announcementBar?.text ?? ''}
            onChange={(e) => {
              if (settings?.appearance?.announcementBar) {
                setSettings({
                  ...settings,
                  appearance: {
                    ...settings.appearance,
                    announcementBar: {
                      ...settings.appearance.announcementBar,
                      text: e.target.value
                    }
                  }
                });
              }
            }}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
            rows={3}
            placeholder="Welcome to CINEMA.FO - Your ultimate streaming destination!"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Background Color</label>
              <input
                type="color"
                value={settings?.appearance?.announcementBar?.backgroundColor ?? '#1e40af'}
                onChange={(e) => {
                  if (settings?.appearance?.announcementBar) {
                    setSettings({
                      ...settings,
                      appearance: {
                        ...settings.appearance,
                        announcementBar: {
                          ...settings.appearance.announcementBar,
                          backgroundColor: e.target.value
                        }
                      }
                    });
                  }
                }}
                className="w-full h-12 bg-white/10 border border-white/20 rounded-xl cursor-pointer"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Text Color</label>
              <input
                type="color"
                value={settings?.appearance?.announcementBar?.textColor ?? '#ffffff'}
                onChange={(e) => {
                  if (settings?.appearance?.announcementBar) {
                    setSettings({
                      ...settings,
                      appearance: {
                        ...settings.appearance,
                        announcementBar: {
                          ...settings.appearance.announcementBar,
                          textColor: e.target.value
                        }
                      }
                    });
                  }
                }}
                className="w-full h-12 bg-white/10 border border-white/20 rounded-xl cursor-pointer"
              />
            </div>
          </div>
          {/* Preview */}
          {settings?.appearance?.announcementBar?.enabled && settings?.appearance?.announcementBar?.text && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-300 block mb-2">Preview</label>
              <div 
                className="w-full rounded-xl p-4 border border-white/20 relative overflow-hidden"
                style={{ 
                  backgroundColor: settings.appearance.announcementBar.backgroundColor || '#1e40af',
                  background: `linear-gradient(135deg, ${settings.appearance.announcementBar.backgroundColor || '#1e40af'}ee, ${settings.appearance.announcementBar.backgroundColor || '#1e40af'}cc)`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                <div className="relative text-center">
                  <p 
                    className="text-sm font-medium"
                    style={{ 
                      color: settings.appearance.announcementBar.textColor || '#ffffff',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                    }}
                  >
                    {settings.appearance.announcementBar.text}
                  </p>
                </div>
              </div>
            </div>
          )}
        <div className="flex justify-end">
          <button
            onClick={handleSaveAnnouncement}
            disabled={updateAnnouncementMutation.isPending}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-4 py-2 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {updateAnnouncementMutation.isPending ? 'Saving...' : 'Save Announcement Settings'}
            </button>
          </div>
        </div>
      </div>
    );

  const renderSocialButtonsSection = () => (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center">
        <Globe className="w-6 h-6 mr-2 text-blue-400" />
        Social Buttons
      </h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">Enable Social Buttons</label>
          <Switch
            checked={settings?.appearance?.floatingSocialButtons?.enabled ?? false}
            onCheckedChange={(checked) => {
              if (settings?.appearance?.floatingSocialButtons) {
                const newSettings = {
                  ...settings.appearance.floatingSocialButtons,
                  enabled: checked
                };
                setSettings({
                  ...settings,
                  appearance: {
                    ...settings.appearance,
                    floatingSocialButtons: newSettings
                  }
                });
                updateSocialButtonsMutation.mutate(newSettings);
              }
            }}
          />
        </div>
        {settings?.appearance?.floatingSocialButtons?.enabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-2">Discord URL</label>
              <input
                type="url"
                value={settings?.appearance?.floatingSocialButtons?.discordUrl ?? ''}
                onChange={(e) => setSettings(prev => prev ? {
                  ...prev,
                  appearance: {
                    ...prev.appearance,
                    floatingSocialButtons: {
                      ...prev.appearance.floatingSocialButtons,
                      discordUrl: e.target.value
                    }
                  }
                } : null)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                placeholder="https://discord.gg/your-server"
              />
      </div>
            <div>
              <label className="block text-gray-300 text-sm mb-2">Telegram URL</label>
              <input
                type="url"
                value={settings?.appearance?.floatingSocialButtons?.telegramUrl ?? ''}
                onChange={(e) => setSettings(prev => prev ? {
                  ...prev,
                  appearance: {
                    ...prev.appearance,
                    floatingSocialButtons: {
                      ...prev.appearance.floatingSocialButtons,
                      telegramUrl: e.target.value
                    }
                  }
                } : null)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                placeholder="https://t.me/your-channel"
              />
            </div>
          </div>
        )}
        <div className="flex justify-end">
          <button
            onClick={handleSaveSocialButtons}
            disabled={updateSocialButtonsMutation.isPending}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-4 py-2 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {updateSocialButtonsMutation.isPending ? 'Saving...' : 'Save Social Button Settings'}
          </button>
        </div>
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md border border-white/20 shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
              CINEMA.FO
            </h1>
            <p className="text-gray-300">Admin Dashboard</p>
          </div>
          
          <div className="space-y-6 mt-8">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-white text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                placeholder="Enter username"
                disabled={isLoggingIn}
              />
            </div>
            
            <div>
              <label className="block text-white text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all pr-12"
                  placeholder="Enter password"
                  onKeyPress={(e) => e.key === 'Enter' && !isLoggingIn && handleLogin()}
                  disabled={isLoggingIn}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  disabled={isLoggingIn}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            
            <button
              onClick={handleLogin}
              disabled={isLoggingIn || !username || !password}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg flex items-center justify-center space-x-2"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Access Dashboard</span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center text-red-600">
          <p className="text-lg">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center text-red-600">
          <p className="text-lg">No settings data available. Please contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  CINEMA.FO Admin
                </h1>
                <p className="text-gray-300 text-sm">Content Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/"
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all duration-200 flex items-center space-x-2 border border-white/20"
              >
                <Globe size={16} />
                <span>View Site</span>
              </a>
              <button
                onClick={handleLogout}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-xl transition-all duration-200 border border-red-500/30"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'ads', label: 'Advertisement', icon: Image },
              { id: 'content', label: 'Content', icon: FileText },
              { id: 'appearance', label: 'Appearance', icon: Palette }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-4 border-b-2 font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-gray-300 hover:text-white hover:border-gray-600'
                }`}
              >
                <tab.icon size={20} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h2>
              <p className="text-gray-300">Monitor your platform's performance and settings</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Total Ads</p>
                    <p className="text-3xl font-bold text-white">{adStats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Image className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Active Ads</p>
                    <p className="text-3xl font-bold text-green-400">{adStats.enabled}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Disabled Ads</p>
                    <p className="text-3xl font-bold text-red-400">{adStats.disabled}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                    <X className="w-6 h-6 text-red-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Announcement</p>
                    <p className="text-3xl font-bold text-purple-400">
                      {settings?.appearance?.announcementBar?.enabled ? 'ON' : 'OFF'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Bell className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    if (!settings) return;
                    const demoSettings = {
                      ...settings,
                      ads: {
                        mainPageAd1: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=1', clickUrl: 'https://example.com' },
                        mainPageAd2: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=2', clickUrl: 'https://example.com' },
                        mainPageAd3: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=3', clickUrl: 'https://example.com' },
                        mainPageAd4: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=4', clickUrl: 'https://example.com' },
                        searchTopAd: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=5', clickUrl: 'https://example.com' },
                        searchBottomAd: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=6', clickUrl: 'https://example.com' },
                        moviesPageAd: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=7', clickUrl: 'https://example.com' },
                        moviesPageBottomAd: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=11', clickUrl: 'https://example.com' },
                        showsPageAd: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=8', clickUrl: 'https://example.com' },
                        showsPageBottomAd: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=12', clickUrl: 'https://example.com' },
                        playerPageAd: { enabled: true, imageUrl: 'https://picsum.photos/800/200?random=10', clickUrl: 'https://example.com' }
                      }
                    };
                    setSettings(demoSettings);
                    alert('Demo ads enabled! Check all pages to see them.');
                  }}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-4 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <Zap className="w-5 h-5 mb-2" />
                  <div className="text-sm font-medium">Enable All Demo Ads</div>
                </button>

                <button
                  onClick={() => {
                    if (!settings) return;
                    const disabledSettings = {
                      ...settings,
                      ads: Object.keys(settings.ads || {}).reduce((acc, key) => {
                        acc[key] = { enabled: false, imageUrl: '', clickUrl: '' };
                        return acc;
                      }, {} as any)
                    };
                    setSettings(disabledSettings);
                    alert('All ads disabled!');
                  }}
                  className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-6 py-4 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <X className="w-5 h-5 mb-2" />
                  <div className="text-sm font-medium">Disable All Ads</div>
                </button>

                <button
                  onClick={handleDebugSettings}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-4 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <Settings className="w-5 h-5 mb-2" />
                  <div className="text-sm font-medium">Debug Settings</div>
                </button>
                <button
                  onClick={() => {
                    // Force trigger floating buttons
                    console.log('Forcing floating buttons update');
                    const currentSettings = JSON.parse(localStorage.getItem('adminSettings') || '{}');
                    window.dispatchEvent(new CustomEvent('adminSettingsChanged', { detail: currentSettings }));
                    alert('Floating buttons settings refreshed! Check console for debug info.');
                  }}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-6 py-4 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <Users className="w-5 h-5 mb-2" />
                  <div className="text-sm font-medium">Refresh Social Buttons</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Advertisement Management */}
        {activeTab === 'ads' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Advertisement Management</h2>
              <p className="text-gray-300">Manage ads across all pages of your platform</p>
            </div>

            {/* Ad Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-sm font-medium">Home Page</p>
                    <p className="text-2xl font-bold text-white">
                      {Object.entries(settings?.ads || {})
                        .filter(([key]) => key.startsWith('mainPage'))
                        .filter(([, ad]) => ad?.enabled).length}/4
                    </p>
                    <p className="text-blue-200 text-xs">Active Ads</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Monitor className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-300 text-sm font-medium">Movies & Shows</p>
                    <p className="text-2xl font-bold text-white">
                      {Object.entries(settings?.ads || {})
                        .filter(([key]) => key.includes('movies') || key.includes('shows'))
                        .filter(([, ad]) => ad?.enabled).length}/4
                    </p>
                    <p className="text-green-200 text-xs">Active Ads</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-300 text-sm font-medium">Search & Other</p>
                    <p className="text-2xl font-bold text-white">
                      {Object.entries(settings?.ads || {})
                        .filter(([key]) => key.includes('search') || key.includes('upcoming') || key.includes('player'))
                        .filter(([, ad]) => ad?.enabled).length}/5
                    </p>
                    <p className="text-purple-200 text-xs">Active Ads</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Globe className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 backdrop-blur-xl rounded-2xl p-6 border border-orange-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-300 text-sm font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-white">{adStats.enabled}</p>
                    <p className="text-orange-200 text-xs">Active Campaigns</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-orange-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Page-wise Ad Management */}
            <div className="space-y-6">
              {/* Home Page Ads */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 p-6 border-b border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500/30 rounded-xl flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Home Page Advertisements</h3>
                        <p className="text-blue-200 text-sm">Main landing page ad placements</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-300 text-sm">
                        {Object.entries(settings?.ads || {})
                          .filter(([key]) => key.startsWith('mainPage'))
                          .filter(([, ad]) => ad?.enabled).length} / 4 Active
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {['mainPageAd1', 'mainPageAd2', 'mainPageAd3', 'mainPageAd4'].map((adKey, index) => (
                    <div key={adKey} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-blue-400/30 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            settings?.ads?.[adKey as keyof typeof settings.ads]?.enabled 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            <Image className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-white font-medium">Ad Slot {index + 1}</h4>
                            <p className="text-gray-400 text-xs">Position: {index === 0 ? 'After Trending' : index === 1 ? 'After Top Rated' : index === 2 ? 'After TV Shows' : 'Bottom'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings?.ads?.[adKey as keyof typeof settings.ads]?.enabled ?? false}
                              onChange={(e) => updateAdSettings(adKey, 'enabled', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                      
                      {settings?.ads?.[adKey as keyof typeof settings.ads]?.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Image URL</label>
                            <input
                              type="url"
                              value={settings?.ads?.[adKey as keyof typeof settings.ads]?.imageUrl ?? ''}
                              onChange={(e) => updateAdSettings(adKey, 'imageUrl', e.target.value)}
                              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                              placeholder="https://example.com/ad-image.jpg"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Click URL</label>
                            <input
                              type="url"
                              value={settings?.ads?.[adKey as keyof typeof settings.ads]?.clickUrl ?? ''}
                              onChange={(e) => updateAdSettings(adKey, 'clickUrl', e.target.value)}
                              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                              placeholder="https://example.com/landing-page"
                            />
                          </div>
                          {settings?.ads?.[adKey as keyof typeof settings.ads]?.imageUrl && (
                            <div className="md:col-span-2">
                              <label className="block text-gray-300 text-sm mb-2">Preview</label>
                              <div className="relative">
                                <img 
                                  src={settings?.ads?.[adKey as keyof typeof settings.ads]?.imageUrl} 
                                  alt="Ad Preview" 
                                  className="w-full h-32 object-cover rounded-lg border border-white/20"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://via.placeholder.com/400x100/1e40af/ffffff?text=Invalid+Image+URL';
                                  }}
                                />
                                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                  Preview
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Movies Page Ads */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 p-6 border-b border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500/30 rounded-xl flex items-center justify-center">
                        <FileText className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Movies Page Advertisements</h3>
                        <p className="text-green-200 text-sm">Movie browsing page ad placements</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-300 text-sm">
                        {Object.entries(settings?.ads || {})
                          .filter(([key]) => key.includes('movies'))
                          .filter(([, ad]) => ad?.enabled).length} / 2 Active
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    { key: 'moviesPageAd', label: 'Top Ad', position: 'Above movie grid' },
                    { key: 'moviesPageBottomAd', label: 'Bottom Ad', position: 'Below movie grid' }
                  ].map((ad) => (
                    <div key={ad.key} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-green-400/30 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            settings?.ads?.[ad.key as keyof typeof settings.ads]?.enabled 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            <Image className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{ad.label}</h4>
                            <p className="text-gray-400 text-xs">Position: {ad.position}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings?.ads?.[ad.key as keyof typeof settings.ads]?.enabled ?? false}
                            onChange={(e) => updateAdSettings(ad.key, 'enabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>
                      
                      {settings?.ads?.[ad.key as keyof typeof settings.ads]?.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Image URL</label>
                            <input
                              type="url"
                              value={settings?.ads?.[ad.key as keyof typeof settings.ads]?.imageUrl ?? ''}
                              onChange={(e) => updateAdSettings(ad.key, 'imageUrl', e.target.value)}
                              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/50 transition-all"
                              placeholder="https://example.com/ad-image.jpg"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Click URL</label>
                            <input
                              type="url"
                              value={settings?.ads?.[ad.key as keyof typeof settings.ads]?.clickUrl ?? ''}
                              onChange={(e) => updateAdSettings(ad.key, 'clickUrl', e.target.value)}
                              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/50 transition-all"
                              placeholder="https://example.com/landing-page"
                            />
                          </div>
                          {settings?.ads?.[ad.key as keyof typeof settings.ads]?.imageUrl && (
                            <div className="md:col-span-2">
                              <label className="block text-gray-300 text-sm mb-2">Preview</label>
                              <div className="relative">
                                <img 
                                  src={settings?.ads?.[ad.key as keyof typeof settings.ads]?.imageUrl} 
                                  alt="Ad Preview" 
                                  className="w-full h-32 object-cover rounded-lg border border-white/20"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://via.placeholder.com/400x100/22c55e/ffffff?text=Invalid+Image+URL';
                                  }}
                                />
                                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                  Preview
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Shows Page Ads */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 p-6 border-b border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-500/30 rounded-xl flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">TV Shows Page Advertisements</h3>
                        <p className="text-purple-200 text-sm">TV shows browsing page ad placements</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-purple-300 text-sm">
                        {Object.entries(settings?.ads || {})
                          .filter(([key]) => key.includes('shows'))
                          .filter(([, ad]) => ad?.enabled).length} / 2 Active
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    { key: 'showsPageAd', label: 'Top Ad', position: 'Above shows grid' },
                    { key: 'showsPageBottomAd', label: 'Bottom Ad', position: 'Below shows grid' }
                  ].map((ad) => (
                    <div key={ad.key} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-400/30 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            settings?.ads?.[ad.key as keyof typeof settings.ads]?.enabled 
                              ? 'bg-purple-500/20 text-purple-400' 
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            <Image className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{ad.label}</h4>
                            <p className="text-gray-400 text-xs">Position: {ad.position}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings?.ads?.[ad.key as keyof typeof settings.ads]?.enabled ?? false}
                            onChange={(e) => updateAdSettings(ad.key, 'enabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                      
                      {settings?.ads?.[ad.key as keyof typeof settings.ads]?.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Image URL</label>
                            <input
                              type="url"
                              value={settings?.ads?.[ad.key as keyof typeof settings.ads]?.imageUrl ?? ''}
                              onChange={(e) => updateAdSettings(ad.key, 'imageUrl', e.target.value)}
                              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all"
                              placeholder="https://example.com/ad-image.jpg"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Click URL</label>
                            <input
                              type="url"
                              value={settings?.ads?.[ad.key as keyof typeof settings.ads]?.clickUrl ?? ''}
                              onChange={(e) => updateAdSettings(ad.key, 'clickUrl', e.target.value)}
                              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all"
                              placeholder="https://example.com/landing-page"
                            />
                          </div>
                          {settings?.ads?.[ad.key as keyof typeof settings.ads]?.imageUrl && (
                            <div className="md:col-span-2">
                              <label className="block text-gray-300 text-sm mb-2">Preview</label>
                              <div className="relative">
                                <img 
                                  src={settings?.ads?.[ad.key as keyof typeof settings.ads]?.imageUrl} 
                                  alt="Ad Preview" 
                                  className="w-full h-32 object-cover rounded-lg border border-white/20"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://via.placeholder.com/400x100/a855f7/ffffff?text=Invalid+Image+URL';
                                  }}
                                />
                                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                  Preview
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Search and Other Ads */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 p-6 border-b border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-500/30 rounded-xl flex items-center justify-center">
                        <Globe className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Search & Other Pages</h3>
                        <p className="text-orange-200 text-sm">Search, upcoming, and player page ads</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-orange-300 text-sm">
                        {Object.entries(settings?.ads || {})
                          .filter(([key]) => key.includes('search') || key.includes('upcoming') || key.includes('player'))
                          .filter(([, ad]) => ad?.enabled).length} / 5 Active
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    { key: 'searchTopAd', label: 'Search Top Ad', position: 'Above search results' },
                    { key: 'searchBottomAd', label: 'Search Bottom Ad', position: 'Below search results' },
                    { key: 'playerPageAd', label: 'Player Ad', position: 'In video player modal' }
                  ].map((ad) => (
                    <div key={ad.key} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-orange-400/30 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            settings?.ads?.[ad.key as keyof typeof settings.ads]?.enabled 
                              ? 'bg-orange-500/20 text-orange-400' 
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            <Image className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{ad.label}</h4>
                            <p className="text-gray-400 text-xs">Position: {ad.position}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings?.ads?.[ad.key as keyof typeof settings.ads]?.enabled ?? false}
                            onChange={(e) => updateAdSettings(ad.key, 'enabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>
                      
                      {settings?.ads?.[ad.key as keyof typeof settings.ads]?.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Image URL</label>
                            <input
                              type="url"
                              value={settings?.ads?.[ad.key as keyof typeof settings.ads]?.imageUrl ?? ''}
                              onChange={(e) => updateAdSettings(ad.key, 'imageUrl', e.target.value)}
                              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50 transition-all"
                              placeholder="https://example.com/ad-image.jpg"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">Click URL</label>
                            <input
                              type="url"
                              value={settings?.ads?.[ad.key as keyof typeof settings.ads]?.clickUrl ?? ''}
                              onChange={(e) => updateAdSettings(ad.key, 'clickUrl', e.target.value)}
                              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50 transition-all"
                              placeholder="https://example.com/landing-page"
                            />
                          </div>
                          {settings?.ads?.[ad.key as keyof typeof settings.ads]?.imageUrl && (
                            <div className="md:col-span-2">
                              <label className="block text-gray-300 text-sm mb-2">Preview</label>
                              <div className="relative">
                                <img 
                                  src={settings?.ads?.[ad.key as keyof typeof settings.ads]?.imageUrl} 
                                  alt="Ad Preview" 
                                  className="w-full h-32 object-cover rounded-lg border border-white/20"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://via.placeholder.com/400x100/f97316/ffffff?text=Invalid+Image+URL';
                                  }}
                                />
                                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                  Preview
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Ad Library/History */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500/20 to-indigo-600/20 p-6 border-b border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-500/30 rounded-xl flex items-center justify-center">
                        <Database className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Ad Library & Templates</h3>
                        <p className="text-indigo-200 text-sm">Pre-made ads and previously used campaigns</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Demo Ad Templates */}
                    {[
                      { name: 'Gaming Ad', imageUrl: 'https://picsum.photos/400/200?random=gaming', clickUrl: 'https://gaming-site.com', category: 'Entertainment' },
                      { name: 'Tech Ad', imageUrl: 'https://picsum.photos/400/200?random=tech', clickUrl: 'https://tech-site.com', category: 'Technology' },
                      { name: 'Fashion Ad', imageUrl: 'https://picsum.photos/400/200?random=fashion', clickUrl: 'https://fashion-site.com', category: 'Lifestyle' },
                      { name: 'Food Ad', imageUrl: 'https://picsum.photos/400/200?random=food', clickUrl: 'https://food-site.com', category: 'Food & Drink' },
                      { name: 'Travel Ad', imageUrl: 'https://picsum.photos/400/200?random=travel', clickUrl: 'https://travel-site.com', category: 'Travel' },
                      { name: 'Education Ad', imageUrl: 'https://picsum.photos/400/200?random=education', clickUrl: 'https://edu-site.com', category: 'Education' }
                    ].map((template, index) => (
                      <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-indigo-400/30 transition-all">
                        <div className="relative mb-3">
                          <img 
                            src={template.imageUrl} 
                            alt={template.name}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <div className="absolute top-2 left-2 bg-indigo-500/80 text-white text-xs px-2 py-1 rounded">
                            {template.category}
                          </div>
                        </div>
                        <h4 className="text-white font-medium text-sm mb-2">{template.name}</h4>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => applyTemplate(template)}
                            className={`flex-1 ${
                              findFirstAvailableSlot(
                                template.category === 'Entertainment' || template.category === 'Technology' ? 'main' :
                                template.category === 'Lifestyle' || template.category === 'Food & Drink' ? 'movies' :
                                template.category === 'Travel' ? 'shows' : 'other'
                              ) ? 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300' : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                            } text-xs px-3 py-2 rounded-lg transition-all`}
                            disabled={!findFirstAvailableSlot(
                              template.category === 'Entertainment' || template.category === 'Technology' ? 'main' :
                              template.category === 'Lifestyle' || template.category === 'Food & Drink' ? 'movies' :
                              template.category === 'Travel' ? 'shows' : 'other'
                            )}
                          >
                            {findFirstAvailableSlot(
                              template.category === 'Entertainment' || template.category === 'Technology' ? 'main' :
                              template.category === 'Lifestyle' || template.category === 'Food & Drink' ? 'movies' :
                              template.category === 'Travel' ? 'shows' : 'other'
                            ) ? 'Use Template' : 'No Slots Available'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Management */}
        {activeTab === 'content' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Content Management</h2>
              <p className="text-gray-300">Manage site content and social links</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-6">Site Information</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Disclaimer</label>
                  <textarea
                    value={settings?.content?.disclaimer ?? ''}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      content: { ...prev.content, disclaimer: e.target.value }
                    } : null)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all h-24"
                    placeholder="Enter disclaimer text..."
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-2">About Us</label>
                  <textarea
                    value={settings?.content?.aboutUs ?? ''}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      content: { ...prev.content, aboutUs: e.target.value }
                    } : null)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all h-24"
                    placeholder="Enter about us text..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appearance */}
        {activeTab === 'appearance' && (
          <div className="space-y-8">
            {renderAnnouncementSection()}
            {renderSocialButtonsSection()}
                  </div>
                )}
            </div>

      {/* Conditional Fixed Save Button */}
      {activeTab !== 'dashboard' && (
        <div className="fixed bottom-8 right-8 z-50">
        <button
            onClick={() => {
              switch (activeTab) {
                case 'appearance':
                  handleSaveAnnouncement();
                  handleSaveSocialButtons();
                  break;
                case 'content':
                  handleSaveContent();
                  break;
                case 'ads':
                  handleSaveAds();
                  break;
              }
            }}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>
              {activeTab === 'appearance' && 'Save Appearance Settings'}
              {activeTab === 'content' && 'Save Content Settings'}
              {activeTab === 'ads' && 'Save Ad Settings'}
            </span>
        </button>
      </div>
      )}
    </div>
  );
};

export default AdminPanel; 