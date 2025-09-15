import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Plus, Copy, Eye, Edit, Trash2, BarChart3, Users, MousePointer, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';
const BACKEND_SERVER_URL = import.meta.env.VITE_BACKEND_SERVER_URL || 'http://localhost:5000';

interface Referral {
  _id: string;
  code: string;
  name: string;
  description?: string;
  campaign?: string;
  source?: string;
  visits: number;
  uniqueVisits: number;
  conversions: number;
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
}

interface ReferralStats {
  totalReferrals: number;
  totalVisits: number;
  totalUniqueVisits: number;
  totalConversions: number;
  activeReferrals: number;
}

const ReferralManager: React.FC = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingReferral, setEditingReferral] = useState<Referral | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaign: '',
    source: '',
    code: ''
  });


  useEffect(() => {
    fetchReferrals();
    fetchStats();
  }, []);

  const fetchReferrals = async () => {
    try {
      const token = localStorage.getItem('adminToken');
     const response = await fetch(`${BASE_URL}/referral/admin/list`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReferrals(data.referrals);
      }
    } catch (error) {
      console.error('Error fetching referrals:', error);
      toast.error('Failed to fetch referral links');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${BASE_URL}/referral/admin/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.overview);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${BASE_URL}/referral/admin/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success('Referral link created successfully!');
        setShowCreateForm(false);
        setFormData({ name: '', description: '', campaign: '', source: '', code: '' });
        fetchReferrals();
        fetchStats();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create referral link');
      }
    } catch (error) {
      console.error('Error creating referral:', error);
      toast.error('Failed to create referral link');
    }
  };

  const handleUpdateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingReferral) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${BASE_URL}/referral/admin/update/${editingReferral._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        toast.success('Referral link updated successfully!');
        setEditingReferral(null);
        setFormData({ name: '', description: '', campaign: '', source: '', code: '' });
        fetchReferrals();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update referral link');
      }
    } catch (error) {
      console.error('Error updating referral:', error);
      toast.error('Failed to update referral link');
    }
  };

  const handleDeleteReferral = async (id: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${BASE_URL}/referral/admin/delete/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        toast.success('Referral link deleted successfully!');
        fetchReferrals();
        fetchStats();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete referral link');
      }
    } catch (error) {
      console.error('Error deleting referral:', error);
      toast.error('Failed to delete referral link');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard!');
  };

  const startEdit = (referral: Referral) => {
    setEditingReferral(referral);
    setFormData({
      name: referral.name,
      description: referral.description || '',
      campaign: referral.campaign || '',
      source: referral.source || '',
      code: referral.code
    });
  };

  const cancelEdit = () => {
    setEditingReferral(null);
    setFormData({ name: '', description: '', campaign: '', source: '', code: '' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getConversionRate = (visits: number, conversions: number) => {
    return visits > 0 ? ((conversions / visits) * 100).toFixed(1) : '0.0';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Referral Links</h2>
          <p className="text-gray-400">Track your promotional campaigns and their effectiveness</p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Referral Link
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Referrals</p>
                  <p className="text-2xl font-bold text-white">{stats.totalReferrals}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Visits</p>
                  <p className="text-2xl font-bold text-white">{stats.totalVisits}</p>
                </div>
                <MousePointer className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Unique Visitors</p>
                  <p className="text-2xl font-bold text-white">{stats.totalUniqueVisits}</p>
                </div>
                <Users className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Conversions</p>
                  <p className="text-2xl font-bold text-white">{stats.totalConversions}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || editingReferral) && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              {editingReferral ? 'Edit Referral Link' : 'Create New Referral Link'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingReferral ? handleUpdateReferral : handleCreateReferral} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Facebook Campaign"
                    required
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Custom Code (optional)
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., FACEBOOK"
                    className="bg-gray-700 border-gray-600 text-white"
                    disabled={!!editingReferral}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this referral link..."
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Campaign
                  </label>
                  <Input
                    value={formData.campaign}
                    onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                    placeholder="e.g., Summer Promotion"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Source
                  </label>
                  <Input
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="e.g., Facebook, Instagram, Google Ads, etc."
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingReferral ? 'Update' : 'Create'} Referral Link
                </Button>
                <Button type="button" variant="outline" onClick={editingReferral ? cancelEdit : () => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Referral Links List */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Referral Links</CardTitle>
          <CardDescription className="text-gray-400">
            Manage and track your referral links
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {referrals.map((referral) => (
              <div key={referral._id} className="border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white">{referral.name}</h3>
                    <Badge variant={referral.isActive ? "default" : "secondary"}>
                      {referral.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {referral.source && (
                      <Badge variant="outline" className="text-gray-300 border-gray-600">
                        {referral.source}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(`${BASE_URL}/referral/${referral.code.toLowerCase()}`)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(referral)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteReferral(referral._id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-gray-400">Code</p>
                    <p className="font-mono text-white">{referral.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Visits</p>
                    <p className="text-white font-semibold">{referral.visits}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Unique</p>
                    <p className="text-white font-semibold">{referral.uniqueVisits}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Conversion Rate</p>
                    <p className="text-white font-semibold">{getConversionRate(referral.visits, referral.conversions)}%</p>
                  </div>
                </div>
                
                <div className="text-sm text-gray-400">
                  <p>Link: <span className="font-mono text-blue-400">{BASE_URL}/referral/{referral.code.toLowerCase()}</span></p>
                  {referral.description && <p className="mt-1">{referral.description}</p>}
                  <p className="mt-1">Created: {formatDate(referral.createdAt)}</p>
                  {referral.lastUsed && <p>Last used: {formatDate(referral.lastUsed)}</p>}
                </div>
              </div>
            ))}
            
            {referrals.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p>No referral links created yet.</p>
                <p>Create your first referral link to start tracking your campaigns!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralManager;
