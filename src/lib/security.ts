import DOMPurify from 'dompurify';

// Enhanced input validation and sanitization utilities
export class SecurityValidator {
  
  // XSS Protection - Sanitize HTML content
  static sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [], // No attributes allowed
      KEEP_CONTENT: true // Keep text content
    });
  }

  // Enhanced text input validation with XSS prevention
  static validateAndSanitizeInput(
    input: string, 
    maxLength: number = 255,
    minLength: number = 1,
    allowedPattern?: RegExp
  ): { isValid: boolean; sanitized: string; error?: string } {
    
    // Basic validation
    if (!input || typeof input !== 'string') {
      return { isValid: false, sanitized: '', error: 'Input is required' };
    }

    // Sanitize the input first
    const sanitized = this.sanitizeHtml(input.trim());
    
    // Length validation
    if (sanitized.length < minLength) {
      return { isValid: false, sanitized, error: `Input must be at least ${minLength} characters` };
    }
    
    if (sanitized.length > maxLength) {
      return { isValid: false, sanitized, error: `Input must not exceed ${maxLength} characters` };
    }

    // Pattern validation if provided
    if (allowedPattern && !allowedPattern.test(sanitized)) {
      return { isValid: false, sanitized, error: 'Input contains invalid characters' };
    }

    // Check for potential script injection attempts
    if (this.containsSuspiciousContent(sanitized)) {
      return { isValid: false, sanitized, error: 'Input contains potentially dangerous content' };
    }

    return { isValid: true, sanitized };
  }

  // Validate employee/guard codes with strict alphanumeric pattern
  static validateGuardCode(code: string): { isValid: boolean; sanitized: string; error?: string } {
    const guardCodePattern = /^[A-Za-z0-9\-_]{2,20}$/;
    return this.validateAndSanitizeInput(code, 20, 2, guardCodePattern);
  }

  // Validate guard names with letters, spaces, and common punctuation
  static validateGuardName(name: string): { isValid: boolean; sanitized: string; error?: string } {
    const namePattern = /^[A-Za-z\s\.\-']{2,50}$/;
    return this.validateAndSanitizeInput(name, 50, 2, namePattern);
  }

  // Validate location names
  static validateLocation(location: string): { isValid: boolean; sanitized: string; error?: string } {
    const locationPattern = /^[A-Za-z0-9\s\.\-_#]{2,100}$/;
    return this.validateAndSanitizeInput(location, 100, 2, locationPattern);
  }

  // GPS coordinates validation
  static validateGPSCoordinates(coords: any): { isValid: boolean; error?: string } {
    if (!coords || typeof coords !== 'object') {
      return { isValid: false, error: 'GPS coordinates are required' };
    }

    const { latitude, longitude } = coords;
    
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return { isValid: false, error: 'GPS coordinates must be numeric' };
    }

    if (latitude < -90 || latitude > 90) {
      return { isValid: false, error: 'Invalid latitude value' };
    }

    if (longitude < -180 || longitude > 180) {
      return { isValid: false, error: 'Invalid longitude value' };
    }

    return { isValid: true };
  }

  // QR Code data validation
  static validateQRData(qrData: string): { isValid: boolean; sanitized: string; error?: string } {
    // QR codes can contain various data, but we want to ensure it's not malicious
    if (!qrData || typeof qrData !== 'string') {
      return { isValid: false, sanitized: '', error: 'QR code data is required' };
    }

    const sanitized = this.sanitizeHtml(qrData.trim());
    
    if (sanitized.length > 1000) {
      return { isValid: false, sanitized, error: 'QR code data is too long' };
    }

    if (this.containsSuspiciousContent(sanitized)) {
      return { isValid: false, sanitized, error: 'QR code contains suspicious content' };
    }

    return { isValid: true, sanitized };
  }

  // Check for suspicious content that might indicate injection attempts
  private static containsSuspiciousContent(input: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /onclick=/i,
      /eval\(/i,
      /expression\(/i,
      /url\(/i,
      /@import/i,
      /\bselect\b.*\bfrom\b/i,
      /\bunion\b.*\bselect\b/i,
      /\binsert\b.*\binto\b/i,
      /\bupdate\b.*\bset\b/i,
      /\bdelete\b.*\bfrom\b/i,
      /\bdrop\b.*\btable\b/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
  }

  // Rate limiting helper (basic implementation)
  static createRateLimiter(maxAttempts: number, windowMs: number) {
    const attempts = new Map<string, { count: number; resetTime: number }>();

    return {
      isAllowed: (identifier: string): boolean => {
        const now = Date.now();
        const record = attempts.get(identifier);

        if (!record || now > record.resetTime) {
          attempts.set(identifier, { count: 1, resetTime: now + windowMs });
          return true;
        }

        if (record.count >= maxAttempts) {
          return false;
        }

        record.count++;
        return true;
      },
      
      getRemainingAttempts: (identifier: string): number => {
        const record = attempts.get(identifier);
        if (!record || Date.now() > record.resetTime) {
          return maxAttempts;
        }
        return Math.max(0, maxAttempts - record.count);
      }
    };
  }
}

// Export rate limiter for form submissions (5 submissions per minute)
export const formSubmissionLimiter = SecurityValidator.createRateLimiter(5, 60000);

// Export rate limiter for QR scans (10 scans per minute)  
export const qrScanLimiter = SecurityValidator.createRateLimiter(10, 60000);