import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Camera, MapPin, QrCode, Clock, User, Scan, CheckCircle, Circle, LogOut, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QRScanner } from "./QRScanner";
import { CameraCapture } from "./CameraCapture";
import { User as SupabaseUser } from '@supabase/supabase-js';

// Security validation functions
const validateQRCode = (qrData: string): boolean => {
  if (!qrData || qrData.length === 0) return false;
  if (qrData.length > 500) return false;
  // Basic XSS prevention - check for script tags or suspicious content
  const dangerousPatterns = /<script|javascript:|data:|vbscript:/i;
  return !dangerousPatterns.test(qrData);
};

const sanitizeInput = (input: string): string => {
  return input.replace(/[<>\"'&]/g, '').trim();
};

const validateGPSCoordinates = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

const validateTextInput = (input: string, maxLength: number = 100): boolean => {
  return input && sanitizeInput(input).length > 0 && input.length <= maxLength;
};

const validateFileSize = (file: File, maxSizeMB: number = 10): boolean => {
  return file.size <= maxSizeMB * 1024 * 1024;
};

export default function SecureRounds() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [photoData, setPhotoData] = useState<{ file: File; coordinates: { lat: number; lng: number } | null } | null>(null);
  const [formData, setFormData] = useState({
    state: '',
    siteCode: '',
    siteName: '',
    guardName: '',
    employeeCode: '',
    timestamp: '',
    photo: null as File | null,
    gpsLocation: '',
    qrCodeCorner1: '',
    qrCodeCorner2: '',
    qrCodeCorner3: '',
    qrCodeCorner4: ''
  });
  const [currentCorner, setCurrentCorner] = useState<1 | 2 | 3 | 4>(1);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    
    // Sanitize text inputs
    const sanitizedValue = typeof value === 'string' ? sanitizeInput(value) : value;
    
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : sanitizedValue
    }));
  };

  const handleQRScan = (result: string) => {
    // Validate QR code before accepting
    if (!validateQRCode(result)) {
      toast({
        title: "Invalid QR Code",
        description: "The scanned QR code contains invalid or potentially harmful content.",
        variant: "destructive",
      });
      return;
    }

    const sanitizedResult = sanitizeInput(result);
    const cornerKey = `qrCodeCorner${currentCorner}` as keyof typeof formData;
    
    setFormData((prev) => ({
      ...prev,
      [cornerKey]: sanitizedResult
    }));
    
    setShowQRScanner(false);
    
    toast({
      title: `Corner ${currentCorner} QR Code Scanned`,
      description: "Valid QR code successfully scanned and verified.",
      variant: "default",
    });

    // Auto advance to next corner if not the last one
    if (currentCorner < 4) {
      setCurrentCorner((prev) => (prev + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handlePhotoCapture = (data: { file: File; coordinates: { lat: number; lng: number } | null }) => {
    // Validate file size and type
    if (!validateFileSize(data.file, 10)) {
      toast({
        title: "File Too Large",
        description: "Photo must be smaller than 10MB. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Validate GPS coordinates if provided
    if (data.coordinates && !validateGPSCoordinates(data.coordinates.lat, data.coordinates.lng)) {
      toast({
        title: "Invalid GPS Coordinates",
        description: "GPS coordinates appear to be invalid. Photo captured without location.",
        variant: "destructive",
      });
      data.coordinates = null;
    }

    setPhotoData(data);
    setFormData((prev) => ({
      ...prev,
      photo: data.file,
      gpsLocation: data.coordinates 
        ? `${data.coordinates.lat}, ${data.coordinates.lng}` 
        : 'GPS unavailable'
    }));
    setShowCamera(false);
    
    const locationText = data.coordinates 
      ? `GPS: ${data.coordinates.lat.toFixed(4)}, ${data.coordinates.lng.toFixed(4)}`
      : 'GPS coordinates unavailable';
      
    toast({
      title: "Selfie Captured",
      description: `Photo validated and captured. ${locationText}`,
      variant: "default",
    });
  };

  const getQRProgress = () => {
    const corners = [formData.qrCodeCorner1, formData.qrCodeCorner2, formData.qrCodeCorner3, formData.qrCodeCorner4];
    const scannedCount = corners.filter(corner => corner).length;
    return { scannedCount, total: 4 };
  };

  const allQRCodesScanned = () => {
    return formData.qrCodeCorner1 && formData.qrCodeCorner2 && formData.qrCodeCorner3 && formData.qrCodeCorner4;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('Auth check:', { user: user?.id, authError });
      
      if (!user) {
        console.error('No authenticated user found');
        toast({
          title: "Authentication Required",
          description: "Please log in to submit checkpoint data.",
          variant: "destructive",
        });
        return;
      }

      // Comprehensive form validation
      const validationErrors: string[] = [];
      
      if (!validateTextInput(formData.state, 50)) {
        validationErrors.push("State is required and must be valid");
      }
      if (!validateTextInput(formData.siteCode, 20)) {
        validationErrors.push("Site code is required and must be valid");
      }
      if (!validateTextInput(formData.siteName, 100)) {
        validationErrors.push("Site name is required and must be valid");
      }
      if (!validateTextInput(formData.guardName, 100)) {
        validationErrors.push("Guard name is required and must be valid");
      }
      if (!validateTextInput(formData.employeeCode, 50)) {
        validationErrors.push("Employee code is required and must be valid");
      }
      if (!allQRCodesScanned()) {
        validationErrors.push("All 4 corner QR codes must be scanned");
      }
      if (!photoData) {
        validationErrors.push("Selfie with GPS coordinates is required");
      }

      if (validationErrors.length > 0) {
        toast({
          title: "Validation Error",
          description: validationErrors.join(". "),
          variant: "destructive",
        });
        return;
      }

      const timestamp = new Date().toISOString();
      const location = `${sanitizeInput(formData.state)} - ${sanitizeInput(formData.siteName)}`;
      
      // Create sanitized data object to submit to Supabase
      const submissionData = {
        user_id: user.id,
        location: location,
        guard_name: sanitizeInput(formData.guardName),
        employee_id: sanitizeInput(formData.employeeCode),
        qr_code_corner_1: sanitizeInput(formData.qrCodeCorner1),
        qr_code_corner_2: sanitizeInput(formData.qrCodeCorner2),
        qr_code_corner_3: sanitizeInput(formData.qrCodeCorner3),
        qr_code_corner_4: sanitizeInput(formData.qrCodeCorner4),
        gps_coordinates: photoData?.coordinates || null,
        timestamp: timestamp,
      };

      // Insert data into Supabase
      console.log('Submitting data:', submissionData);
      const { data, error } = await supabase
        .from('security_rounds')
        .insert([submissionData])
        .select();

      console.log('Supabase response:', { data, error });
      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      toast({
        title: "Checkpoint Logged Successfully",
        description: "All 4 corner QR codes and security data have been validated and saved securely.",
      });

      // Reset form after successful submission
      setFormData({
        state: '',
        siteCode: '',
        siteName: '',
        guardName: '',
        employeeCode: '',
        timestamp: '',
        photo: null,
        gpsLocation: '',
        qrCodeCorner1: '',
        qrCodeCorner2: '',
        qrCodeCorner3: '',
        qrCodeCorner4: ''
      });
      setPhotoData(null);
      setCurrentCorner(1);
    } catch (error: any) {
      // Generic error message to prevent information disclosure
      console.error('Submission error:', error);
      toast({
        title: "Submission Failed",
        description: "Unable to save checkpoint data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const { scannedCount } = getQRProgress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/5">
      {/* Navigation Header */}
      <header className="p-4 border-b border-border/20 bg-background/80 backdrop-blur-sm">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'var(--gradient-primary)' }}>
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-foreground">Guard Portal</span>
          </div>
          
          <div className="flex items-center gap-2">
            {user?.email && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                {user.email}
              </span>
            )}
            <Button 
              onClick={() => navigate('/manager')}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <Button 
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto space-y-6 p-4">
        {/* Camera Capture Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <CameraCapture 
              onCapture={handlePhotoCapture}
              onClose={() => setShowCamera(false)}
            />
          </div>
        )}

        {/* QR Scanner Modal */}
        {showQRScanner && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <QRScanner 
              onScan={handleQRScan}
              onClose={() => setShowQRScanner(false)}
            />
          </div>
        )}

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-gradient-primary rounded-full shadow-card animate-pulse">
              <Shield className="h-10 w-10 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              SecureRounds
            </h1>
            <p className="text-lg text-primary/80 font-medium">🛡️ Advanced Security Patrol System</p>
            <div className="flex justify-center gap-2 text-sm text-muted-foreground">
              <span className="bg-primary/10 px-2 py-1 rounded-full">🔒 Secure</span>
              <span className="bg-accent/10 px-2 py-1 rounded-full">📱 Real-time</span>
              <span className="bg-success/10 px-2 py-1 rounded-full">✅ Verified</span>
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <Card className="bg-gradient-card shadow-card border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-primary/10">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              🎯 Checkpoint Check-in
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Location Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-3 p-3 bg-gradient-to-r from-primary/10 to-transparent rounded-lg border border-primary/20">
                  <div className="p-1.5 bg-primary/20 rounded-md">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  📍 Location Details
                </h3>
                
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      placeholder="Enter state"
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="siteCode">Site Code</Label>
                      <Input
                        id="siteCode"
                        name="siteCode"
                        value={formData.siteCode}
                        placeholder="Site code"
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="siteName">Site Name</Label>
                      <Input
                        id="siteName"
                        name="siteName"
                        value={formData.siteName}
                        placeholder="Site name"
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Guard Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-3 p-3 bg-gradient-to-r from-accent/10 to-transparent rounded-lg border border-accent/20">
                  <div className="p-1.5 bg-accent/20 rounded-md">
                    <User className="h-4 w-4 text-accent" />
                  </div>
                  👤 Guard Information
                </h3>
                
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="guardName">Guard Name</Label>
                    <Input
                      id="guardName"
                      name="guardName"
                      value={formData.guardName}
                      placeholder="Enter guard name"
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="employeeCode">Employee Code</Label>
                    <Input
                      id="employeeCode"
                      name="employeeCode"
                      value={formData.employeeCode}
                      placeholder="Enter employee code"
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Verification */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-3 p-3 bg-gradient-to-r from-success/10 to-transparent rounded-lg border border-success/20">
                  <div className="p-1.5 bg-success/20 rounded-md">
                    <Camera className="h-4 w-4 text-success" />
                  </div>
                  📸 Security Verification
                </h3>
                
                <div className="space-y-4">
                  <div>
                     <Label htmlFor="photo" className="flex items-center gap-2">
                       <Camera className="h-4 w-4" />
                       Capture Live Selfie with GPS
                     </Label>
                     <p className="text-xs text-muted-foreground mb-2">
                       📍 GPS location will be captured and stored for security verification purposes.
                     </p>
                    <div className="space-y-2">
                     <Button
                        type="button"
                        onClick={() => setShowCamera(true)}
                        variant={photoData ? "secondary" : "default"}
                        className="w-full h-14 text-lg font-medium bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white border-0 shadow-button"
                      >
                        <Camera className="h-6 w-6 mr-3" />
                        {photoData ? '🔄 Retake Selfie' : '📸 Take Selfie + GPS'}
                      </Button>
                       {photoData && (
                        <div className="text-sm p-4 bg-gradient-to-r from-success/10 to-success/5 border border-success/20 rounded-lg">
                          <div className="flex items-center gap-2 text-success font-medium mb-2">
                            <CheckCircle className="h-4 w-4" />
                            Photo Successfully Captured
                          </div>
                          <p className="text-foreground">📸 File: {photoData.file.name}</p>
                          <p className="text-foreground">💾 Size: {(photoData.file.size / 1024).toFixed(1)}KB</p>
                          {photoData.coordinates && (
                            <p className="text-foreground">📍 GPS: {photoData.coordinates.lat.toFixed(4)}, {photoData.coordinates.lng.toFixed(4)}</p>
                          )}
                        </div>
                       )}
                    </div>
                  </div>

                  {/* Four Corner QR Code Scanning */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-warning/10 rounded-lg">
                          <QrCode className="h-5 w-5 text-warning" />
                        </div>
                        <Label className="text-lg font-medium">
                          🎯 Scan All 4 Corner QR Codes
                        </Label>
                      </div>
                      <Badge 
                        variant={allQRCodesScanned() ? "default" : "secondary"}
                        className={allQRCodesScanned() ? "bg-success text-white" : "bg-warning text-black"}
                      >
                        {scannedCount}/4 {allQRCodesScanned() ? "✅ Complete" : "⏳ Pending"}
                      </Badge>
                    </div>
                    
                    {/* Corner Progress */}
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4].map((corner) => {
                        const cornerKey = `qrCodeCorner${corner}` as keyof typeof formData;
                        const isScanned = !!formData[cornerKey];
                        const isCurrent = currentCorner === corner;
                        
                        return (
                           <div
                            key={corner}
                            className={`p-3 rounded-xl border-2 flex items-center gap-3 text-sm font-medium transition-all duration-200 ${
                              isCurrent ? 'border-primary bg-gradient-to-r from-primary/20 to-primary/10 shadow-lg scale-105' : 
                              isScanned ? 'border-success bg-gradient-to-r from-success/20 to-success/10' : 'border-muted bg-gradient-to-r from-muted/30 to-muted/10'
                            }`}
                          >
                            {isScanned ? (
                              <CheckCircle className="h-5 w-5 text-success" />
                            ) : isCurrent ? (
                              <Scan className="h-5 w-5 text-primary animate-pulse" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                            <span className={`${isCurrent ? 'font-bold text-primary' : isScanned ? 'text-success' : 'text-muted-foreground'}`}>
                              {isScanned ? '✅' : isCurrent ? '🎯' : '⏳'} Corner {corner}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* QR Scanner Controls */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Label htmlFor="cornerSelect" className="text-sm">Active Corner:</Label>
                          <div className="flex gap-1 mt-1">
                            {[1, 2, 3, 4].map((corner) => (
                              <Button
                                key={corner}
                                type="button"
                                size="sm"
                                variant={currentCorner === corner ? "default" : "outline"}
                                onClick={() => setCurrentCorner(corner as 1 | 2 | 3 | 4)}
                                className="w-10 h-10"
                              >
                                {corner}
                              </Button>
                            ))}
                          </div>
                        </div>
                     <Button
                        type="button"
                        onClick={() => setShowQRScanner(true)}
                        variant="default"
                        className="mt-6 h-14 text-lg font-medium bg-gradient-to-r from-warning to-warning/80 hover:from-warning/90 hover:to-warning/70 text-black border-0 shadow-button"
                      >
                        <Scan className="h-6 w-6 mr-3 animate-pulse" />
                        🔍 Scan Corner {currentCorner}
                      </Button>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Currently scanning: Corner {currentCorner}
                        {formData[`qrCodeCorner${currentCorner}` as keyof typeof formData] && 
                          ' ✓ (Already scanned)'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-16 text-xl font-bold bg-gradient-to-r from-success via-success to-success/90 hover:from-success/90 hover:via-success/90 hover:to-success/80 text-white border-0 shadow-button transition-all duration-300 transform hover:scale-105"
                disabled={!allQRCodesScanned() || !photoData}
              >
                <Clock className="h-6 w-6 mr-3" />
                🚀 Submit Security Round
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Status Footer */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p className="flex items-center justify-center gap-2">
                <MapPin className="h-4 w-4" />
                GPS: {formData.gpsLocation || 'Waiting for location...'} | 
                <Clock className="h-4 w-4 ml-2" />
                {new Date().toLocaleTimeString()}
              </p>
              {photoData && (
                <p className="text-success">✓ Live selfie captured with GPS coordinates</p>
              )}
              {allQRCodesScanned() && (
                <p className="text-success">✓ All 4 corner QR codes scanned</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}