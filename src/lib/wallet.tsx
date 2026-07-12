/**
 * Wallet layer — native Wallet Standard discovery + connection, bridged into
 * the official AgenC signer seam.
 *
 * No @solana/wallet-adapter stack: Phantom (and every modern Solana wallet)
 * implements the Wallet Standard, so we speak the standard's own two-event
 * handshake directly and hand the connected account to
 * `signerFromWalletAccount` from `@tetsuo-ai/marketplace-react` — the exact
 * bridge the AgenC integration guide names for buyers to sign hires. All
 * protocol logic stays in the official packages (C1 rule); this file only
 * discovers wallets and owns the connect lifecycle.
 */
"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  signerFromWalletAccount,
  signerFromWalletAdapter,
  type TransactionSigner,
  type WalletStandardSignTransaction,
} from "@tetsuo-ai/marketplace-react";
import { VersionedTransaction } from "@solana/web3.js";

/** CAIP-2 chain this store signs for (mainnet store). */
const CHAIN = "solana:mainnet";

/** Key for remembering the last-connected wallet (eager reconnect). */
const LAST_WALLET_KEY = "hirewire:last-wallet";

/** The minimal Wallet Standard account shape we consume. */
export interface StandardWalletAccount {
  readonly address: string;
  readonly chains?: readonly string[];
  readonly features?: readonly string[];
}

/** The minimal Wallet Standard wallet shape we consume. */
export interface StandardWallet {
  readonly name: string;
  readonly icon: string;
  readonly chains: readonly string[];
  readonly accounts: readonly StandardWalletAccount[];
  readonly features: Readonly<Record<string, unknown>>;
}

interface ConnectFeature {
  connect(input?: { silent?: boolean }): Promise<{
    accounts: readonly StandardWalletAccount[];
  }>;
}
interface DisconnectFeature {
  disconnect(): Promise<void>;
}
interface EventsFeature {
  on(
    event: "change",
    listener: (properties: {
      accounts?: readonly StandardWalletAccount[];
    }) => void,
  ): () => void;
}
interface SignTransactionFeature {
  signTransaction: WalletStandardSignTransaction;
}

function feature<T>(wallet: StandardWallet, name: string): T | null {
  const f = wallet.features[name];
  return f ? (f as T) : null;
}

/** The slice of an injected legacy wallet provider the adapter signer needs. */
interface LegacyProvider {
  publicKey: { toBase58(): string } | null;
  signTransaction?: <T extends { serialize(): Uint8Array }>(
    transaction: T,
  ) => Promise<T>;
}

/**
 * Find an injected legacy provider (window.phantom.solana, window.solflare)
 * whose connected public key matches the Wallet Standard account — signing
 * through it avoids the guard-instruction mutation of the standard feature.
 */
function legacyProviderFor(address: string): LegacyProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    phantom?: { solana?: LegacyProvider };
    solflare?: LegacyProvider;
  };
  for (const provider of [w.phantom?.solana, w.solflare]) {
    if (
      provider?.signTransaction &&
      provider.publicKey?.toBase58?.() === address
    ) {
      return provider;
    }
  }
  return null;
}

/** A wallet is usable here iff it can connect + sign for Solana mainnet. */
function isUsable(wallet: StandardWallet): boolean {
  return (
    !!feature<ConnectFeature>(wallet, "standard:connect") &&
    !!feature<SignTransactionFeature>(wallet, "solana:signTransaction") &&
    wallet.chains.some((c) => c === CHAIN)
  );
}

/**
 * Wallet Standard discovery — the standard's own handshake, no dependency:
 * announce `app-ready` (already-injected wallets call our `register`), and
 * listen for `register-wallet` (wallets injected later hand us a callback
 * that receives our API).
 */
interface WalletStandardAppApi {
  register(...wallets: StandardWallet[]): () => void;
}

function discoverWallets(onWallet: (wallet: StandardWallet) => void): () => void {
  const api: WalletStandardAppApi = {
    register: (...wallets: StandardWallet[]) => {
      for (const w of wallets) onWallet(w);
      return () => {};
    },
  };
  const onRegister = (event: Event) => {
    const callback = (event as CustomEvent<(api: WalletStandardAppApi) => void>)
      .detail;
    try {
      callback(api);
    } catch {
      // A misbehaving wallet must not break discovery of the others.
    }
  };
  window.addEventListener(
    "wallet-standard:register-wallet",
    onRegister as EventListener,
  );
  try {
    window.dispatchEvent(
      new CustomEvent("wallet-standard:app-ready", { detail: api }),
    );
  } catch {
    // Non-fatal: late-registering wallets still arrive via the listener.
  }
  return () =>
    window.removeEventListener(
      "wallet-standard:register-wallet",
      onRegister as EventListener,
    );
}

export interface WalletContextValue {
  /** Usable (mainnet, signing-capable) wallets detected in this browser. */
  wallets: StandardWallet[];
  /** The connected wallet, or null. */
  wallet: StandardWallet | null;
  /** The connected account, or null. */
  account: StandardWalletAccount | null;
  /** Kit TransactionSigner for the connected account (AgencProvider seam). */
  signer: TransactionSigner | null;
  /** True while a connect flow is in flight. */
  connecting: boolean;
  /** Connect a specific detected wallet (by name). */
  connect: (walletName: string) => Promise<void>;
  /** Disconnect the current wallet. */
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue>({
  wallets: [],
  wallet: null,
  account: null,
  signer: null,
  connecting: false,
  connect: async () => {},
  disconnect: async () => {},
});

export function useWallet(): WalletContextValue {
  return useContext(WalletContext);
}

export function WalletContextProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<StandardWallet[]>([]);
  const [wallet, setWallet] = useState<StandardWallet | null>(null);
  const [account, setAccount] = useState<StandardWalletAccount | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Discover injected wallets (client-only).
  useEffect(() => {
    return discoverWallets((w) => {
      if (!isUsable(w)) return;
      setWallets((prev) =>
        prev.some((p) => p.name === w.name) ? prev : [...prev, w],
      );
    });
  }, []);

  const adoptAccounts = useCallback(
    (w: StandardWallet, accounts: readonly StandardWalletAccount[]) => {
      const first = accounts[0] ?? null;
      setWallet(first ? w : null);
      setAccount(first);
      if (first) {
        try {
          window.localStorage.setItem(LAST_WALLET_KEY, w.name);
        } catch {
          /* storage may be unavailable; eager reconnect is best-effort */
        }
      }
    },
    [],
  );

  const connect = useCallback(
    async (walletName: string, silent = false) => {
      const w = wallets.find((x) => x.name === walletName);
      if (!w) throw new Error(`Wallet "${walletName}" not detected`);
      const connectFeature = feature<ConnectFeature>(w, "standard:connect");
      if (!connectFeature) throw new Error(`${w.name} cannot connect`);
      setConnecting(true);
      try {
        const { accounts } = await connectFeature.connect(
          silent ? { silent: true } : undefined,
        );
        adoptAccounts(w, accounts);
      } finally {
        setConnecting(false);
      }
    },
    [wallets, adoptAccounts],
  );

  const disconnect = useCallback(async () => {
    const w = wallet;
    setWallet(null);
    setAccount(null);
    try {
      window.localStorage.removeItem(LAST_WALLET_KEY);
    } catch {
      /* best-effort */
    }
    if (w) {
      await feature<DisconnectFeature>(w, "standard:disconnect")
        ?.disconnect()
        .catch(() => {});
    }
  }, [wallet]);

  // Eager silent reconnect to the wallet used last session — deferred a tick
  // so the connect flow (an external wallet API round-trip) never sets state
  // synchronously inside the effect body.
  useEffect(() => {
    if (wallet || wallets.length === 0) return;
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(LAST_WALLET_KEY);
    } catch {
      /* best-effort */
    }
    if (!saved || !wallets.some((w) => w.name === saved)) return;
    const timer = setTimeout(() => {
      void connect(saved, true).catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, [wallets, wallet, connect]);

  // Track account changes / wallet-side disconnects.
  useEffect(() => {
    if (!wallet) return;
    const events = feature<EventsFeature>(wallet, "standard:events");
    if (!events) return;
    return events.on("change", ({ accounts }) => {
      if (accounts) adoptAccounts(wallet, accounts);
    });
  }, [wallet, adoptAccounts]);

  // Bridge the connected account to the kit signer the SDK client expects.
  //
  // PREFER the wallet's injected legacy provider (window.phantom.solana /
  // window.solflare) via `signerFromWalletAdapter`: on the legacy sign path
  // wallets return the transaction UNMODIFIED, whereas on the Wallet Standard
  // `solana:signTransaction` feature Phantom/Solflare inject a Lighthouse
  // guard instruction into the message before signing. The AgenC bridge
  // re-attaches the extracted signature to the ORIGINAL message, so a
  // guard-mutated signature is invalid at submission and every hire fails
  // preflight. Verified empirically on mainnet (the mutated tx itself
  // simulates successfully; only the reattached signature is wrong).
  // Falls back to the Wallet Standard bridge for wallets with no injected
  // provider.
  const signer = useMemo<TransactionSigner | null>(() => {
    if (!wallet || !account) return null;
    const legacy = legacyProviderFor(account.address);
    if (legacy) {
      try {
        return signerFromWalletAdapter(legacy, { VersionedTransaction });
      } catch {
        /* fall through to the Wallet Standard bridge */
      }
    }
    const sign = feature<SignTransactionFeature>(
      wallet,
      "solana:signTransaction",
    );
    if (!sign) return null;
    try {
      return signerFromWalletAccount(
        { address: account.address, chains: account.chains },
        { chain: CHAIN, signTransaction: sign.signTransaction },
      );
    } catch {
      return null;
    }
  }, [wallet, account]);

  const value = useMemo<WalletContextValue>(
    () => ({
      wallets,
      wallet,
      account,
      signer,
      connecting,
      connect: (name: string) => connect(name),
      disconnect,
    }),
    [wallets, wallet, account, signer, connecting, connect, disconnect],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
