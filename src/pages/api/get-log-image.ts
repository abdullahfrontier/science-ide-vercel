import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest, getBaseUrl, createAuthHeaders } from '@/lib/auth-middleware';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get log ID and other required parameters from query
    const { logId, orgId, experimentId, sessionId } = req.query;
    
    if (!logId || typeof logId !== 'string') {
      return res.status(400).json({ error: 'Log ID is required' });
    }
    
    // Try to get org, experiment and session from localStorage/cookies if not provided
    let organizationId = orgId as string;
    let expId = experimentId as string;
    let sessId = sessionId as string;
    
    // If not provided, we need to fetch from somewhere or return error
    if (!organizationId || !expId || !sessId) {
      // For now, return error - we need these to fetch the log
      return res.status(400).json({ 
        error: 'Organization ID, Experiment ID and Session ID are required',
        details: 'Missing required context for fetching image'
      });
    }

    const baseUrl = getBaseUrl();

    // Fetch logs for the session with image URLs enabled
    // We'll filter for the specific log_id after getting the response
    const response = await fetch(
      `${baseUrl}/organizations/${organizationId}/experiments/${expId}/sessions/${sessId}/logs?include_image_urls=true`,
      {
        method: 'GET',
        headers: createAuthHeaders(req.token)
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Logs not found' });
      }
      return res.status(response.status).json({ 
        error: `Failed to fetch logs: ${response.statusText}` 
      });
    }

    // Parse the response to get logs
    const data = await response.json();
    const logs = data.logs || [];
    
    // Find the specific log with matching log_id
    const targetLog = logs.find((log: any) => log.log_id === logId);
    
    if (!targetLog) {
      return res.status(404).json({ error: 'Log not found', logId });
    }
    
    // Check if this log has an image URL (presigned URL from S3)
    if (!targetLog.content || !targetLog.content.startsWith('http')) {
      return res.status(404).json({ error: 'No image URL found for this log' });
    }
    
    // The content should be a presigned S3 URL
    let imageUrl = targetLog.content;
    console.log('🔗 Original presigned URL:', imageUrl);
    
    // Replace 'localstack' hostname with 'localhost' for local development
    // This is needed because the presigned URL is generated inside Docker network
    if (imageUrl.includes('://localstack:')) {
      imageUrl = imageUrl.replace('://localstack:', '://localhost:');
      console.log('🔄 Replaced localstack hostname with localhost in presigned URL');
      console.log('🔗 Modified presigned URL:', imageUrl);
    }
    
    // Fetch the actual image from the presigned URL
    console.log('📥 Fetching image from presigned URL...');
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      return res.status(500).json({ 
        error: 'Failed to fetch image from storage',
        details: imageResponse.statusText
      });
    }
    
    // Get the image data
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // The image is stored as base64 text in S3, so we need to decode it
    const textContent = new TextDecoder().decode(imageBuffer);
    
    // Parse the base64 image data
    let imageData: Buffer;
    if (textContent.startsWith('data:image')) {
      // Extract base64 data from data URL
      const base64Data = textContent.split(',')[1];
      imageData = Buffer.from(base64Data, 'base64');
    } else {
      // Assume it's raw base64
      imageData = Buffer.from(textContent, 'base64');
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Send the image
    res.send(imageData);
    
  } catch (error) {
    console.error('Error fetching log image:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Configure Next.js to handle larger response sizes for images
export const config = {
  api: {
    responseLimit: '10mb',
  },
};

export default withAuth(handler);