import { useState } from "react";
import { GroupsTab } from "./GroupsTab.js";
import { PermissionsTab } from "./PermissionsTab.js";
import { MyPermissionsTab } from "./MyPermissionsTab.js";
import { useEnsName, formatAddress } from "../hooks/useEnsName.js";

type Tab = "groups" | "permissions" | "my-permissions";

const TABS: { id: Tab; label: string }[] = [
  { id: "my-permissions", label: "My Permissions" },
  { id: "groups", label: "Groups" },
  { id: "permissions", label: "Document Permissions" },
];

interface Props {
  switchboardUrl: string;
  query: <T>(gql: string, variables?: Record<string, unknown>) => Promise<T>;
  userAddress: string;
  onDisconnect: () => void;
}

export function Dashboard({
  switchboardUrl,
  query,
  userAddress,
  onDisconnect,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("my-permissions");
  const ensName = useEnsName(userAddress);

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

      {/* v6 model note — three-tier global roles are gone */}
      <div
        style={{
          padding: "10px 14px",
          backgroundColor: "#eef2ff",
          border: "1px solid #c7d2fe",
          borderRadius: "6px",
          marginBottom: "16px",
          fontSize: "12px",
          color: "#4338ca",
          lineHeight: 1.5,
        }}
      >
        Powerhouse v6 has no global <code>ADMIN</code> / <code>USER</code> /{" "}
        <code>GUEST</code> tiers. Access is controlled by per-document
        protection &amp; grants, with the reactor&apos;s <code>ADMINS</code> env
        list as the only supreme override. Admin-only actions below will fail
        with a permission error if your wallet isn&apos;t in <code>ADMINS</code>{" "}
        or hasn&apos;t been granted that document <code>ADMIN</code>.
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
        {TABS.map((tab) => (
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
      {activeTab === "groups" && <GroupsTab query={query} />}
      {activeTab === "permissions" && <PermissionsTab query={query} />}
      {activeTab === "my-permissions" && (
        <MyPermissionsTab query={query} userAddress={userAddress} />
      )}
    </div>
  );
}
