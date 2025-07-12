import { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X, MapPin, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
  onCapture: (photoData: { file: File; coordinates: { lat: number; lng: number } | null }) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const { toast } = useToast();

  useEffect(() => {
    startCamera();
    getCurrentLocation();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: "Location Access",
            description: "GPS location unavailable. Photo will be captured without coordinates.",
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setHasPermission(true);
    } catch (error) {
      console.error('Camera permission denied:', error);
      setHasPermission(false);
    }
  };

  const switchCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `selfie-${timestamp}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        
        onCapture({ file, coordinates });
        
        // Stop camera stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    }, 'image/jpeg', 0.8);
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  if (hasPermission === false) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Camera Access Required</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Please allow camera access to capture your selfie
              </p>
            </div>
            <Button onClick={handleClose} variant="outline" className="w-full">
              Close Camera
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Capture Selfie
            </h3>
            <Button onClick={handleClose} variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="relative">
            <video 
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover rounded-lg bg-black"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            {hasPermission === null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                <div className="text-white text-center">
                  <Camera className="h-8 w-8 mx-auto mb-2" />
                  <p>Loading camera...</p>
                </div>
              </div>
            )}

            {/* Camera Controls Overlay */}
            <div className="absolute bottom-2 left-2">
              <Button
                onClick={switchCamera}
                variant="secondary"
                size="sm"
                className="bg-black/50 hover:bg-black/70 text-white border-white/20"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* GPS Status */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <MapPin className={`h-4 w-4 ${coordinates ? 'text-success' : 'text-muted-foreground'}`} />
            <span className={coordinates ? 'text-success' : 'text-muted-foreground'}>
              {coordinates 
                ? `GPS: ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`
                : 'Getting GPS location...'
              }
            </span>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={capturePhoto} 
              className="flex-1"
              disabled={hasPermission !== true}
            >
              <Camera className="h-4 w-4 mr-2" />
              Capture
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}