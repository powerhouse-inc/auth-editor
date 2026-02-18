import { useCallback, useEffect, useState } from "react";
import { GroupsTab } from "./GroupsTab.js";
import { PermissionsTab } from "./PermissionsTab.js";
import { MyPermissionsTab } from "./MyPermissionsTab.js";
import { useEnsName, formatAddress } from "../hooks/useEnsName.js";

type Tab = "groups" | "permissions" | "my-permissions";

const ADMIN_TABS: { id: Tab; label: string }[] = [
  { id: "groups", label: "Groups" },
  { id: "permissions", label: "Document Permissions" },
  { id: "my-permissions", label: "My Permissions" },
];

const NON_ADMIN_TABS: { id: Tab; label: string }[] = [
  { id: "my-permissions", label: "My Permissions" },
];

interface Props {
  switchboardUrl: string;
  query: <T>(gql: string, variables?: Record<string, unknown>) => Promise<T>;
  userAddress: string;
  onDisconnect: () => void;
}

const WHOAMI_QUERY = `query WhoAmI($address: String!) {
  whoami(address: $address) {
    address
    isAdmin
    isUser
    isGuest
  }
}`;

export function Dashboard({
  switchboardUrl,
  query,
  userAddress,
  onDisconnect,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("my-permissions");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = checking
  const ensName = useEnsName(userAddress);

  const checkAdmin = useCallback(async () => {
    try {
      const data = await query<{
        whoami: {
          address: string;
          isAdmin: boolean;
          isUser: boolean;
          isGuest: boolean;
        };
      }>(WHOAMI_QUERY, { address: userAddress });
      const admin = data.whoami.isAdmin;
      setIsAdmin(admin);
      if (admin) setActiveTab("groups");
    } catch {
      setIsAdmin(false);
    }
  }, [query, userAddress]);

  useEffect(() => {
    void checkAdmin();
  }, [checkAdmin]);

  const tabs = isAdmin ? ADMIN_TABS : NON_ADMIN_TABS;

  if (isAdmin === null) {
    return (
      <p style={{ color: "#6b7280", padding: "24px" }}>
        Checking permissions...
      </p>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          paddingBottom: "16px",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 600,
              margin: "0 0 4px 0",
              color: "#1a1a2e",
            }}
          >
            Auth Dashboard
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "#6b7280",
              margin: "0 0 2px 0",
              fontFamily: "monospace",
            }}
          >
            {switchboardUrl}
          </p>
          <p
            style={{
              fontSize: "12px",
              color: "#9ca3af",
              margin: 0,
              fontFamily: "monospace",
            }}
          >
            Logged in as {formatAddress(userAddress, ensName)}
          </p>
        </div>
        <button
          onClick={onDisconnect}
          style={{
            padding: "6px 12px",
            fontSize: "13px",
            color: "#6b7280",
            backgroundColor: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Disconnect
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0",
          marginBottom: "24px",
          borderBottom: "2px solid #e5e7eb",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? "#4f46e5" : "#6b7280",
              backgroundColor: "transparent",
              border: "none",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid #4f46e5"
                  : "2px solid transparent",
              marginBottom: "-2px",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "groups" && isAdmin && <GroupsTab query={query} />}
      {activeTab === "permissions" && isAdmin && (
        <PermissionsTab query={query} />
      )}
      {activeTab === "my-permissions" && (
        <MyPermissionsTab
          query={query}
          userAddress={userAddress}
          isAdmin={!!isAdmin}
        />
      )}
    </div>
  );
}
