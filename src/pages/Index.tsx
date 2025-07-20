import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Shield, Users, QrCode, BarChart3, ArrowRight, LogIn } from 'lucide-react';
import SecureRounds from '@/components/SecureRounds';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, show the SecureRounds form
  if (user) {
    return <SecureRounds />;
  }

  // If not authenticated, show the landing page
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'var(--gradient-hero)' }}></div>
      <div className="relative min-h-screen bg-background/80 backdrop-blur-sm">
        {/* Header */}
        <header className="p-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: 'var(--gradient-primary)' }}>
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Security Patrol System
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => navigate('/auth')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-6 pb-12">
          <div className="max-w-7xl mx-auto space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-6 py-12">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl" style={{ background: 'var(--gradient-glass)' }}></div>
                <div className="relative p-8 rounded-3xl border border-border/50" style={{ boxShadow: 'var(--shadow-glow)' }}>
                  <h2 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
                    🛡️ Secure Patrol Management
                  </h2>
                  <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                    Advanced security checkpoint tracking with QR code scanning, GPS verification, and real-time monitoring capabilities.
                  </p>
                  
                  <div className="mt-8">
                    <Button 
                      size="lg"
                      onClick={() => navigate('/auth')}
                      className="text-lg px-8 py-6"
                      style={{ background: 'var(--gradient-primary)' }}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border border-border/50" style={{ boxShadow: 'var(--shadow-glow)' }}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <QrCode className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle>QR Code Scanning</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Scan QR codes at security checkpoints to verify patrol completion and track guard movements in real-time.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/50" style={{ boxShadow: 'var(--shadow-glow)' }}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <CardTitle>Guard Management</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Monitor guard activities, track patrol routes, and ensure all security protocols are being followed.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/50" style={{ boxShadow: 'var(--shadow-glow)' }}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <BarChart3 className="h-6 w-6 text-purple-600" />
                    </div>
                    <CardTitle>Analytics Dashboard</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Comprehensive reporting and analytics to track security performance and identify areas for improvement.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
