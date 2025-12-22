// Lazy load IPFS client to avoid blocking initial page load
let ipfsClient: any = null;
let ipfsModule: any = null;

// Use public IPFS gateway (Infura, Pinata, or local node)
// Default to local IPFS node if available
const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "http://127.0.0.1:5001/api/v0";

async function loadIpfsModule() {
  if (!ipfsModule) {
    // Dynamic import to avoid blocking initial bundle
    ipfsModule = await import("ipfs-http-client");
  }
  return ipfsModule;
}

export async function getIpfsClient(): Promise<any> {
  if (!ipfsClient) {
    try {
      const module = await loadIpfsModule();
      const { create } = module;
      
      // Build headers for authentication
      const headers: Record<string, string> = {};
      
      // Infura requires project ID and secret in Basic auth
      // Format: Basic base64(projectId:projectSecret)
      if (process.env.NEXT_PUBLIC_IPFS_PROJECT_ID && process.env.NEXT_PUBLIC_IPFS_PROJECT_SECRET) {
        const credentials = `${process.env.NEXT_PUBLIC_IPFS_PROJECT_ID}:${process.env.NEXT_PUBLIC_IPFS_PROJECT_SECRET}`;
        // Use browser-compatible base64 encoding
        const base64Credentials = typeof btoa !== 'undefined' 
          ? btoa(credentials)
          : (typeof Buffer !== 'undefined' ? Buffer.from(credentials).toString('base64') : '');
        headers.authorization = `Basic ${base64Credentials}`;
      } else if (process.env.NEXT_PUBLIC_IPFS_AUTH) {
        // Fallback to direct auth string (already base64 encoded)
        headers.authorization = `Basic ${process.env.NEXT_PUBLIC_IPFS_AUTH}`;
      }
      
      // If no auth provided and using Infura, warn
      if (!headers.authorization && IPFS_GATEWAY.includes('infura.io')) {
        console.warn('[IPFS] No authentication provided for Infura. Uploads may fail. Set NEXT_PUBLIC_IPFS_PROJECT_ID and NEXT_PUBLIC_IPFS_PROJECT_SECRET.');
      }
      
      // Log which IPFS gateway is being used (for debugging)
      if (IPFS_GATEWAY.includes('127.0.0.1') || IPFS_GATEWAY.includes('localhost')) {
        console.log('[IPFS] Using local IPFS node:', IPFS_GATEWAY);
      }
      
      ipfsClient = create({
        url: IPFS_GATEWAY,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      });
    } catch (error) {
      console.error("Failed to create IPFS client:", error);
      throw new Error("Failed to initialize IPFS client");
    }
  }
  return ipfsClient;
}

export async function uploadToIpfs(data: Uint8Array | string): Promise<string> {
  try {
    const client = await getIpfsClient();
    const result = await client.add(data);
    return result.cid.toString();
  } catch (error: any) {
    console.error("Failed to upload to IPFS:", error);
    
    // Provide helpful error message for common issues
    if (error.message?.includes("project id required") || error.message?.includes("project id")) {
      throw new Error(
        "IPFS authentication required. Please set NEXT_PUBLIC_IPFS_PROJECT_ID and NEXT_PUBLIC_IPFS_PROJECT_SECRET environment variables. " +
        "For Infura: Get credentials from https://infura.io. " +
        "Alternatively, use a public IPFS gateway or local IPFS node."
      );
    }
    
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
}

export async function uploadFileToIpfs(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  return uploadToIpfs(uint8Array);
}

export async function uploadJsonToIpfs(json: object): Promise<string> {
  const jsonString = JSON.stringify(json);
  return uploadToIpfs(jsonString);
}

export function getIpfsUrl(cid: string): string {
  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || "https://ipfs.io/ipfs/";
  return `${gateway}${cid}`;
}

