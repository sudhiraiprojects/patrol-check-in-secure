import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDown, FileText, Table, Calendar } from "lucide-react";
import { format, subDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type SecurityRound = Tables<"security_rounds">;

const ExportData = () => {
  const [rounds, setRounds] = useState<SecurityRound[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedGuards, setSelectedGuards] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [includeGPS, setIncludeGPS] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeQR, setIncludeQR] = useState(true);
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

  const uniqueGuards = [...new Set(rounds.map(r => r.guard_name))];
  const uniqueLocations = [...new Set(rounds.map(r => r.location))];

  const getFilteredData = () => {
    let filtered = rounds;

    // Date filter
    if (dateRange !== "all") {
      const now = new Date();
      let startFilterDate: Date;

      switch (dateRange) {
        case "today":
          startFilterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "week":
          startFilterDate = subDays(now, 7);
          break;
        case "month":
          startFilterDate = subDays(now, 30);
          break;
        case "custom":
          if (startDate && endDate) {
            filtered = filtered.filter(round => {
              const roundDate = new Date(round.timestamp);
              return roundDate >= new Date(startDate) && roundDate <= new Date(endDate);
            });
          }
          return filtered;
        default:
          startFilterDate = new Date(0);
      }

      filtered = filtered.filter(round => new Date(round.timestamp) >= startFilterDate);
    }

    // Guard filter
    if (selectedGuards.length > 0) {
      filtered = filtered.filter(round => selectedGuards.includes(round.guard_name));
    }

    // Location filter
    if (selectedLocations.length > 0) {
      filtered = filtered.filter(round => selectedLocations.includes(round.location));
    }

    return filtered;
  };

  const exportToCSV = () => {
    const filteredData = getFilteredData();
    
    if (filteredData.length === 0) {
      toast({
        title: "No Data",
        description: "No security rounds match your filter criteria.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);

    try {
      const headers = [
        "Timestamp",
        "Guard Name",
        "Employee ID",
        "Location",
        ...(includeQR ? ["QR Code Data"] : []),
        ...(includeGPS ? ["GPS Latitude", "GPS Longitude"] : []),
        ...(includePhotos ? ["Photo URL"] : []),
        "Created At"
      ];

      const csvData = filteredData.map(round => {
        const row = [
          format(new Date(round.timestamp), "yyyy-MM-dd HH:mm:ss"),
          round.guard_name,
          round.employee_id,
          round.location,
          ...(includeQR ? [round.qr_code_data || ""] : []),
          ...(includeGPS ? [
            (round.gps_coordinates as any)?.lat || "",
            (round.gps_coordinates as any)?.lng || ""
          ] : []),
          ...(includePhotos ? [round.photo_url || ""] : []),
          format(new Date(round.created_at), "yyyy-MM-dd HH:mm:ss")
        ];
        return row;
      });

      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `security_rounds_${format(new Date(), "yyyy-MM-dd")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Exported ${filteredData.length} security rounds to CSV.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToJSON = () => {
    const filteredData = getFilteredData();
    
    if (filteredData.length === 0) {
      toast({
        title: "No Data",
        description: "No security rounds match your filter criteria.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);

    try {
      const exportData = {
        export_info: {
          exported_at: new Date().toISOString(),
          total_records: filteredData.length,
          filters: {
            date_range: dateRange,
            start_date: startDate,
            end_date: endDate,
            guards: selectedGuards,
            locations: selectedLocations,
            includes: {
              gps: includeGPS,
              photos: includePhotos,
              qr_codes: includeQR
            }
          }
        },
        security_rounds: filteredData.map(round => ({
          ...round,
          ...(includeGPS ? {} : { gps_coordinates: undefined }),
          ...(includePhotos ? {} : { photo_url: undefined }),
          ...(includeQR ? {} : { qr_code_data: undefined })
        }))
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `security_rounds_${format(new Date(), "yyyy-MM-dd")}.json`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Exported ${filteredData.length} security rounds to JSON.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleGuardSelection = (guard: string, checked: boolean) => {
    if (checked) {
      setSelectedGuards([...selectedGuards, guard]);
    } else {
      setSelectedGuards(selectedGuards.filter(g => g !== guard));
    }
  };

  const handleLocationSelection = (location: string, checked: boolean) => {
    if (checked) {
      setSelectedLocations([...selectedLocations, location]);
    } else {
      setSelectedLocations(selectedLocations.filter(l => l !== location));
    }
  };

  const filteredCount = getFilteredData().length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Security Rounds Data
          </CardTitle>
          <CardDescription>
            Configure export settings and download your security rounds data in CSV or JSON format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {dateRange === "custom" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Guard Selection */}
          <div className="space-y-2">
            <Label>Guards (leave empty for all)</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
              {uniqueGuards.map(guard => (
                <div key={guard} className="flex items-center space-x-2">
                  <Checkbox
                    id={`guard-${guard}`}
                    checked={selectedGuards.includes(guard)}
                    onCheckedChange={(checked) => handleGuardSelection(guard, !!checked)}
                  />
                  <Label htmlFor={`guard-${guard}`} className="text-sm">{guard}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Location Selection */}
          <div className="space-y-2">
            <Label>Locations (leave empty for all)</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
              {uniqueLocations.map(location => (
                <div key={location} className="flex items-center space-x-2">
                  <Checkbox
                    id={`location-${location}`}
                    checked={selectedLocations.includes(location)}
                    onCheckedChange={(checked) => handleLocationSelection(location, !!checked)}
                  />
                  <Label htmlFor={`location-${location}`} className="text-sm">{location}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Data Inclusion Options */}
          <div className="space-y-2">
            <Label>Include in Export</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-gps"
                  checked={includeGPS}
                  onCheckedChange={(checked) => setIncludeGPS(!!checked)}
                />
                <Label htmlFor="include-gps">GPS Data</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-photos"
                  checked={includePhotos}
                  onCheckedChange={(checked) => setIncludePhotos(!!checked)}
                />
                <Label htmlFor="include-photos">Photo URLs</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-qr"
                  checked={includeQR}
                  onCheckedChange={(checked) => setIncludeQR(!!checked)}
                />
                <Label htmlFor="include-qr">QR Code Data</Label>
              </div>
            </div>
          </div>

          {/* Export Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Export Preview: <span className="font-medium text-foreground">{filteredCount} records</span> will be exported
            </p>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={exportToCSV}
              disabled={exporting || loading || filteredCount === 0}
              className="flex items-center gap-2"
            >
              <Table className="h-4 w-4" />
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
            <Button
              variant="outline"
              onClick={exportToJSON}
              disabled={exporting || loading || filteredCount === 0}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {exporting ? "Exporting..." : "Export JSON"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExportData;