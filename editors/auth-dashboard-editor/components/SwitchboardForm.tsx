import { useState } from "react";

interface Props {
  onSubmit: (url: string) => void;
}

export function SwitchboardForm({ onSubmit }: Props) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a URL");
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    // Test connectivity using GET which bypasses the auth middleware.
    // In production, Connect and the reactor share the same origin
    // so CORS is not an issue. In development with separate ports,
    // GET requests still work because auth passes OPTIONS/GET through.
    setTesting(true);
    fetch(`${trimmed}?query=${encodeURIComponent("{ __typename }")}`, {
      method: "GET",
      headers: { "apollo-require-preflight": "true" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        onSubmit(trimmed);
      })
      .catch(() => {
        setError(
          "Could not reach the switchboard. Make sure the reactor is running.",
        );
      })
      .finally(() => {
        setTesting(false);
      });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        padding: "48px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "24px",
            fontWeight: 600,
            marginBottom: "8px",
            color: "#1a1a2e",
          }}
        >
          Connect to Switchboard
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "#6b7280",
            marginBottom: "32px",
          }}
        >
          Enter the GraphQL endpoint of your Switchboard to manage user
          permissions. Auth is handled automatically via your Renown login.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:4001/graphql"
            disabled={testing}
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: "14px",
              border: error ? "1px solid #ef4444" : "1px solid #d1d5db",
              borderRadius: "8px",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "monospace",
            }}
          />

          {error && (
            <p
              style={{
                color: "#ef4444",
                fontSize: "13px",
                marginTop: "8px",
                textAlign: "left",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={testing}
            style={{
              marginTop: "16px",
              width: "100%",
              padding: "12px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#fff",
              backgroundColor: testing ? "#9ca3af" : "#4f46e5",
              border: "none",
              borderRadius: "8px",
              cursor: testing ? "not-allowed" : "pointer",
            }}
          >
            {testing ? "Testing connection..." : "Connect"}
          </button>
        </form>
      </div>
    </div>
  );
}
