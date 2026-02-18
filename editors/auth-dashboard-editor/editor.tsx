import { DocumentToolbar } from "@powerhousedao/design-system/connect";
import {
  useUser,
  useLoginStatus,
} from "@powerhousedao/reactor-browser/connect";
import {
  useSelectedAuthDashboardDocument,
  setSwitchboardUrl,
} from "@powerhousedao/auth-editor/document-models/auth-dashboard";
import { useAuthApi } from "./hooks/useAuthApi.js";
import { SwitchboardForm } from "./components/SwitchboardForm.js";
import { Dashboard } from "./components/Dashboard.js";

function LoginRequired({ status }: { status: string | undefined }) {
  return (
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
          backgroundColor: "#fef3c7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "24px",
          fontSize: "28px",
        }}
      >
        {status === "checking" ? "\u23F3" : "\uD83D\uDD12"}
      </div>
      <h2
        style={{
          fontSize: "20px",
          fontWeight: 600,
          marginBottom: "8px",
          color: "#1a1a2e",
        }}
      >
        {status === "checking"
          ? "Checking authentication..."
          : "Login Required"}
      </h2>
      <p
        style={{
          fontSize: "14px",
          color: "#6b7280",
          maxWidth: "400px",
          lineHeight: 1.6,
        }}
      >
        {status === "checking"
          ? "Verifying your Renown credentials..."
          : status === "not-authorized"
            ? "Your wallet is not authorized to access this switchboard. Contact an admin to be added to the allowed list."
            : "Please log in with your wallet via Renown to use the Auth Dashboard. Your bearer token and permissions are derived from your login session."}
      </p>
    </div>
  );
}

export default function Editor() {
  const [document, dispatch] = useSelectedAuthDashboardDocument();
  const user = useUser();
  const loginStatus = useLoginStatus();
  const switchboardUrl = document.state.global.switchboardUrl || "";
  const { query, isReady } = useAuthApi(switchboardUrl || undefined);

  const isLoggedIn = !!user?.address && loginStatus === "authorized";
  const isLoading = loginStatus === "checking" || loginStatus === "initial";

  const handleConnect = (url: string) => {
    dispatch(setSwitchboardUrl({ url }));
  };

  const handleDisconnect = () => {
    dispatch(setSwitchboardUrl({ url: "" }));
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
        <LoginRequired status={isLoading ? "checking" : loginStatus} />
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
