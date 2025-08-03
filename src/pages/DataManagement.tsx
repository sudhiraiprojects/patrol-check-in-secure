import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Database, BarChart3, FileDown, Calendar, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import DataTable from "@/components/DataTable";
import Analytics from "@/components/Analytics";
import ExportData from "@/components/ExportData";
import Reports from "@/components/Reports";
import AdminManagement from "@/components/AdminManagement";

const DataManagement = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check user role when auth state changes
        if (session?.user) {
          checkUserRole(session.user.id);
        } else {
          setUserRole(null);
          setRoleLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        checkUserRole(session.user.id);
      } else {
        setUserRole(null);
        setRoleLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (userId: string) => {
    setRoleLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
      } else {
        setUserRole(data?.role || null);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRole(null);
    } finally {
      setRoleLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/80 to-muted/30">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Admin Access Required</h1>
          <p className="text-muted-foreground">Please sign in with admin credentials to access data management.</p>
          <Button onClick={() => window.location.href = '/auth'}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Check if user has manager or admin role
  if (userRole !== 'manager' && userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/80 to-muted/30">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground">
            You need manager or admin privileges to access this area.
          </p>
          <p className="text-sm text-muted-foreground">
            Current role: {userRole || 'No role assigned'}
          </p>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/80 to-muted/30">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Data Management Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive security rounds data analysis and reporting
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="table" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="table" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Table
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Reports
            </TabsTrigger>
            {userRole === 'admin' && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="table" className="mt-6">
            <DataTable />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <Analytics />
          </TabsContent>

          <TabsContent value="export" className="mt-6">
            <ExportData />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <Reports />
          </TabsContent>

          {userRole === 'admin' && (
            <TabsContent value="admin" className="mt-6">
              <AdminManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default DataManagement;