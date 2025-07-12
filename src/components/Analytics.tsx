import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Users, MapPin, Clock, Calendar, Activity } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, eachDayOfInterval } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type SecurityRound = Tables<"security_rounds">;

const Analytics = () => {
  const [rounds, setRounds] = useState<SecurityRound[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRounds = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("security_rounds")
          .select("*")
          .order("timestamp", { ascending: false });

        if (error) throw error;
        setRounds(data || []);
      } catch (error) {
        console.error("Error fetching rounds:", error);
        toast({
          title: "Error",
          description: "Failed to load analytics data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRounds();
  }, []);

  // Analytics calculations
  const totalRounds = rounds.length;
  const uniqueGuards = [...new Set(rounds.map(r => r.guard_name))].length;
  const uniqueLocations = [...new Set(rounds.map(r => r.location))].length;
  const roundsWithGPS = rounds.filter(r => r.gps_coordinates).length;
  const gpsPercentage = totalRounds > 0 ? (roundsWithGPS / totalRounds * 100).toFixed(1) : 0;

  // Rounds by guard
  const roundsByGuard = rounds.reduce((acc, round) => {
    acc[round.guard_name] = (acc[round.guard_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const guardData = Object.entries(roundsByGuard)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Rounds by location
  const roundsByLocation = rounds.reduce((acc, round) => {
    acc[round.location] = (acc[round.location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const locationData = Object.entries(roundsByLocation)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Rounds by hour
  const roundsByHour = rounds.reduce((acc, round) => {
    const hour = new Date(round.timestamp).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const hourData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    count: roundsByHour[i] || 0
  }));

  // Daily rounds for the last 7 days
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date()
  });

  const dailyData = last7Days.map(day => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const count = rounds.filter(round => {
      const roundDate = new Date(round.timestamp);
      return roundDate >= dayStart && roundDate <= dayEnd;
    }).length;

    return {
      date: format(day, "MMM dd"),
      count
    };
  });

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--muted))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rounds</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRounds}</div>
            <p className="text-xs text-muted-foreground">Security patrol rounds logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Guards</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueGuards}</div>
            <p className="text-xs text-muted-foreground">Guards performing rounds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patrol Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueLocations}</div>
            <p className="text-xs text-muted-foreground">Distinct patrol locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GPS Coverage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gpsPercentage}%</div>
            <p className="text-xs text-muted-foreground">Rounds with GPS data</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Rounds (Last 7 Days)
            </CardTitle>
            <CardDescription>Security round frequency by day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Hourly Distribution
            </CardTitle>
            <CardDescription>Security rounds by hour of day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hour" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rounds by Guard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Rounds by Guard
            </CardTitle>
            <CardDescription>Security rounds completed by each guard</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={guardData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Location Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location Distribution
            </CardTitle>
            <CardDescription>Patrol coverage by location</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={locationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {locationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;