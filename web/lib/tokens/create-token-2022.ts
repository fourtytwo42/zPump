import { Connection, PublicKey, Transaction, Keypair, SystemProgram } from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  getMintLen,
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
  createMintToInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getMinimumBalanceForRentExemptMint,
  ExtensionType,
  getMintLen as getMintLenWithExtensions,
  createInitializeMetadataPointerInstruction,
  createUpdateMetadataPointerInstruction,
  getMetadataPointerState,
} from "@solana/spl-token";
// Lazy load IPFS functions to avoid blocking initial bundle
async function getIpfsFunctions() {
  return await import("@/lib/ipfs/client");
}

export interface CreateToken2022Params {
  name: string;
  symbol: string;
  decimals: number;
  imageFile?: File;
  imageUrl?: string;
  description?: string;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image: string;
  decimals: number;
}

export async function createToken2022WithMetadata(
  connection: Connection,
  payer: Keypair,
  params: CreateToken2022Params
): Promise<{ mint: PublicKey; metadataUri: string; transaction: Transaction; mintKeypair: Keypair }> {
  const mint = Keypair.generate();
  const mintPublicKey = mint.publicKey;

  // Step 1: Upload image to IPFS if provided (lazy load IPFS client)
  const ipfs = await getIpfsFunctions();
  let imageUri = params.imageUrl || "";
  if (params.imageFile) {
    const imageCid = await ipfs.uploadFileToIpfs(params.imageFile);
    imageUri = ipfs.getIpfsUrl(imageCid);
  }

  // Step 2: Create metadata JSON
  const metadata: TokenMetadata = {
    name: params.name,
    symbol: params.symbol,
    description: params.description || `${params.name} (${params.symbol})`,
    image: imageUri,
    decimals: params.decimals,
  };

  // Step 3: Upload metadata to IPFS
  const metadataCid = await ipfs.uploadJsonToIpfs(metadata);
  const metadataUri = ipfs.getIpfsUrl(metadataCid);

  // Step 4: Calculate rent for mint account
  // Note: For now, we're not using the metadata pointer extension to avoid
  // transaction signing issues with PDA accounts. We'll use server-side storage instead.
  // TODO: Implement proper Token-2022 metadata pointer extension once we understand
  // the correct way to create and initialize the metadata account PDA.
  const mintRent = await getMinimumBalanceForRentExemptMint(connection);

  // Step 5: Create transaction
  const transaction = new Transaction();

  // Create mint account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintPublicKey,
      space: MINT_SIZE,
      lamports: mintRent,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  // Initialize mint
  transaction.add(
    createInitializeMintInstruction(
      mintPublicKey,
      params.decimals,
      payer.publicKey, // Mint authority
      null, // Freeze authority
      TOKEN_2022_PROGRAM_ID
    )
  );

  // Step 8: Mint 1 billion tokens to payer
  const payerATA = await getAssociatedTokenAddress(
    mintPublicKey,
    payer.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  // Check if ATA exists, create if not
  const ataInfo = await connection.getAccountInfo(payerATA);
  if (!ataInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        payerATA,
        payer.publicKey,
        mintPublicKey,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  // Mint 1 billion tokens (1,000,000,000)
  const oneBillion = BigInt(1_000_000_000) * BigInt(10 ** params.decimals);
  transaction.add(
    createMintToInstruction(
      mintPublicKey,
      payerATA,
      payer.publicKey,
      oneBillion,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  return { mint: mintPublicKey, metadataUri, transaction, mintKeypair: mint };
}
