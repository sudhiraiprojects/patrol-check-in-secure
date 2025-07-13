import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Camera, MapPin, QrCode, Clock, User, Scan, CheckCircle, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QRScanner } from "./QRScanner";
import { CameraCapture } from "./CameraCapture";

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
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
      const { error } = await supabase
        .from('security_rounds')
        .insert([submissionData]);

      if (error) throw error;

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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-xl mx-auto space-y-6">
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
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-gradient-primary rounded-full shadow-button">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">SecureRounds</h1>
          <p className="text-muted-foreground">Security Guard Patrol Monitoring</p>
        </div>

        {/* Main Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Checkpoint Check-in
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Location Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location Details
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
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Guard Information
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
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Verification
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
                        variant="outline"
                        className="w-full h-12"
                      >
                        <Camera className="h-5 w-5 mr-2" />
                        {photoData ? 'Retake Selfie' : 'Take Selfie'}
                      </Button>
                      {photoData && (
                        <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                          <p>✓ Photo captured: {photoData.file.name}</p>
                          <p>📸 Size: {(photoData.file.size / 1024).toFixed(1)}KB</p>
                          {photoData.coordinates && (
                            <p>📍 GPS: {photoData.coordinates.lat.toFixed(4)}, {photoData.coordinates.lng.toFixed(4)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Four Corner QR Code Scanning */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        Scan All 4 Corner QR Codes
                      </Label>
                      <Badge variant={allQRCodesScanned() ? "default" : "secondary"}>
                        {scannedCount}/4 Complete
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
                            className={`p-2 rounded-lg border flex items-center gap-2 text-sm ${
                              isCurrent ? 'border-primary bg-primary/10' : 
                              isScanned ? 'border-green-500 bg-green-50' : 'border-muted bg-muted/50'
                            }`}
                          >
                            {isScanned ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className={isCurrent ? 'font-medium text-primary' : ''}>
                              Corner {corner}
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
                          className="mt-6"
                        >
                          <Scan className="h-4 w-4 mr-2" />
                          Scan Corner {currentCorner}
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
                className="w-full h-12 text-lg font-semibold"
                size="lg"
                disabled={!photoData || !allQRCodesScanned()}
              >
                <Clock className="h-5 w-5 mr-2" />
                Submit Checkpoint ({scannedCount}/4 QR + Photo)
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