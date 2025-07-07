import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminSettings {
  isLoggedIn: boolean;
  aboutUsText: string;
  disclaimerText: string;
  discordLink: string;
  telegramLink: string;
  showAnnouncementBar: boolean;
  announcementText: string;
  showFloatingButtons: boolean;
  customCSS: string;
  ads: {
    mainPageAd1: { enabled: boolean; imageUrl: string; clickUrl: string };
    mainPageAd2: { enabled: boolean; imageUrl: string; clickUrl: string };
    mainPageAd3: { enabled: boolean; imageUrl: string; clickUrl: string };
    searchPageAd1: { enabled: boolean; imageUrl: string; clickUrl: string };
    searchPageAd2: { enabled: boolean; imageUrl: string; clickUrl: string };
    moviesPageAdTop: { enabled: boolean; imageUrl: string; clickUrl: string };
    moviesPageAdBottom: { enabled: boolean; imageUrl: string; clickUrl: string };
    showsPageAdTop: { enabled: boolean; imageUrl: string; clickUrl: string };
    showsPageAdBottom: { enabled: boolean; imageUrl: string; clickUrl: string };
    playerPageAd: { enabled: boolean; imageUrl: string; clickUrl: string };
  };
}

interface AdminContextType {
  settings: AdminSettings;
  updateSettings: (newSettings: Partial<AdminSettings>) => void;
  login: (password: string) => boolean;
  logout: () => void;
}

const defaultSettings: AdminSettings = {
  isLoggedIn: false,
  aboutUsText: "CINEMA.FO is your premium destination for streaming the latest movies and TV shows. We provide high-quality content with an exceptional viewing experience, bringing entertainment right to your fingertips.",
  disclaimerText: "All content is provided by third parties. We do not host any files.",
  discordLink: "https://discord.gg/cinema",
  telegramLink: "https://t.me/cinema",
  showAnnouncementBar: false,
  announcementText: "Welcome to CINEMA.FO - Your Premium Streaming Experience!",
  showFloatingButtons: true,
  customCSS: "",
  ads: {
    mainPageAd1: { 
      enabled: true, 
      imageUrl: "https://images.unsplash.com/photo-1489599006593-1e8e12b8e04a?w=600&h=200&fit=crop", 
      clickUrl: "https://example.com/gaming" 
    },
    mainPageAd2: { 
      enabled: true, 
      imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=200&fit=crop", 
      clickUrl: "https://example.com/shopping" 
    },
    mainPageAd3: { 
      enabled: true, 
      imageUrl: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=600&h=200&fit=crop", 
      clickUrl: "https://example.com/travel" 
    },
    searchPageAd1: { 
      enabled: true, 
      imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=200&fit=crop", 
      clickUrl: "https://example.com/tech" 
    },
    searchPageAd2: { 
      enabled: true, 
      imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=200&fit=crop", 
      clickUrl: "https://example.com/food" 
    },
    moviesPageAdTop: { 
      enabled: true, 
      imageUrl: "https://images.unsplash.com/photo-1489599006593-1e8e12b8e04a?w=600&h=200&fit=crop", 
      clickUrl: "https://example.com/entertainment" 
    },
    moviesPageAdBottom: { 
      enabled: true, 
      imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=200&fit=crop", 
      clickUrl: "https://example.com/products" 
    },
    showsPageAdTop: { 
      enabled: true, 
      imageUrl: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=600&h=200&fit=crop", 
      clickUrl: "https://example.com/streaming" 
    },
    showsPageAdBottom: { 
      enabled: true, 
      imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=200&fit=crop", 
      clickUrl: "https://example.com/subscriptions" 
    },
    playerPageAd: { 
      enabled: true, 
      imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=200&fit=crop", 
      clickUrl: "https://example.com/premium" 
    },
  }
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AdminSettings>(() => {
    const saved = localStorage.getItem('admin-settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('admin-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<AdminSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const login = (password: string) => {
    if (password === 'password') {
      setSettings(prev => ({ ...prev, isLoggedIn: true }));
      return true;
    }
    return false;
  };

  const logout = () => {
    setSettings(prev => ({ ...prev, isLoggedIn: false }));
  };

  return (
    <AdminContext.Provider value={{ settings, updateSettings, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};