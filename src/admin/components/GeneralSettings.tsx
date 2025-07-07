import React from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, Type, FileText, Code, Eye } from 'lucide-react';

const GeneralSettings: React.FC = () => {
  const { settings, updateSettings } = useAdmin();

  return (
    <div className="space-y-6">
      {/* Announcement Bar */}
      <Card className="bg-gray-800/30 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Megaphone size={18} />
            Announcement Bar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              className="bg-gray-700/50 border-gray-600/50 text-white"
              placeholder="Enter announcement text"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content Settings */}
      <Card className="bg-gray-800/30 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Type size={18} />
            Content Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">About Us Text</Label>
            <Textarea
              value={settings.aboutUsText}
              onChange={(e) => updateSettings({ aboutUsText: e.target.value })}
              className="bg-gray-700/50 border-gray-600/50 text-white min-h-[100px]"
              placeholder="Enter about us text"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Disclaimer Text</Label>
            <Textarea
              value={settings.disclaimerText}
              onChange={(e) => updateSettings({ disclaimerText: e.target.value })}
              className="bg-gray-700/50 border-gray-600/50 text-white min-h-[100px]"
              placeholder="Enter disclaimer text"
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom CSS */}
      <Card className="bg-gray-800/30 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Code size={18} />
            Custom CSS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Custom CSS Code</Label>
            <Textarea
              value={settings.customCSS}
              onChange={(e) => updateSettings({ customCSS: e.target.value })}
              className="bg-gray-700/50 border-gray-600/50 text-white min-h-[200px] font-mono text-sm"
              placeholder="Enter custom CSS code..."
            />
            <p className="text-gray-400 text-xs">
              Add custom CSS to override default styles. Changes take effect immediately.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* UI Features */}
      <Card className="bg-gray-800/30 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Eye size={18} />
            UI Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.showFloatingButtons}
              onCheckedChange={(checked) =>
                updateSettings({ showFloatingButtons: checked })
              }
            />
            <Label className="text-white">Show Floating Social Buttons (Desktop)</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralSettings;