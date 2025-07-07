import React from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, MessageCircle, Send, CheckCircle, XCircle } from 'lucide-react';

const SocialSettings: React.FC = () => {
  const { settings, updateSettings } = useAdmin();

  const isValidUrl = (url: string) => {
    if (!url) return null;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-gray-300 text-sm bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
        <h4 className="font-medium text-white mb-2">Social Media Integration:</h4>
        <ul className="space-y-1 text-xs">
          <li>• Add your community links to appear in the floating social buttons</li>
          <li>• Links will open in new tabs for better user experience</li>
          <li>• Ensure URLs are complete with https:// prefix</li>
          <li>• Empty fields will hide the corresponding social buttons</li>
        </ul>
      </div>

      <div className="grid gap-6">
        {/* Discord Link */}
        <Card className="bg-gray-800/30 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <MessageCircle size={18} className="text-purple-400" />
              Discord Community
              {settings.discordLink && (
                <Badge className={`${isValidUrl(settings.discordLink) ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {isValidUrl(settings.discordLink) ? (
                    <>
                      <CheckCircle size={12} className="mr-1" />
                      Valid
                    </>
                  ) : (
                    <>
                      <XCircle size={12} className="mr-1" />
                      Invalid URL
                    </>
                  )}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2">
                <ExternalLink size={14} />
                Discord Invite Link
              </Label>
              <Input
                value={settings.discordLink}
                onChange={(e) => updateSettings({ discordLink: e.target.value })}
                className="bg-gray-700/50 border-gray-600/50 text-white"
                placeholder="https://discord.gg/your-server"
              />
              <p className="text-gray-400 text-xs">
                Add your Discord server invite link to connect with your community
              </p>
            </div>
            
            {settings.discordLink && isValidUrl(settings.discordLink) && (
              <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
                <Label className="text-white text-sm mb-2 block">Preview:</Label>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                    <MessageCircle size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Join Discord</p>
                    <p className="text-gray-400 text-xs">Connect with the community</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Telegram Link */}
        <Card className="bg-gray-800/30 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Send size={18} className="text-blue-400" />
              Telegram Channel
              {settings.telegramLink && (
                <Badge className={`${isValidUrl(settings.telegramLink) ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {isValidUrl(settings.telegramLink) ? (
                    <>
                      <CheckCircle size={12} className="mr-1" />
                      Valid
                    </>
                  ) : (
                    <>
                      <XCircle size={12} className="mr-1" />
                      Invalid URL
                    </>
                  )}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2">
                <ExternalLink size={14} />
                Telegram Channel/Group Link
              </Label>
              <Input
                value={settings.telegramLink}
                onChange={(e) => updateSettings({ telegramLink: e.target.value })}
                className="bg-gray-700/50 border-gray-600/50 text-white"
                placeholder="https://t.me/your-channel"
              />
              <p className="text-gray-400 text-xs">
                Add your Telegram channel or group link for community updates
              </p>
            </div>
            
            {settings.telegramLink && isValidUrl(settings.telegramLink) && (
              <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
                <Label className="text-white text-sm mb-2 block">Preview:</Label>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <Send size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Join Telegram</p>
                    <p className="text-gray-400 text-xs">Get latest updates</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SocialSettings;