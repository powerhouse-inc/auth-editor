import { useEnsName, formatAddress } from "../hooks/useEnsName.js";

interface Props {
  address: string;
  full?: boolean;
}

/**
 * Renders an address with ENS name if available.
 * Use `full` to show the complete address instead of truncated.
 */
export function EnsAddress({ address, full }: Props) {
  const ensName = useEnsName(address);

  if (full) {
    return <>{ensName ? `${ensName} (${address})` : address}</>;
  }

  return <>{formatAddress(address, ensName)}</>;
}
