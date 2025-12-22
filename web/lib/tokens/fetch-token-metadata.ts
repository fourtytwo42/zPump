import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, getMint } from "@solana/spl-token";

export interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image: string;
  decimals?: number;
}

/**
 * Fetch token metadata from IPFS using the local IPFS node
 * First tries to get the metadata URI from the server API, then fetches from IPFS
 */
export async function fetchTokenMetadata(
  mint: PublicKey,
  connection: Connection
): Promise<TokenMetadata | null> {
  try {
    // Fetch metadata URI from server API
    // Note: For now, we're using server-side storage (persisted in .token-metadata.json)
    // TODO: Implement on-chain metadata reading from Token-2022 metadata pointer extension
    const response = await fetch(`/api/token-metadata?mint=${mint.toBase58()}`);
    if (response.ok) {
      const { metadataUri } = await response.json();
      if (metadataUri) {
        const metadata = await fetchMetadataFromIpfs(metadataUri);
        if (metadata) {
          return metadata;
        }
      }
    }
    
    return null;
  } catch (error) {
    // If metadata not found, return null
    console.warn(`Error fetching metadata for ${mint.toBase58()}:`, error);
    return null;
  }
}

/**
 * Fetch metadata JSON from IPFS using the local IPFS node
 */
export async function fetchMetadataFromIpfs(uri: string): Promise<TokenMetadata | null> {
  try {
    // Handle IPFS URIs (ipfs://... or http://.../ipfs/...)
    let url = uri;
    if (uri.startsWith("ipfs://")) {
      const cid = uri.replace("ipfs://", "");
      // Use local IPFS gateway on the VM
      const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || "http://127.0.0.1:9090/ipfs/";
      url = `${gateway}${cid}`;
    }

    // Fetch from local IPFS gateway
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    const metadata = await response.json();
    return {
      name: metadata.name || "Token",
      symbol: metadata.symbol || "TKN",
      description: metadata.description,
      image: metadata.image || "",
      decimals: metadata.decimals,
    };
  } catch (error) {
    console.debug(`Failed to fetch metadata from IPFS (${uri}):`, error);
    return null;
  }
}

