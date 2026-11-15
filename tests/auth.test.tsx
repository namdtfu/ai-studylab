import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { it, expect, vi, beforeEach } from "vitest";
const mock = vi.hoisted(() => ({
  session: null as unknown,
  listener: undefined as
    | undefined
    | ((event: string, session: unknown) => void),
  signOut: vi.fn(),
  getSession: vi.fn(),
}));
vi.mock("../src/lib/supabase", () => ({
  initialRecovery: false,
  supabase: {
    auth: {
      getSession: mock.getSession,
      onAuthStateChange: (fn: typeof mock.listener) => {
        mock.listener = fn;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signOut: mock.signOut,
    },
  },
}));
vi.mock("../src/lib/api", () => ({ api: { profile: () => Promise.reject() } }));
import { AuthProvider, Protected, useAuth } from "../src/app/Auth";
import { act } from "react";
import { useState } from "react";
import { useLoad } from "../src/components/ui";
beforeEach(() => {
  mock.session = null;
  mock.getSession.mockImplementation(async () => ({
    data: { session: mock.session },
    error: null,
  }));
  mock.signOut.mockResolvedValue({});
});
function Harness() {
  const a = useAuth();
  return (
    <>
      <span>{a.user ? "signed-in" : "signed-out"}</span>
      <button onClick={() => void a.logout()}>out</button>
    </>
  );
}
it("redirects unauthenticated protected routes", async () => {
  render(
    <MemoryRouter initialEntries={["/private"]}>
      <AuthProvider>
        <Routes>
          <Route path="/private" element={<Protected>secret</Protected>} />
          <Route path="/login" element={<span>login-page</span>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(await screen.findByText("login-page")).toBeVisible();
  expect(screen.queryByText("secret")).toBeNull();
});
it("shows loading until session resolves", async () => {
  let resolve!: (v: unknown) => void;
  mock.getSession.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  render(
    <MemoryRouter>
      <AuthProvider>
        <Protected>secret</Protected>
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(screen.queryByText("secret")).toBeNull();
  await act(async () => {
    resolve({ data: { session: { user: { id: "a" } } }, error: null });
  });
  expect(await screen.findByText("secret")).toBeVisible();
});
it("handles session expiration and logout", async () => {
  mock.session = { user: { id: "a" } };
  render(
    <AuthProvider>
      <Harness />
    </AuthProvider>,
  );
  expect(await screen.findByText("signed-in")).toBeVisible();
  await act(async () => {
    mock.listener?.("SIGNED_OUT", null);
  });
  expect(screen.getByText("signed-out")).toBeVisible();
  await act(async () => {
    mock.listener?.("SIGNED_IN", { user: { id: "a" } });
  });
  await act(async () => {
    screen.getByText("out").click();
  });
  await waitFor(() => expect(mock.signOut).toHaveBeenCalled());
  expect(screen.getByText("signed-out")).toBeVisible();
});
it("clears private state on an account change and ignores the prior account's late response", async () => {
  mock.session = { user: { id: "a" } };
  let resolveA!: (value: string) => void;
  let resolveB!: (value: string) => void;
  const loads = {
    a: new Promise<string>((r) => {
      resolveA = r;
    }),
    b: new Promise<string>((r) => {
      resolveB = r;
    }),
  };
  function PrivatePanel() {
    const { user } = useAuth();
    const [draft, setDraft] = useState("");
    const data = useLoad(() => loads[user!.id as "a" | "b"], []);
    return (
      <>
        <input
          aria-label="private draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <p>{data.data || "waiting"}</p>
      </>
    );
  }
  render(
    <MemoryRouter>
      <AuthProvider>
        <Protected>
          <PrivatePanel />
        </Protected>
      </AuthProvider>
    </MemoryRouter>,
  );
  const input = await screen.findByLabelText("private draft");
  // Native change through testing-library is sufficient for an account-local buffer.
  const { fireEvent } = await import("@testing-library/react");
  fireEvent.change(input, { target: { value: "account-a-draft" } });
  await act(async () =>
    mock.listener?.("TOKEN_REFRESHED", { user: { id: "a" } }),
  );
  expect(screen.getByLabelText("private draft")).toHaveValue("account-a-draft");
  await act(async () => mock.listener?.("SIGNED_IN", { user: { id: "b" } }));
  expect(screen.getByLabelText("private draft")).toHaveValue("");
  await act(async () => resolveA("account-a-secret"));
  expect(screen.queryByText("account-a-secret")).toBeNull();
  await act(async () => resolveB("account-b-data"));
  expect(await screen.findByText("account-b-data")).toBeVisible();
});
