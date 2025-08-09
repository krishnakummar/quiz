// Email validation utility for business email addresses
// Blocks personal, social media, and free email providers

const PERSONAL_EMAIL_DOMAINS = new Set([
  // Major free email providers
  'gmail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.ca',
  'yahoo.com.au',
  'yahoo.fr',
  'yahoo.de',
  'yahoo.it',
  'yahoo.es',
  'yahoo.co.jp',
  'hotmail.com',
  'hotmail.co.uk',
  'hotmail.ca',
  'hotmail.fr',
  'hotmail.de',
  'hotmail.it',
  'hotmail.es',
  'outlook.com',
  'outlook.co.uk',
  'outlook.ca',
  'outlook.fr',
  'outlook.de',
  'outlook.it',
  'outlook.es',
  'live.com',
  'live.co.uk',
  'live.ca',
  'live.fr',
  'live.de',
  'live.it',
  'live.es',
  'msn.com',
  'aol.com',
  'aol.co.uk',
  'aol.ca',
  'aol.fr',
  'aol.de',
  'aol.it',
  'aol.es',
  
  // Other popular free email providers
  'icloud.com',
  'me.com',
  'mac.com',
  'protonmail.com',
  'proton.me',
  'tutanota.com',
  'tutanota.de',
  'fastmail.com',
  'zoho.com',
  'yandex.com',
  'yandex.ru',
  'mail.ru',
  'rambler.ru',
  '163.com',
  '126.com',
  'qq.com',
  'sina.com',
  'sohu.com',
  'naver.com',
  'daum.net',
  'hanmail.net',
  
  // Social media platforms
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'linkedin.com',
  'snapchat.com',
  'tiktok.com',
  'telegram.org',
  'whatsapp.com',
  'discord.com',
  'reddit.com',
  'pinterest.com',
  'tumblr.com',
  'youtube.com',
  'twitch.tv',
  
  // Temporary/disposable email providers
  '10minutemail.com',
  'tempmail.org',
  'guerrillamail.com',
  'mailinator.com',
  'yopmail.com',
  'throwaway.email',
  'temp-mail.org',
  'getnada.com',
  'emailondeck.com',
  'maildrop.cc',
  'sharklasers.com',
  'guerrillamail.info',
  'guerrillamail.biz',
  'guerrillamail.org',
  'guerrillamail.de',
  'spam4.me',
  'grr.la',
  'guerrillamail.net',
  
  // Educational institutions (might want to allow these, but blocking for strict business use)
  'gmail.com',
  'student.com',
  'students.com',
  
  // Other free providers
  'gmx.com',
  'gmx.de',
  'gmx.net',
  'web.de',
  't-online.de',
  'freenet.de',
  'arcor.de',
  'mail.com',
  'email.com',
  'usa.com',
  'yeah.net',
  'rediffmail.com',
  'indiatimes.com',
  'sify.com',
  'vsnl.net',
  'sapo.pt',
  'iol.pt',
  'libero.it',
  'virgilio.it',
  'tiscali.it',
  'alice.it',
  'tin.it',
  'wanadoo.fr',
  'orange.fr',
  'laposte.net',
  'sfr.fr',
  'neuf.fr',
  'club-internet.fr',
  'voila.fr'
]);

const ADDITIONAL_SUSPICIOUS_PATTERNS = [
  // Patterns that might indicate personal email
  /^\d+@/,  // Emails starting with numbers
  /^(test|demo|sample|example)@/i,  // Test emails
  /\+.*@/,  // Plus addressing (often used for personal accounts)
];

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

export function validateBusinessEmail(email: string): EmailValidationResult {
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || !email.trim()) {
    return {
      isValid: false,
      error: 'Email address is required'
    };
  }

  const trimmedEmail = email.trim().toLowerCase();
  
  if (!emailRegex.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address'
    };
  }

  // Extract domain from email
  const domain = trimmedEmail.split('@')[1];
  
  if (!domain) {
    return {
      isValid: false,
      error: 'Invalid email format'
    };
  }

  // Check against personal email domains
  if (PERSONAL_EMAIL_DOMAINS.has(domain)) {
    return {
      isValid: false,
      error: 'Personal and free email addresses are not allowed. Please use your business or organization email address.',
      suggestion: 'Use your company email address (e.g., yourname@yourcompany.com)'
    };
  }

  // Check suspicious patterns
  for (const pattern of ADDITIONAL_SUSPICIOUS_PATTERNS) {
    if (pattern.test(trimmedEmail)) {
      return {
        isValid: false,
        error: 'This email format appears to be for testing or personal use. Please use your business email address.',
        suggestion: 'Use your official company email address'
      };
    }
  }

  // Additional checks for business email characteristics
  const localPart = trimmedEmail.split('@')[0];
  
  // Very short local parts might be suspicious (less than 2 characters)
  if (localPart.length < 2) {
    return {
      isValid: false,
      error: 'Please use a complete business email address',
      suggestion: 'Use your full business email address'
    };
  }

  // Domain should have at least one dot and proper TLD
  const domainParts = domain.split('.');
  if (domainParts.length < 2 || domainParts.some(part => part.length < 2)) {
    return {
      isValid: false,
      error: 'Please enter a valid business email address with a proper domain',
      suggestion: 'Use your company domain (e.g., yourname@company.com)'
    };
  }

  // Check for common personal email patterns in domain
  const personalKeywords = ['personal', 'private', 'home', 'family', 'self'];
  if (personalKeywords.some(keyword => domain.includes(keyword))) {
    return {
      isValid: false,
      error: 'Please use your business or organization email address',
      suggestion: 'Use your official company email address'
    };
  }

  return {
    isValid: true
  };
}

// Helper function to get domain suggestions for common typos
export function getDomainSuggestions(email: string): string[] {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return [];

  const suggestions: string[] = [];
  
  // Common domain typos and their corrections
  const domainCorrections: Record<string, string> = {
    'gmai.com': 'gmail.com',
    'gmial.com': 'gmail.com',
    'gmail.co': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'yaho.com': 'yahoo.com',
    'hotmial.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'outloo.com': 'outlook.com',
  };

  if (domainCorrections[domain]) {
    suggestions.push(`Did you mean ${email.replace(domain, domainCorrections[domain])}?`);
  }

  return suggestions;
}

// Export the list for reference if needed
export { PERSONAL_EMAIL_DOMAINS };