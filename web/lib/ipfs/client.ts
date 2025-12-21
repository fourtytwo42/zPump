// Lazy load IPFS client to avoid blocking initial page load
let ipfsClient: any = null;
let ipfsModule: any = null;

// Use public IPFS gateway (Infura, Pinata, or local node)
const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://ipfs.infura.io:5001/api/v0";

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
      ipfsClient = create({
        url: IPFS_GATEWAY,
        headers: process.env.NEXT_PUBLIC_IPFS_AUTH
          ? {
              authorization: `Basic ${process.env.NEXT_PUBLIC_IPFS_AUTH}`,
            }
          : undefined,
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

