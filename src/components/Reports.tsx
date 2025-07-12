import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, Users, MapPin, TrendingUp, Download } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type SecurityRound = Tables<"security_rounds">;

interface ReportData {
  totalRounds: number;
  uniqueGuards: number;
  uniqueLocations: number;
  roundsWithGPS: number;
  avgRoundsPerDay: number;
  mostActiveGuard: { name: string; count: number };
  mostPatrolledLocation: { name: string; count: number };
  peakHour: { hour: number; count: number };
}

const Reports = () => {
  const [rounds, setRounds] = useState<SecurityRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState("summary");
  const [dateRange, setDateRange] = useState("week");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedGuard, setSelectedGuard] = useState("all");
  const [reportData, setReportData] = useState<ReportData | null>(null);
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
          description: "Failed to load security rounds data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRounds();
  }, []);

  const getDateRange = () => {
    const now = new Date();
    
    switch (dateRange) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "custom":
        if (startDate && endDate) {
          return { start: new Date(startDate), end: new Date(endDate) };
        }
        return { start: new Date(0), end: now };
      default:
        return { start: new Date(0), end: now };
    }
  };

  const getFilteredRounds = () => {
    const { start, end } = getDateRange();
    
    let filtered = rounds.filter(round => {
      const roundDate = new Date(round.timestamp);
      return roundDate >= start && roundDate <= end;
    });

    if (selectedGuard !== "all") {
      filtered = filtered.filter(round => round.guard_name === selectedGuard);
    }

    return filtered;
  };

  const generateReportData = (): ReportData => {
    const filteredRounds = getFilteredRounds();
    const { start, end } = getDateRange();
    const daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    // Basic stats
    const totalRounds = filteredRounds.length;
    const uniqueGuards = [...new Set(filteredRounds.map(r => r.guard_name))].length;
    const uniqueLocations = [...new Set(filteredRounds.map(r => r.location))].length;
    const roundsWithGPS = filteredRounds.filter(r => r.gps_coordinates).length;
    const avgRoundsPerDay = totalRounds / daysDiff;

    // Most active guard
    const guardCounts = filteredRounds.reduce((acc, round) => {
      acc[round.guard_name] = (acc[round.guard_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostActiveGuard = Object.entries(guardCounts)
      .sort(([,a], [,b]) => b - a)[0] || ["None", 0];

    // Most patrolled location
    const locationCounts = filteredRounds.reduce((acc, round) => {
      acc[round.location] = (acc[round.location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostPatrolledLocation = Object.entries(locationCounts)
      .sort(([,a], [,b]) => b - a)[0] || ["None", 0];

    // Peak hour
    const hourCounts = filteredRounds.reduce((acc, round) => {
      const hour = new Date(round.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    const peakHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0] || ["0", 0];

    return {
      totalRounds,
      uniqueGuards,
      uniqueLocations,
      roundsWithGPS,
      avgRoundsPerDay,
      mostActiveGuard: { name: mostActiveGuard[0], count: mostActiveGuard[1] },
      mostPatrolledLocation: { name: mostPatrolledLocation[0], count: mostPatrolledLocation[1] },
      peakHour: { hour: parseInt(peakHour[0]), count: peakHour[1] }
    };
  };

  const generateReport = () => {
    const data = generateReportData();
    setReportData(data);
  };

  const exportReport = () => {
    if (!reportData) return;

    const filteredRounds = getFilteredRounds();
    const { start, end } = getDateRange();
    
    const reportContent = {
      report_info: {
        type: reportType,
        generated_at: new Date().toISOString(),
        date_range: {
          start: start.toISOString(),
          end: end.toISOString(),
          description: dateRange
        },
        guard_filter: selectedGuard
      },
      summary: reportData,
      detailed_data: reportType === "detailed" ? filteredRounds : []
    };

    const jsonContent = JSON.stringify(reportContent, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `security_report_${format(new Date(), "yyyy-MM-dd")}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Report Exported",
      description: "Security report has been downloaded successfully.",
    });
  };

  const uniqueGuards = [...new Set(rounds.map(r => r.guard_name))];

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Security Reports
          </CardTitle>
          <CardDescription>
            Create comprehensive reports based on security rounds data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary Report</SelectItem>
                  <SelectItem value="detailed">Detailed Report</SelectItem>
                  <SelectItem value="performance">Performance Report</SelectItem>
                  <SelectItem value="compliance">Compliance Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Guard Filter</Label>
              <Select value={selectedGuard} onValueChange={setSelectedGuard}>
                <SelectTrigger>
                  <SelectValue placeholder="Select guard" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Guards</SelectItem>
                  {uniqueGuards.map(guard => (
                    <SelectItem key={guard} value={guard}>{guard}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={generateReport} disabled={loading} className="w-full">
                Generate Report
              </Button>
            </div>
          </div>

          {dateRange === "custom" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="report-start-date">Start Date</Label>
                <Input
                  id="report-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-end-date">End Date</Label>
                <Input
                  id="report-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
                </CardTitle>
                <CardDescription>
                  Report generated for {dateRange} {selectedGuard !== "all" && `(Guard: ${selectedGuard})`}
                </CardDescription>
              </div>
              <Button onClick={exportReport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Rounds</p>
                      <p className="text-2xl font-bold">{reportData.totalRounds}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Active Guards</p>
                      <p className="text-2xl font-bold">{reportData.uniqueGuards}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Locations</p>
                      <p className="text-2xl font-bold">{reportData.uniqueLocations}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Avg/Day</p>
                      <p className="text-2xl font-bold">{reportData.avgRoundsPerDay.toFixed(1)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Most Active Guard</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{reportData.mostActiveGuard.name}</Badge>
                            <span className="text-sm text-muted-foreground">
                              ({reportData.mostActiveGuard.count} rounds)
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Top Location</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{reportData.mostPatrolledLocation.name}</Badge>
                            <span className="text-sm text-muted-foreground">
                              ({reportData.mostPatrolledLocation.count} rounds)
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Peak Hour</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {reportData.peakHour.hour.toString().padStart(2, '0')}:00
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              ({reportData.peakHour.count} rounds)
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">GPS Coverage</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={reportData.roundsWithGPS / reportData.totalRounds > 0.8 ? "default" : "destructive"}>
                              {((reportData.roundsWithGPS / reportData.totalRounds) * 100).toFixed(1)}%
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              ({reportData.roundsWithGPS}/{reportData.totalRounds})
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Compliance Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Compliance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">GPS Data Collection</span>
                      <Badge variant={reportData.roundsWithGPS / reportData.totalRounds > 0.8 ? "default" : "destructive"}>
                        {reportData.roundsWithGPS / reportData.totalRounds > 0.8 ? "Good" : "Needs Improvement"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Regular Patrol Coverage</span>
                      <Badge variant={reportData.avgRoundsPerDay > 5 ? "default" : "secondary"}>
                        {reportData.avgRoundsPerDay > 5 ? "Excellent" : "Adequate"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Location Coverage</span>
                      <Badge variant={reportData.uniqueLocations > 1 ? "default" : "secondary"}>
                        {reportData.uniqueLocations > 1 ? "Multi-Location" : "Single Location"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;