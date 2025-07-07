import React from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image, ExternalLink, Eye, EyeOff } from 'lucide-react';

const AdManagement: React.FC = () => {
  const { settings, updateSettings } = useAdmin();

  const adSpotLabels: Record<string, { title: string; description: string; location: string }> = {
    mainPageAd1: { title: 'Main Page Ad 1', description: 'First ad on homepage after trending section', location: 'Home Page' },
    mainPageAd2: { title: 'Main Page Ad 2', description: 'Second ad on homepage after top rated section', location: 'Home Page' },
    mainPageAd3: { title: 'Main Page Ad 3', description: 'Third ad on homepage after trending shows section', location: 'Home Page' },
    searchPageAd1: { title: 'Search Page Ad 1', description: 'Ad at the top of search page', location: 'Search Page' },
    searchPageAd2: { title: 'Search Page Ad 2', description: 'Ad at the bottom of search page', location: 'Search Page' },
    moviesPageAdTop: { title: 'Movies Page Top Ad', description: 'Ad at the top of movies page', location: 'Movies Page' },
    moviesPageAdBottom: { title: 'Movies Page Bottom Ad', description: 'Ad at the bottom of movies page', location: 'Movies Page' },
    showsPageAdTop: { title: 'Shows Page Top Ad', description: 'Ad at the top of shows page', location: 'TV Shows Page' },
    showsPageAdBottom: { title: 'Shows Page Bottom Ad', description: 'Ad at the bottom of shows page', location: 'TV Shows Page' },
    playerPageAd: { title: 'Player Page Ad', description: 'Ad shown in video player area', location: 'Video Player' },
  };

  const getLocationColor = (location: string) => {
    switch (location) {
      case 'Home Page': return 'bg-blue-500/20 text-blue-400';
      case 'Search Page': return 'bg-green-500/20 text-green-400';
      case 'Movies Page': return 'bg-purple-500/20 text-purple-400';
      case 'TV Shows Page': return 'bg-orange-500/20 text-orange-400';
      case 'Video Player': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-gray-300 text-sm bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
        <h4 className="font-medium text-white mb-2">Ad Management Guidelines:</h4>
        <ul className="space-y-1 text-xs">
          <li>• Use high-quality images with recommended size of 600x200 pixels</li>
          <li>• Ensure click URLs are valid and lead to appropriate destinations</li>
          <li>• Ads are displayed with a professional "Sponsored" label</li>
          <li>• Toggle ads on/off without losing their configuration</li>
        </ul>
      </div>

      <div className="grid gap-6">
        {Object.entries(settings.ads).map(([key, ad]) => {
          const adInfo = adSpotLabels[key];
          return (
            <Card key={key} className="bg-gray-800/30 border-gray-700/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Image size={18} />
                    {adInfo.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getLocationColor(adInfo.location)}>
                      {adInfo.location}
                    </Badge>
                    {ad.enabled ? (
                      <Badge className="bg-green-500/20 text-green-400">
                        <Eye size={12} className="mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-500/20 text-gray-400">
                        <EyeOff size={12} className="mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-gray-400 text-sm">{adInfo.description}</p>
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
                  <Label className="text-white">Enable Advertisement</Label>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white flex items-center gap-2">
                      <Image size={14} />
                      Image URL
                    </Label>
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
                      className="bg-gray-700/50 border-gray-600/50 text-white"
                      placeholder="https://example.com/ad-image.jpg"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-white flex items-center gap-2">
                      <ExternalLink size={14} />
                      Click URL (Optional)
                    </Label>
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
                      className="bg-gray-700/50 border-gray-600/50 text-white"
                      placeholder="https://example.com/destination"
                    />
                  </div>
                </div>

                {/* Preview */}
                {ad.enabled && ad.imageUrl && (
                  <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
                    <Label className="text-white text-sm mb-2 block">Preview:</Label>
                    <div className="relative bg-gradient-to-br from-gray-800/40 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30 max-w-md">
                      <div className="absolute top-2 left-2 text-xs text-gray-400 bg-gray-900/70 px-2 py-1 rounded-full border border-gray-600/50">
                        Sponsored
                      </div>
                      <div className="relative overflow-hidden rounded-lg">
                        <img
                          src={ad.imageUrl}
                          alt="Ad Preview"
                          className="w-full h-auto max-h-32 object-cover rounded-lg"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdManagement;