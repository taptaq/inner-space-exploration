import crypto from "crypto";

// Ensure ENCRYPTION_KEY is exactly 32 bytes (256 bits) for aes-256-gcm
// Format: 32 chars string in .env
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default_fallback_key_32_bytes_len";
const ALGORITHM = "aes-256-gcm";

export function encryptString(text: string): string {
  if (!text) return text;
  
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32)), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return iv:encrypted:authTag
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    return text; // Fallback to raw text if encryption fails (or throw error in production)
  }
}

export function decryptString(text: string): string {
  if (!text || !text.includes(":")) return text;
  
  try {
    const parts = text.split(':');
    if (parts.length !== 3) return text;

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32)), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error("Decryption failed:", error);
    return text; 
  }
}

export function encryptJson(obj: any): any {
  if (!obj) return obj;
  try {
    const jsonString = JSON.stringify(obj);
    return encryptString(jsonString);
  } catch (e) {
    return obj;
  }
}

export function decryptJson(text: string): any {
  if (!text || typeof text !== 'string') return text;
  try {
    const decryptedString = decryptString(text);
    return JSON.parse(decryptedString);
  } catch (e) {
    return text;
  }
}
