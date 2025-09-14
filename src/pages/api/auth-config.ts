import { NextApiRequest, NextApiResponse } from 'next';

export type CognitoConfig = {
  clientId: string;
  domain: string;
  region: string;
};

export default function handler(req: NextApiRequest, res: NextApiResponse<CognitoConfig | { error: string }>) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Read server-side environment variables
    const clientId = process.env.COGNITO_CLIENT_ID;
    const domain = process.env.COGNITO_DOMAIN;
    const region = process.env.AWS_REGION;

    // Validate all required environment variables are present
    if (!clientId) {
      throw new Error('COGNITO_CLIENT_ID environment variable is required but not set');
    }
    
    if (!domain) {
      throw new Error('COGNITO_DOMAIN environment variable is required but not set');
    }
    
    if (!region) {
      throw new Error('AWS_REGION environment variable is required but not set');
    }

    // Return the configuration
    const config: CognitoConfig = {
      clientId,
      domain,
      region,
    };

    // Set cache headers for performance (cache for 5 minutes)
    res.setHeader('Cache-Control', 'public, max-age=300');
    
    return res.status(200).json(config);
  } catch (error) {
    console.error('Error getting Cognito configuration:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to load Cognito configuration' 
    });
  }
}