import { DocumentToolbar } from "@powerhousedao/design-system/connect";
import { useLoginStatus, useUser } from "@powerhousedao/reactor-browser";
import {
  actions,
  useSelectedAuthDashboardDocument,
} from "document-models/auth-dashboard";
import { Dashboard } from "./components/Dashboard.js";
import { SwitchboardForm } from "./components/SwitchboardForm.js";
import { useAuthApi } from "./hooks/useAuthApi.js";

type LoginVariant = "checking" | "not-authorized" | "logged-out";

function RenownArrow() {
  return (
    <>
      <style>{`
        @keyframes ph-auth-arrow-bounce {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-8px, 8px); }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          bottom: "90px",
          left: "50px",
          zIndex: 50,
          pointerEvents: "none",
          animation: "ph-auth-arrow-bounce 1.2s ease-in-out infinite",
          display: "flex",
          alignItems: "flex-end",
          gap: "8px",
        }}
      >
        <svg
          width="180"
          height="160"
          viewBox="0 0 180 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.15))" }}
        >
          <defs>
            <marker
              id="ph-auth-arrowhead"
              viewBox="0 0 12 12"
              refX="11"
              refY="6"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
              markerUnits="strokeWidth"
            >
              <path
                d="M1 1 L11 6 L1 11"
                stroke="#4f46e5"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </marker>
          </defs>
          <path
            d="M170 15 Q 100 25, 80 70 Q 45 115, 15 140"
            stroke="#4f46e5"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            markerEnd="url(#ph-auth-arrowhead)"
          />
        </svg>
        <span
          style={{
            display: "inline-block",
            padding: "6px 12px",
            backgroundColor: "#4f46e5",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 600,
            borderRadius: "8px",
            whiteSpace: "nowrap",
            marginBottom: "24px",
            boxShadow: "0 4px 12px rgba(79, 70, 229, 0.35)",
          }}
        >
          Click here to log in
        </span>
      </div>
    </>
  );
}

function LoginRequired({ variant }: { variant: LoginVariant }) {
  const isChecking = variant === "checking";

  let title: string;
  let body: string;
  if (isChecking) {
    title = "Checking authentication...";
    body = "Verifying your Renown credentials...";
  } else if (variant === "not-authorized") {
    title = "Not Authorized";
    body =
      "Your wallet is not authorized to access this switchboard. Contact an admin to be added to the allowed list.";
  } else {
    title = "Log in with Renown";
    body =
      "Use the Renown button in the sidebar to log in with your wallet. Your bearer token and permissions are derived from your login session.";
  }

  return (
    <>
      {variant === "logged-out" && <RenownArrow />}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: isChecking ? "#fef3c7" : "#eef2ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "24px",
            fontSize: "28px",
          }}
        >
          {isChecking ? "⏳" : variant === "not-authorized" ? "🔒" : "👋"}
        </div>
        <h2
          style={{
            fontSize: "20px",
            fontWeight: 600,
            marginBottom: "8px",
            color: "#1a1a2e",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "#6b7280",
            maxWidth: "440px",
            lineHeight: 1.6,
          }}
        >
          {body}
        </p>
      </div>
    </>
  );
}

function resolveLoginVariant(
  status: string | undefined,
  hasUser: boolean,
): LoginVariant {
  if (status === "checking") return "checking";
  if (status === "not-authorized") return "not-authorized";
  // "initial", "loading", undefined, or authorized-without-address all fall
  // through to "log in" — the user has no active session yet.
  if (!hasUser) return "logged-out";
  return "checking";
}

export default function Editor() {
  const [document, dispatch] = useSelectedAuthDashboardDocument();
  const user = useUser();
  const loginStatus = useLoginStatus();
  const switchboardUrl = document.state.global.switchboardUrl || "";
  const { query, isReady } = useAuthApi(switchboardUrl || undefined);

  const isLoggedIn = !!user?.address && loginStatus === "authorized";

  const handleConnect = (url: string) => {
    dispatch(actions.setSwitchboardUrl({ url }));
  };

  const handleDisconnect = () => {
    dispatch(actions.setSwitchboardUrl({ url: "" }));
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <DocumentToolbar />

      {!isLoggedIn ? (
        <LoginRequired
          variant={resolveLoginVariant(loginStatus, !!user?.address)}
        />
      ) : isReady ? (
        <Dashboard
          switchboardUrl={switchboardUrl}
          query={query}
          userAddress={user.address}
          onDisconnect={handleDisconnect}
        />
      ) : (
        <SwitchboardForm onSubmit={handleConnect} />
      )}
    </div>
  );
}
