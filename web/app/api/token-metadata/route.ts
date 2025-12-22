import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Path to store metadata mappings
const METADATA_STORE_PATH = path.join(process.cwd(), ".token-metadata.json");

// Load metadata store from file
async function loadMetadataStore(): Promise<Map<string, string>> {
  try {
    const data = await fs.readFile(METADATA_STORE_PATH, "utf-8");
    const entries = JSON.parse(data);
    return new Map(entries);
  } catch (error) {
    // File doesn't exist yet, return empty map
    return new Map();
  }
}

// Save metadata store to file
async function saveMetadataStore(store: Map<string, string>): Promise<void> {
  try {
    const entries = Array.from(store.entries());
    await fs.writeFile(METADATA_STORE_PATH, JSON.stringify(entries, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save metadata store:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { mint, metadataUri } = await request.json();
    
    if (!mint || !metadataUri) {
      return NextResponse.json(
        { error: "mint and metadataUri are required" },
        { status: 400 }
      );
    }

    const store = await loadMetadataStore();
    store.set(mint, metadataUri);
    await saveMetadataStore(store);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error storing metadata:", error);
    return NextResponse.json(
      { error: error.message || "Failed to store metadata URI" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mint = searchParams.get("mint");

    if (!mint) {
      return NextResponse.json(
        { error: "mint parameter is required" },
        { status: 400 }
      );
    }

    const store = await loadMetadataStore();
    const metadataUri = store.get(mint);
    
    if (!metadataUri) {
      return NextResponse.json(
        { error: "Metadata URI not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ metadataUri });
  } catch (error: any) {
    console.error("Error fetching metadata:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch metadata URI" },
      { status: 500 }
    );
  }
}
