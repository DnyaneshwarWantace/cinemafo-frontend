import React from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Image, Globe, LogOut, Users, BarChart3, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GeneralSettings from './components/GeneralSettings';
import AdManagement from './components/AdManagement';
import SocialSettings from './components/SocialSettings';

const AdminDashboard: React.FC = () => {
  const { settings, logout } = useAdmin();
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your changes have been saved successfully.",
    });
  };

  const stats = [
    { title: 'Active Ads', value: Object.values(settings.ads).filter(ad => ad.enabled).length, icon: Image },
    { title: 'Total Ad Spots', value: Object.keys(settings.ads).length, icon: BarChart3 },
    { title: 'Social Links', value: [settings.discordLink, settings.telegramLink].filter(Boolean).length, icon: Globe },
    { title: 'Features Active', value: [settings.showAnnouncementBar, settings.showFloatingButtons].filter(Boolean).length, icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-purple-900/10"></div>
      
      <div className="container mx-auto px-4 py-8 relative">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <div className="text-xl bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              CINEMA.FO Control Panel
            </div>
            <p className="text-gray-400 mt-2">Manage your streaming platform settings</p>
          </div>
          <Button 
            onClick={logout} 
            variant="outline" 
            className="border-gray-600 text-white hover:bg-gray-800/50 backdrop-blur-sm"
          >
            <LogOut size={16} className="mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-medium">{stat.title}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className="p-3 bg-blue-600/10 rounded-full">
                    <stat.icon className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <TabsTrigger 
              value="general" 
              className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <Settings size={16} className="mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger 
              value="ads" 
              className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <Image size={16} className="mr-2" />
              Advertisements
            </TabsTrigger>
            <TabsTrigger 
              value="social" 
              className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <Globe size={16} className="mr-2" />
              Social Links
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings size={20} />
                  General Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GeneralSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ads">
            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Image size={20} />
                  Advertisement Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AdManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social">
            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe size={20} />
                  Social Media Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SocialSettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <Button 
            onClick={handleSave} 
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
          >
            Save All Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;