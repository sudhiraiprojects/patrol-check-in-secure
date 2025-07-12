import { useRef, useEffect, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, Camera, X } from "lucide-react";

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [qrScanner, setQrScanner] = useState<QrScanner | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        onScan(result.data);
        scanner.stop();
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment', // Use back camera if available
      }
    );

    setQrScanner(scanner);

    // Check camera permission and start scanner
    scanner.start().then(() => {
      setHasPermission(true);
    }).catch((error) => {
      console.error('Camera permission denied or not available:', error);
      setHasPermission(false);
    });

    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, [onScan]);

  const handleClose = () => {
    if (qrScanner) {
      qrScanner.stop();
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
                Please allow camera access to scan QR codes
              </p>
            </div>
            <Button onClick={handleClose} variant="outline" className="w-full">
              Close Scanner
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
              <QrCode className="h-5 w-5" />
              Scan QR Code
            </h3>
            <Button onClick={handleClose} variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="relative">
            <video 
              ref={videoRef}
              className="w-full h-64 object-cover rounded-lg bg-black"
              playsInline
            />
            {hasPermission === null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                <div className="text-white text-center">
                  <Camera className="h-8 w-8 mx-auto mb-2" />
                  <p>Loading camera...</p>
                </div>
              </div>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Position the QR code within the camera view
          </p>
        </div>
      </CardContent>
    </Card>
  );
}