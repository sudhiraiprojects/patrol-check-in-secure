import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Camera, MapPin, QrCode, Clock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SecureRounds() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const timestamp = new Date().toISOString();
    const gpsLocation = 'Mock GPS: 40.7128, -74.0060'; // Replace with actual device GPS capture

    const dataToSubmit = {
      ...formData,
      timestamp,
      gpsLocation
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
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-xl mx-auto space-y-6">
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
                      Upload Selfie
                    </Label>
                    <Input
                      id="photo"
                      type="file"
                      name="photo"
                      accept="image/*"
                      capture="user"
                      onChange={handleChange}
                      className="cursor-pointer"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="qrScan" className="flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      QR Code Scan
                    </Label>
                    <Input
                      id="qrScan"
                      name="qrScan"
                      value={formData.qrScan}
                      placeholder="Scan or enter QR code"
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-semibold"
                size="lg"
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
            <div className="text-center text-sm text-muted-foreground">
              <p className="flex items-center justify-center gap-2">
                <MapPin className="h-4 w-4" />
                GPS: Ready | 
                <Clock className="h-4 w-4 ml-2" />
                {new Date().toLocaleTimeString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}