"use client";

import { 
  BaseWalletAdapter, 
  WalletAdapterNetwork, 
  WalletName, 
  WalletReadyState,
  WalletConnectionError,
  WalletDisconnectedError,
  WalletNotConnectedError,
  WalletSendTransactionError,
  WalletSignMessageError,
  WalletSignTransactionError,
} from "@solana/wallet-adapter-base";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { loadLocalWallet, walletToKeypair, type LocalWallet } from "./wallet";

export const LocalWalletName = "Local Wallet" as WalletName<"Local Wallet">;

export class LocalWalletAdapter extends BaseWalletAdapter {
  name = LocalWalletName;
  url = "https://github.com";
  icon = "";
  supportedTransactionVersions = new Set<"legacy" | 0>(["legacy", 0] as const);
  private _publicKey: PublicKey | null = null;
  private _connecting: boolean = false;
  private _localWallet: LocalWallet | null = null;

  constructor() {
    super();
    this._loadWallet();
  }

  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  get readyState(): WalletReadyState {
    return WalletReadyState.Installed;
  }

  private _loadWallet(): void {
    const wallet = loadLocalWallet();
    if (wallet) {
      this._localWallet = wallet;
      try {
        this._publicKey = new PublicKey(wallet.publicKey);
      } catch (error) {
        console.error("Error loading wallet public key:", error);
      }
    }
  }

  async connect(): Promise<void> {
    try {
      if (this._connecting) {
        return;
      }

      if (this._publicKey) {
        this.emit("connect", this._publicKey);
        return;
      }

      this._connecting = true;
      this._loadWallet();

      if (!this._localWallet) {
        throw new WalletConnectionError("No local wallet found. Please create one first.");
      }

      this._publicKey = new PublicKey(this._localWallet.publicKey);
      this.emit("connect", this._publicKey);
    } catch (error: any) {
      this.emit("error", error);
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    // Don't actually delete the wallet, just disconnect
    this._publicKey = null;
    this.emit("disconnect");
  }

  async sendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: any,
    options?: any
  ): Promise<string> {
    try {
      if (!this._localWallet || !this._publicKey) {
        throw new WalletNotConnectedError();
      }

      const keypair = walletToKeypair(this._localWallet);
      
      if (transaction instanceof VersionedTransaction) {
        transaction.sign([keypair]);
      } else {
        transaction.sign(keypair);
      }

      const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        options
      );

      return signature;
    } catch (error: any) {
      const walletError = new WalletSendTransactionError(error?.message, error);
      this.emit("error", walletError);
      throw walletError;
    }
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T> {
    try {
      if (!this._localWallet || !this._publicKey) {
        throw new WalletNotConnectedError();
      }

      const keypair = walletToKeypair(this._localWallet);
      
      if (transaction instanceof VersionedTransaction) {
        transaction.sign([keypair]);
      } else {
        transaction.sign(keypair);
      }

      return transaction;
    } catch (error: any) {
      const walletError = new WalletSignTransactionError(error?.message, error);
      this.emit("error", walletError);
      throw walletError;
    }
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    try {
      if (!this._localWallet || !this._publicKey) {
        throw new WalletNotConnectedError();
      }

      const keypair = walletToKeypair(this._localWallet);
      // Use nacl to sign the message
      const nacl = await import("tweetnacl");
      const signature = nacl.sign.detached(message, keypair.secretKey);
      return signature;
    } catch (error: any) {
      const walletError = new WalletSignMessageError(error?.message, error);
      this.emit("error", walletError);
      throw walletError;
    }
  }
}

