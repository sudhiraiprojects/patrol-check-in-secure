import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, RefreshCw, MapPin, Calendar, User, Building } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type SecurityRound = Tables<"security_rounds">;

const DataTable = () => {
  const [rounds, setRounds] = useState<SecurityRound[]>([]);
  const [filteredRounds, setFilteredRounds] = useState<SecurityRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [guardFilter, setGuardFilter] = useState("all");
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();

  const fetchRounds = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("security_rounds")
        .select("*")
        .order(sortBy, { ascending: sortOrder === "asc" });

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

  useEffect(() => {
    fetchRounds();
  }, [sortBy, sortOrder]);

  useEffect(() => {
    let filtered = rounds;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(round =>
        round.guard_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        round.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        round.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Location filter
    if (locationFilter !== "all") {
      filtered = filtered.filter(round => round.location === locationFilter);
    }

    // Guard filter
    if (guardFilter !== "all") {
      filtered = filtered.filter(round => round.guard_name === guardFilter);
    }

    setFilteredRounds(filtered);
  }, [rounds, searchTerm, locationFilter, guardFilter]);

  const uniqueLocations = [...new Set(rounds.map(round => round.location))];
  const uniqueGuards = [...new Set(rounds.map(round => round.guard_name))];

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const formatGPS = (gps: any) => {
    if (!gps || typeof gps !== 'object') return "Not available";
    return `${gps.lat?.toFixed(6)}, ${gps.lng?.toFixed(6)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Security Rounds Data
        </CardTitle>
        <CardDescription>
          View and filter all security round records with advanced search capabilities
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
               <Input
                 placeholder="Search by guard, guard code, or location..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-10"
               />
            </div>
          </div>
          
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {uniqueLocations.map(location => (
                <SelectItem key={location} value={location}>{location}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={guardFilter} onValueChange={setGuardFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by guard" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Guards</SelectItem>
              {uniqueGuards.map(guard => (
                <SelectItem key={guard} value={guard}>{guard}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={fetchRounds} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Rounds</p>
                  <p className="text-2xl font-bold">{filteredRounds.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Guards</p>
                  <p className="text-2xl font-bold">{uniqueGuards.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Locations</p>
                  <p className="text-2xl font-bold">{uniqueLocations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">With GPS</p>
                  <p className="text-2xl font-bold">
                    {filteredRounds.filter(r => r.gps_coordinates).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("timestamp")}
                >
                  Timestamp {sortBy === "timestamp" && (sortOrder === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("guard_name")}
                >
                  Guard {sortBy === "guard_name" && (sortOrder === "asc" ? "↑" : "↓")}
                </TableHead>
                 <TableHead 
                   className="cursor-pointer hover:bg-muted/50"
                   onClick={() => handleSort("employee_id")}
                 >
                   Guard Code {sortBy === "employee_id" && (sortOrder === "asc" ? "↑" : "↓")}
                 </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("location")}
                >
                  Location {sortBy === "location" && (sortOrder === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead>QR Code</TableHead>
                <TableHead>GPS</TableHead>
                <TableHead>Photo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading data...</p>
                  </TableCell>
                </TableRow>
              ) : filteredRounds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">No security rounds found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRounds.map((round) => (
                  <TableRow key={round.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(round.timestamp), "MMM dd, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">{round.guard_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{round.employee_id}</Badge>
                    </TableCell>
                    <TableCell>{round.location}</TableCell>
                    <TableCell>
                      {round.qr_code_data ? (
                        <Badge variant="secondary">Scanned</Badge>
                      ) : (
                        <Badge variant="destructive">Missing</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatGPS(round.gps_coordinates)}
                    </TableCell>
                     <TableCell>
                       {round.photo_url ? (
                         <img 
                           src={round.photo_url} 
                           alt="Security selfie" 
                           className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:scale-110 transition-transform"
                           onClick={() => window.open(round.photo_url, '_blank')}
                         />
                       ) : (
                         <Badge variant="outline">No Photo</Badge>
                       )}
                     </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataTable;