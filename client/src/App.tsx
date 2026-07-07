import { useEffect, useState } from "react";
import { apiRequest, type MeResponse } from "./api";
import { LoginPage } from "./pages/LoginPage";
import { SummaryPage } from "./pages/SummaryPage";

type AuthState = {
  loading: boolean;
  authenticated: boolean;
  username: string;
};

export function App() {
  const [auth, setAuth] = useState<AuthState>({
    loading: true,
    authenticated: false,
    username: ""
  });

  async function refreshAuth() {
    try {
      const me = await apiRequest<MeResponse>("/api/me", { method: "GET" });
      setAuth({
        loading: false,
        authenticated: me.authenticated,
        username: me.username ?? ""
      });
    } catch {
      setAuth({ loading: false, authenticated: false, username: "" });
    }
  }

  useEffect(() => {
    refreshAuth();
  }, []);

  if (auth.loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-clinical-muted">正在檢查登入狀態...</p>
      </main>
    );
  }

  if (!auth.authenticated) {
    return <LoginPage onLogin={refreshAuth} />;
  }

  return (
    <SummaryPage
      username={auth.username}
      onLogout={() =>
        setAuth({ loading: false, authenticated: false, username: "" })
      }
    />
  );
}
