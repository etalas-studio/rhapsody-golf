declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

const MIDTRANS_CLIENT_KEY = import.meta.env.VITE_MIDTRANS_CLIENT_KEY ?? "";
const SNAP_JS_URL =
  import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === "true"
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

export function loadSnapScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.snap) { resolve(); return; }
    const existing = document.querySelector(`script[src*="snap.js"]`);
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const script = document.createElement("script");
    script.src = SNAP_JS_URL;
    script.setAttribute("data-client-key", MIDTRANS_CLIENT_KEY);
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

export function openSnap(
  snapToken: string,
  callbacks?: {
    onSuccess?: (result: unknown) => void;
    onPending?: () => void;
    onError?: (result: unknown) => void;
    onClose?: () => void;
  }
) {
  loadSnapScript().then(() => {
    window.snap?.pay(snapToken, {
      onSuccess: callbacks?.onSuccess,
      onPending: callbacks?.onPending,
      onError: callbacks?.onError,
      onClose: callbacks?.onClose,
    });
  });
}
