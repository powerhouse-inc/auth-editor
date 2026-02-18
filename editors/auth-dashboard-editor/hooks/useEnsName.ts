import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const client = createPublicClient({
  chain: mainnet,
  transport: http("https://eth.llamarpc.com"),
});

const cache = new Map<string, string | null>();

async function resolveEns(address: string): Promise<string | null> {
  const lower = address.toLowerCase();
  if (cache.has(lower)) return cache.get(lower) ?? null;

  try {
    const name = await client.getEnsName({
      address: address as `0x${string}`,
    });
    cache.set(lower, name);
    return name;
  } catch {
    cache.set(lower, null);
    return null;
  }
}

/**
 * React hook to resolve an ENS name for a given Ethereum address.
 */
export function useEnsName(address: string | undefined): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setName(null);
      return;
    }
    void resolveEns(address).then(setName);
  }, [address]);

  return name;
}

/**
 * Format an address: shows "name.eth (0xab...cd)" or just "0xab...cd".
 */
export function formatAddress(address: string, ensName: string | null): string {
  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
  return ensName ? `${ensName} (${short})` : short;
}
