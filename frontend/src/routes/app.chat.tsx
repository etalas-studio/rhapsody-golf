import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/appContext";
import { formatIDR } from "@/lib/mockData";
import { Bot, Send, CheckCircle2, CalendarCheck, ChevronRight, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

/** Renders AI reply text: newlines preserved, **bold** supported. */
function ChatText({ text }: { text: string }) {
  const decoded = text.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return (
    <span className="whitespace-pre-line">
      {decoded.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : part
      )}
    </span>
  );
}

export const Route = createFileRoute("/app/chat")({
  head: () => ({ meta: [{ title: "Chat · Rhapsody App" }] }),
  component: AppChat,
});

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3001";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConfirmButton = {
  label: string;
  action: "confirm_booking" | "cancel_booking";
  payload?: BookingPayload;
};

type BookingSummary = {
  bookingId?: string;
  course: string;
  date: string;
  time: string;
  players: number;
  amount: number;
  ref?: string;
  invoiceUrl?: string;
};

type MessageKind = "text" | "confirm" | "booking_confirmed";

type Message = {
  id: number;
  role: "user" | "assistant";
  kind: MessageKind;
  text: string;
  buttons?: ConfirmButton[];
  booking?: BookingSummary;
};

type BookingPayload = {
  booking_id?: string;
  slot_id?: string;
  club_id?: string;
  course_name?: string;
  date?: string;
  time?: string;
  players?: number;
  amount?: number;
  cart?: boolean;
  caddie?: boolean;
  voucher_code?: string;
};

// ─── WELCOME ─────────────────────────────────────────────────────────────────

const WELCOME: Message = {
  id: 0,
  role: "assistant",
  kind: "text",
  text: "Halo! Saya asisten booking Rhapsody Golf Connect. Mau booking tee time?",
};

// ─── Bubble components ────────────────────────────────────────────────────────

function TextBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-primary/10 grid place-items-center mr-2 mt-0.5 shrink-0">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        <ChatText text={msg.text} />
      </div>
    </div>
  );
}

function ConfirmBubble({
  msg,
  onAction,
  dismissed,
}: {
  msg: Message;
  onAction: (btn: ConfirmButton) => void;
  dismissed: boolean;
}) {
  return (
    <div className="flex justify-start">
      <div className="h-7 w-7 rounded-full bg-primary/10 grid place-items-center mr-2 mt-0.5 shrink-0">
        <Bot className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="max-w-[85%] space-y-2">
        <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed">
          <ChatText text={msg.text} />
        </div>
        {!dismissed && msg.buttons && (
          <div className="flex flex-wrap gap-2">
            {msg.buttons.map((btn) => (
              <Button
                key={btn.action}
                size="sm"
                variant={btn.action === "confirm_booking" ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => onAction(btn)}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        )}
        {dismissed && (
          <Badge variant="outline" className="text-[10px]">Action completed</Badge>
        )}
      </div>
    </div>
  );
}

function BookingConfirmedBubble({
  booking,
  onPay,
}: {
  booking: BookingSummary;
  onPay?: () => void;
}) {
  return (
    <div className="flex justify-start">
      <div className="h-7 w-7 rounded-full bg-primary/10 grid place-items-center mr-2 mt-0.5 shrink-0">
        <Bot className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="max-w-[85%] space-y-2">
        {/* Booking card — tap to open detail */}
        <button
          onClick={onPay}
          className="w-full text-left rounded-2xl rounded-bl-sm border border-primary/20 bg-card shadow-sm overflow-hidden active:opacity-80 transition-opacity"
        >
          <div className="bg-gradient-to-r from-primary to-primary/70 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-primary-foreground font-medium text-[13px]">
              <CalendarCheck className="h-3.5 w-3.5" /> Booking dibuat
            </div>
            <ChevronRight className="h-4 w-4 text-primary-foreground/70" />
          </div>
          <div className="px-4 py-3 space-y-1 text-[13px]">
            <p className="font-semibold">{booking.course}</p>
            <p className="text-muted-foreground">{booking.date} · {booking.time} WIB</p>
            <p className="font-medium text-primary">{formatIDR(booking.amount)}</p>
          </div>
        </button>
        {/* Pay button */}
        {onPay && (
          <Button size="sm" className="w-full h-9 text-xs gap-1.5" onClick={onPay}>
            <CreditCard className="h-3.5 w-3.5" /> Bayar Sekarang
          </Button>
        )}
        {booking.invoiceUrl && (
          <a
            href={booking.invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[12px] text-primary font-medium underline underline-offset-2 px-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Lihat Invoice
          </a>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="h-7 w-7 rounded-full bg-primary/10 grid place-items-center mr-2 shrink-0">
        <Bot className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function AppChat() {
  const { user } = useApp();
  const navigate = useNavigate();
  const userId = user?.id ?? "guest";

  const SESSION_KEY = `chat_session_${userId}`;
  const MSG_KEY = `chat_messages_${userId}`;

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(MSG_KEY);
      return saved ? JSON.parse(saved) : [WELCOME];
    } catch (_) {
      return [WELCOME];
    }
  });
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const [sessionId, setSessionId] = useState<string | null>(
    () => localStorage.getItem(SESSION_KEY)
  );
  const [agentState, setAgentState] = useState<unknown>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Holds the last booking payload from the confirm step so we can show the card after BOOKED
  const pendingPayload = useRef<BookingPayload | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    try { localStorage.setItem(MSG_KEY, JSON.stringify(messages)); } catch (_) {}
  }, [messages, loading]);

  async function sendToBackend(userText: string) {
    try {
      const res = await fetch(`${BACKEND}/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          message: userText,
          currentState: agentState,
          sessionId,          // null on first call — backend creates and returns one
        }),
      });

      if (!res.ok) throw new Error(`Backend ${res.status}`);
      const data: {
        reply: string;
        confirmButtons?: boolean;
        bookingPayload?: BookingPayload;
        snapToken?: string;
        orderId?: string;
        invoiceUrl?: string;
        state?: unknown;
        sessionId?: string;
      } = await res.json();

      if (data.sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem(SESSION_KEY, data.sessionId);
      }
      if (data.state !== undefined) setAgentState(data.state);

      const id = Date.now();
      if (data.confirmButtons && data.bookingPayload) {
        // Pre-payment confirmation summary — store payload, show confirm buttons
        pendingPayload.current = data.bookingPayload;
        const buttons: ConfirmButton[] = [
          { label: "✅ Konfirmasi", action: "confirm_booking", payload: data.bookingPayload },
          { label: "❌ Batal", action: "cancel_booking" },
        ];
        setMessages((prev) => [
          ...prev,
          { id, role: "assistant", kind: "confirm", text: data.reply, buttons },
        ]);
      } else if (data.bookingPayload?.booking_id) {
        // Booking created — show card with pay button → navigate to booking detail
        const p = data.bookingPayload;
        const booking: BookingSummary = {
          bookingId: p.booking_id,
          course: p.course_name ?? "",
          date: p.date ?? "",
          time: p.time ?? "",
          players: p.players ?? 1,
          amount: p.amount ?? 0,
        };
        pendingPayload.current = null;
        setMessages((prev) => [
          ...prev,
          { id, role: "assistant", kind: "booking_confirmed", text: data.reply, booking },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id, role: "assistant", kind: "text", text: data.reply },
        ]);
      }
    } catch (_) {
      // Backend offline — show graceful fallback
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          kind: "text",
          text: "Maaf, sedang ada kendala koneksi. Coba lagi ya.",
        },
      ]);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", kind: "text", text }]);
    setLoading(true);
    await sendToBackend(text);
    setLoading(false);
  }

  async function handleConfirmAction(msgId: number, btn: ConfirmButton) {
    setDismissedIds((prev) => new Set(prev).add(msgId));
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", kind: "text", text: btn.label }]);

    if (btn.action === "cancel_booking") {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "assistant", kind: "text", text: "Oke, pemesanan dibatalkan. Ada yang bisa saya bantu?" },
      ]);
      setAgentState(null);
      return;
    }

    // confirm_booking — send payload to backend as a natural-language confirm trigger
    // so the agent calls CreateBookingTool
    setLoading(true);
    await sendToBackend(
      `__action:confirm_booking:${JSON.stringify(btn.payload ?? {})}`
    );
    setLoading(false);
  }

  const isOnline = typeof window !== "undefined" && navigator.onLine;

  return (
    <MobileShell>
      <div className="flex flex-col h-[calc(100dvh-7.5rem)]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card/60">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-primary/10 grid place-items-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Rhapsody Assistant</p>
              <p className="text-[10px] text-muted-foreground">Booking & concierge</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-amber-400")} />
            <span className="text-[10px] text-muted-foreground">{isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((m) => {
            if (m.kind === "booking_confirmed" && m.booking) {
              const bid = m.booking.bookingId;
              const onPay = bid
                ? () => navigate({ to: "/app/bookings/$bookingId", params: { bookingId: bid } })
                : undefined;
              return <BookingConfirmedBubble key={m.id} booking={m.booking} onPay={onPay} />;
            }
            if (m.kind === "confirm") {
              return (
                <ConfirmBubble
                  key={m.id}
                  msg={m}
                  dismissed={dismissedIds.has(m.id)}
                  onAction={(btn) => handleConfirmAction(m.id, btn)}
                />
              );
            }
            return <TextBubble key={m.id} msg={m} />;
          })}

          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts — shown only when just WELCOME visible */}
        {messages.length === 1 && !loading && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {[
              "Book a tee time at Emerald Hills",
              "Check my loyalty points",
              "Do I have any vouchers?",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setInput(prompt);
                }}
                className="text-xs border rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted/60 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="px-4 pb-4 pt-2 border-t border-border flex gap-2">
          <Input
            placeholder="Message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1"
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || loading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </MobileShell>
  );
}
