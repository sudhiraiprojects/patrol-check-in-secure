import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Camera, MapPin, QrCode, Clock, User, Scan } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRScanner } from "./QRScanner";
import { CameraCapture } from "./CameraCapture";

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
    qrScan: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const handleQRScan = (result: string) => {
    setFormData((prev) => ({
      ...prev,
      qrScan: result
    }));
    setShowQRScanner(false);
    toast({
      title: "QR Code Scanned",
      description: `Scanned: ${result}`,
      variant: "default",
    });
  };

  const handlePhotoCapture = (data: { file: File; coordinates: { lat: number; lng: number } | null }) => {
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
      description: `Photo captured with timestamp and location. ${locationText}`,
      variant: "default",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const timestamp = new Date().toISOString();
    const gpsLocation = formData.gpsLocation || 'GPS unavailable';

    const dataToSubmit = {
      ...formData,
      timestamp,
      gpsLocation,
      photoMetadata: photoData ? {
        fileName: photoData.file.name,
        fileSize: photoData.file.size,
        coordinates: photoData.coordinates,
        captureTime: timestamp
      } : null
    };

    toast({
      title: "Checkpoint Logged",
      description: "Your security checkpoint has been recorded successfully.",
      variant: "default",
    });

    console.log('Security checkpoint data:', dataToSubmit);
    
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
      qrScan: ''
    });
    setPhotoData(null);
  };

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

                  <div>
                    <Label htmlFor="qrScan" className="flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      QR Code Scan
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="qrScan"
                        name="qrScan"
                        value={formData.qrScan}
                        placeholder="Scanned QR code will appear here"
                        onChange={handleChange}
                        readOnly
                        className="flex-1"
                        required
                      />
                      <Button
                        type="button"
                        onClick={() => setShowQRScanner(true)}
                        variant="outline"
                        size="default"
                        className="px-3"
                      >
                        <Scan className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-semibold"
                size="lg"
                disabled={!photoData || !formData.qrScan}
              >
                <Clock className="h-5 w-5 mr-2" />
                Submit Checkpoint
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}