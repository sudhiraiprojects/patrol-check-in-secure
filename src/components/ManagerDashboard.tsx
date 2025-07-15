import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, MapPin, Clock, QrCode, Camera, Filter, Search, CheckCircle, AlertTriangle } from 'lucide-react';

interface SecurityRound {
  id: string;
  location: string;
  guard_name: string;
  employee_id: string;
  qr_code_corner_1: string | null;
  qr_code_corner_2: string | null;
  qr_code_corner_3: string | null;
  qr_code_corner_4: string | null;
  gps_coordinates: any;
  timestamp: string;
  created_at: string;
  user_id: string;
  photo_url: string | null;
  qr_code_data: string | null;
}

export default function ManagerDashboard() {
  const { toast } = useToast();
  const [rounds, setRounds] = useState<SecurityRound[]>([]);
  const [filteredRounds, setFilteredRounds] = useState<SecurityRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    location: '',
    guardName: '',
    dateFrom: '',
    dateTo: '',
    completionStatus: 'all'
  });

  useEffect(() => {
    fetchSecurityRounds();
    
    // Set up real-time subscription for new submissions
    const channel = supabase
      .channel('security-rounds-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'security_rounds'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          fetchSecurityRounds(); // Refresh data when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [rounds, filters]);

  const fetchSecurityRounds = async () => {
    try {
      setLoading(true);
      console.log('Fetching security rounds...');
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('Current user for dashboard:', user?.id, authError);
      
      if (!user) {
        console.error('No authenticated user found for dashboard');
        toast({
          title: 'Authentication Required',
          description: 'Please log in to view the dashboard.',
          variant: 'destructive',
        });
        return;
      }
      
      const { data, error } = await supabase
        .from('security_rounds')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('Security rounds query result:', { data, error, count: data?.length });
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      setRounds(data || []);
    } catch (error: any) {
      console.error('Error fetching security rounds:', error);
      toast({
        title: 'Error Loading Data',
        description: 'Failed to load security rounds data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...rounds];

    if (filters.location) {
      filtered = filtered.filter(round => 
        round.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.guardName) {
      filtered = filtered.filter(round => 
        round.guard_name.toLowerCase().includes(filters.guardName.toLowerCase())
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(round => 
        new Date(round.created_at) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(round => 
        new Date(round.created_at) <= new Date(filters.dateTo)
      );
    }

    if (filters.completionStatus !== 'all') {
      filtered = filtered.filter(round => {
        const allCornersScanned = round.qr_code_corner_1 && round.qr_code_corner_2 && 
                                 round.qr_code_corner_3 && round.qr_code_corner_4;
        return filters.completionStatus === 'complete' ? allCornersScanned : !allCornersScanned;
      });
    }

    setFilteredRounds(filtered);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      location: '',
      guardName: '',
      dateFrom: '',
      dateTo: '',
      completionStatus: 'all'
    });
  };

  const getCompletionStatus = (round: SecurityRound) => {
    const cornersScanned = [
      round.qr_code_corner_1,
      round.qr_code_corner_2,
      round.qr_code_corner_3,
      round.qr_code_corner_4
    ].filter(corner => corner).length;

    return {
      isComplete: cornersScanned === 4,
      count: cornersScanned,
      total: 4
    };
  };

  const getStats = () => {
    const total = filteredRounds.length;
    const complete = filteredRounds.filter(round => getCompletionStatus(round).isComplete).length;
    const incomplete = total - complete;
    const uniqueGuards = new Set(filteredRounds.map(round => round.guard_name)).size;
    const uniqueLocations = new Set(filteredRounds.map(round => round.location)).size;

    return { total, complete, incomplete, uniqueGuards, uniqueLocations };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading manager dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'var(--gradient-hero)' }}></div>
      <div className="relative min-h-screen bg-background/80 backdrop-blur-sm p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl" style={{ background: 'var(--gradient-glass)' }}></div>
            <div className="relative p-6 rounded-3xl border border-border/50" style={{ boxShadow: 'var(--shadow-glow)' }}>
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <div className="p-4 rounded-full" style={{ background: 'var(--gradient-primary)' }}>
                    <Users className="h-10 w-10 text-white" />
                  </div>
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  🛡️ Security Command Center
                </h1>
                <p className="text-muted-foreground text-lg">Real-time monitoring of security operations</p>
              </div>
            </div>
          </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total Rounds</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.complete}</div>
                <div className="text-sm text-muted-foreground">Complete Rounds</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.incomplete}</div>
                <div className="text-sm text-muted-foreground">Incomplete Rounds</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.uniqueGuards}</div>
                <div className="text-sm text-muted-foreground">Active Guards</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.uniqueLocations}</div>
                <div className="text-sm text-muted-foreground">Locations</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Filter by location"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="guardName">Guard Name</Label>
                <Input
                  id="guardName"
                  placeholder="Filter by guard"
                  value={filters.guardName}
                  onChange={(e) => handleFilterChange('guardName', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="dateFrom">Date From</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="dateTo">Date To</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={filters.completionStatus}
                  onValueChange={(value) => handleFilterChange('completionStatus', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rounds</SelectItem>
                    <SelectItem value="complete">Complete Only</SelectItem>
                    <SelectItem value="incomplete">Incomplete Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Rounds List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Security Rounds ({filteredRounds.length})
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredRounds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No security rounds found matching your filters.
                </div>
              ) : (
                filteredRounds.map((round) => {
                  const status = getCompletionStatus(round);
                  return (
                    <Card key={round.id} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                          {/* Basic Info */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{round.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{round.guard_name}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {round.employee_id}
                            </div>
                          </div>

                          {/* Timestamp */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {new Date(round.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Created: {new Date(round.created_at).toLocaleString()}
                            </div>
                          </div>

                          {/* QR Code Status */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <QrCode className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">QR Code Status</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                              {[1, 2, 3, 4].map((corner) => {
                                const cornerKey = `qr_code_corner_${corner}` as keyof SecurityRound;
                                const isScanned = !!round[cornerKey];
                                return (
                                  <div
                                    key={corner}
                                    className={`p-1 rounded text-xs text-center ${
                                      isScanned ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                                    }`}
                                  >
                                    {corner}
                                  </div>
                                );
                              })}
                            </div>
                            <Badge variant={status.isComplete ? "default" : "secondary"} className="text-xs">
                              {status.count}/4 Corners
                            </Badge>
                          </div>

                          {/* GPS & Status */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {status.isComplete ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                              )}
                              <span className={`text-sm font-medium ${
                                status.isComplete ? 'text-green-600' : 'text-orange-600'
                              }`}>
                                {status.isComplete ? 'Complete' : 'Incomplete'}
                              </span>
                            </div>
                            {round.gps_coordinates && (
                              <div className="text-xs text-muted-foreground">
                                📍 GPS: {round.gps_coordinates.lat.toFixed(4)}, {round.gps_coordinates.lng.toFixed(4)}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}