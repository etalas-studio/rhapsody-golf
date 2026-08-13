// Mock data for the Rhapsody App prototype.
// All data is in-memory and read-only for demo purposes.

export type Role = "golfer" | "club_admin" | "superadmin";
export type AppMode = "rhapsody" | "club_branded";

/** Course policy for cart / caddie service. */
export type ServicePolicy = "optional" | "included" | "mandatory";

export interface Club {
  id: string;
  name: string;
  shortName: string;
  location: string;
  region: string;
  logo: string; // emoji used as logo placeholder
  banner: string;
  themeColor: string;
  appType: "Rhapsody Only" | "Club-Branded";
  integrationStatus: "Online" | "Warning" | "Offline";
  startingPrice: number;
  rating: number;
  facilities: string[];
  description: string;
  poweredBy: "Rhapsody";
  /** How the club handles carts. */
  cart_policy: ServicePolicy;
  /** Per-player cart fee (IDR). 0 when policy is "included". */
  cart_fee: number;
  /** How the club handles caddies. */
  caddie_policy: ServicePolicy;
  /** Per-player caddie fee (IDR). 0 when policy is "included". */
  caddie_fee: number;
  /** What's included in the listed price. */
  price_includes?: string[];
  terms_and_conditions?: string;
  /** Hero photo URL. Null = fall back to gradient banner. */
  banner_url: string | null;
  /** Google Maps / embed URL for the course location. Null = not set. */
  maps_url: string | null;
}

export const clubs: Club[] = [
  {
    id: "emerald",
    name: "Emerald Hills Golf Club",
    shortName: "Emerald Hills",
    location: "Bogor, Indonesia",
    region: "Greater Jakarta",
    logo: "🌿",
    banner: "linear-gradient(135deg,#0e3b2e,#2d7a5f)",
    themeColor: "#0e3b2e",
    appType: "Club-Branded",
    integrationStatus: "Online",
    startingPrice: 1250000,
    rating: 4.9,
    facilities: ["18 Holes Championship", "Driving Range", "Pro Shop", "Clubhouse Dining", "Spa"],
    description:
      "A signature championship course nestled in the Bogor highlands with elevation drops and bentgrass greens.",
    poweredBy: "Rhapsody",
    cart_policy: "optional",
    cart_fee: 250000,
    caddie_policy: "mandatory",
    caddie_fee: 200000,
    banner_url: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&q=80",
    maps_url: null,
  },
  {
    id: "royal-jakarta",
    name: "Royal Jakarta Golf Club",
    shortName: "Royal Jakarta",
    location: "Jakarta, Indonesia",
    region: "Greater Jakarta",
    logo: "👑",
    banner: "linear-gradient(135deg,#1a2a40,#3a5a80)",
    themeColor: "#1a2a40",
    appType: "Club-Branded",
    integrationStatus: "Online",
    startingPrice: 1800000,
    rating: 4.8,
    facilities: ["27 Holes", "Floodlit Range", "Members Lounge", "Fine Dining"],
    description: "An urban championship layout with manicured fairways minutes from the CBD.",
    poweredBy: "Rhapsody",
    cart_policy: "mandatory",
    cart_fee: 300000,
    caddie_policy: "optional",
    caddie_fee: 250000,
    banner_url: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80",
    maps_url: null,
  },
  {
    id: "bali-national",
    name: "Bali National Golf Club",
    shortName: "Bali National",
    location: "Nusa Dua, Bali",
    region: "Bali",
    logo: "🌺",
    banner: "linear-gradient(135deg,#0f4d3a,#1e8a6b)",
    themeColor: "#0f4d3a",
    appType: "Club-Branded",
    integrationStatus: "Warning",
    startingPrice: 2400000,
    rating: 4.9,
    facilities: ["18 Holes Resort", "Caddie Service", "Beach Club", "Tournament Pavilion"],
    description: "An award-winning Nusa Dua layout hosting regional tournaments year-round.",
    poweredBy: "Rhapsody",
    cart_policy: "included",
    cart_fee: 0,
    caddie_policy: "included",
    caddie_fee: 0,
    banner_url: "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&q=80",
    maps_url: null,
  },
  {
    id: "surabaya-links",
    name: "Surabaya Links Golf",
    shortName: "Surabaya Links",
    location: "Surabaya, Indonesia",
    region: "East Java",
    logo: "⛳",
    banner: "linear-gradient(135deg,#2d4a1e,#5a8a3a)",
    themeColor: "#2d4a1e",
    appType: "Rhapsody Only",
    integrationStatus: "Online",
    startingPrice: 950000,
    rating: 4.6,
    facilities: ["18 Holes Links", "Driving Range", "Café"],
    description: "A windswept links experience along the East Java coast.",
    poweredBy: "Rhapsody",
    cart_policy: "optional",
    cart_fee: 220000,
    caddie_policy: "optional",
    caddie_fee: 180000,
    banner_url: "https://images.unsplash.com/photo-1510525009521-94e4e4bbb44c?w=800&q=80",
    maps_url: null,
  },
  {
    id: "bandung-highland",
    name: "Bandung Highland Golf",
    shortName: "Bandung Highland",
    location: "Bandung, Indonesia",
    region: "West Java",
    logo: "🏔️",
    banner: "linear-gradient(135deg,#1e3a2d,#4a8a6a)",
    themeColor: "#1e3a2d",
    appType: "Rhapsody Only",
    integrationStatus: "Offline",
    startingPrice: 850000,
    rating: 4.4,
    facilities: ["18 Holes Mountain", "Mist View Deck"],
    description: "Cool-climate mountain golf with panoramic tea plantation views.",
    poweredBy: "Rhapsody",
    cart_policy: "optional",
    cart_fee: 200000,
    caddie_policy: "mandatory",
    caddie_fee: 150000,
    banner_url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    maps_url: null,
  },
];

export interface UserAccount {
  id: string;
  name: string;
  phone: string;
  email: string;
  rhapsody_id: string;
  created_at: string;
  avatar: string;
  /** WHS-style Handicap Index. Negative = better than scratch (plus handicap). */
  handicap_index: number;
  /** ISO date of last handicap revision. */
  handicap_updated: string;
}

export const currentUser: UserAccount = {
  id: "u-1001",
  name: "Michael Tan",
  phone: "+62 812 3456 7890",
  email: "michael.tan@example.com",
  rhapsody_id: "RH-10001",
  created_at: "2023-04-12",
  avatar: "MT",
  handicap_index: 12.4,
  handicap_updated: "2026-06-15",
};

export const networkUsers: UserAccount[] = [
  currentUser,
  { id: "u-1002", name: "Sarah Wijaya", phone: "+62 811 2222 3333", email: "sarah.w@example.com", rhapsody_id: "RH-10002", created_at: "2023-06-01", avatar: "SW", handicap_index: 18.7, handicap_updated: "2026-06-10" },
  { id: "u-1003", name: "David Hartono", phone: "+62 813 4567 8901", email: "david.h@example.com", rhapsody_id: "RH-10003", created_at: "2023-08-15", avatar: "DH", handicap_index: 6.2, handicap_updated: "2026-06-18" },
  { id: "u-1004", name: "Linda Suryadi", phone: "+62 815 9876 5432", email: "linda.s@example.com", rhapsody_id: "RH-10004", created_at: "2024-01-20", avatar: "LS", handicap_index: 24.1, handicap_updated: "2026-05-30" },
  { id: "u-1005", name: "Kenji Tanaka", phone: "+62 819 1234 5678", email: "kenji.t@example.com", rhapsody_id: "RH-10005", created_at: "2024-03-10", avatar: "KT", handicap_index: 2.8, handicap_updated: "2026-06-20" },
  { id: "u-1006", name: "Putri Anggraini", phone: "+62 821 3456 7890", email: "putri.a@example.com", rhapsody_id: "RH-10006", created_at: "2024-05-22", avatar: "PA", handicap_index: 30.5, handicap_updated: "2026-05-14" },
  { id: "u-1007", name: "Robert Lim", phone: "+62 822 5678 9012", email: "robert.l@example.com", rhapsody_id: "RH-10007", created_at: "2024-06-30", avatar: "RL", handicap_index: -1.2, handicap_updated: "2026-06-22" },
  { id: "u-1008", name: "Amelia Setiawan", phone: "+62 823 6789 0123", email: "amelia.s@example.com", rhapsody_id: "RH-10008", created_at: "2024-09-05", avatar: "AS", handicap_index: 15.9, handicap_updated: "2026-06-05" },
];

/** Format handicap index WHS-style: "+2.1" for plus handicaps, "12.4" otherwise. */
export function formatHandicap(h: number): string {
  if (h < 0) return `+${Math.abs(h).toFixed(1)}`;
  return h.toFixed(1);
}

/** Category label for a handicap index. */
export function handicapCategory(h: number): "Plus" | "Scratch" | "Low" | "Mid" | "High" {
  if (h < 0) return "Plus";
  if (h <= 4.9) return "Scratch";
  if (h <= 12.9) return "Low";
  if (h <= 20.9) return "Mid";
  return "High";
}

export interface ClubMemberProfile {
  id: string;
  club_id: string;
  user_id: string;
  club_member_id: string;
  membership_status: "Paid Member" | "Visitor" | "Tournament Participant" | "Inactive";
  membership_type: "Gold" | "Silver" | "Platinum" | "—";
  start_date: string;
  expiry_date: string;
}

export const clubMembers: ClubMemberProfile[] = [
  // Michael
  { id: "m-1", club_id: "emerald", user_id: "u-1001", club_member_id: "EH-7781", membership_status: "Paid Member", membership_type: "Gold", start_date: "2023-05-01", expiry_date: "2026-05-01" },
  { id: "m-2", club_id: "royal-jakarta", user_id: "u-1001", club_member_id: "—", membership_status: "Visitor", membership_type: "—", start_date: "2024-02-10", expiry_date: "—" },
  { id: "m-3", club_id: "bali-national", user_id: "u-1001", club_member_id: "BN-T-221", membership_status: "Tournament Participant", membership_type: "—", start_date: "2024-09-12", expiry_date: "—" },
  // Sarah
  { id: "m-4", club_id: "emerald", user_id: "u-1002", club_member_id: "EH-7820", membership_status: "Paid Member", membership_type: "Platinum", start_date: "2022-01-15", expiry_date: "2027-01-15" },
  { id: "m-5", club_id: "bali-national", user_id: "u-1002", club_member_id: "BN-9912", membership_status: "Paid Member", membership_type: "Gold", start_date: "2023-03-20", expiry_date: "2026-03-20" },
  // David
  { id: "m-6", club_id: "emerald", user_id: "u-1003", club_member_id: "—", membership_status: "Visitor", membership_type: "—", start_date: "2024-04-01", expiry_date: "—" },
  { id: "m-7", club_id: "royal-jakarta", user_id: "u-1003", club_member_id: "RJ-3340", membership_status: "Paid Member", membership_type: "Silver", start_date: "2023-09-01", expiry_date: "2026-09-01" },
  // Linda
  { id: "m-8", club_id: "emerald", user_id: "u-1004", club_member_id: "EH-7901", membership_status: "Paid Member", membership_type: "Silver", start_date: "2024-02-01", expiry_date: "2026-02-01" },
  { id: "m-9", club_id: "surabaya-links", user_id: "u-1004", club_member_id: "SL-1188", membership_status: "Paid Member", membership_type: "Gold", start_date: "2023-07-12", expiry_date: "2026-07-12" },
  // Kenji
  { id: "m-10", club_id: "bali-national", user_id: "u-1005", club_member_id: "BN-9988", membership_status: "Paid Member", membership_type: "Platinum", start_date: "2024-03-10", expiry_date: "2027-03-10" },
  { id: "m-11", club_id: "emerald", user_id: "u-1005", club_member_id: "—", membership_status: "Visitor", membership_type: "—", start_date: "2024-08-01", expiry_date: "—" },
  // Putri
  { id: "m-12", club_id: "emerald", user_id: "u-1006", club_member_id: "EH-8011", membership_status: "Inactive", membership_type: "Silver", start_date: "2022-06-01", expiry_date: "2024-06-01" },
  // Robert
  { id: "m-13", club_id: "royal-jakarta", user_id: "u-1007", club_member_id: "RJ-3401", membership_status: "Paid Member", membership_type: "Gold", start_date: "2024-06-30", expiry_date: "2026-06-30" },
  { id: "m-14", club_id: "emerald", user_id: "u-1007", club_member_id: "—", membership_status: "Visitor", membership_type: "—", start_date: "2024-10-15", expiry_date: "—" },
  // Amelia
  { id: "m-15", club_id: "emerald", user_id: "u-1008", club_member_id: "EH-8120", membership_status: "Paid Member", membership_type: "Gold", start_date: "2024-09-05", expiry_date: "2026-09-05" },
];

export interface Booking {
  id: string;
  club_id: string;
  user_id: string;
  tee_time: string; // ISO
  players: number;
  status: "Confirmed" | "Checked-in" | "Completed" | "Cancelled" | "No-Show";
  subtotal: number;       // total sebelum diskon voucher
  discount_amount: number; // potongan voucher dalam IDR (0 jika tidak pakai voucher)
  voucher_id?: string;    // FK ke vouchers
  amount: number;         // total akhir = subtotal - discount_amount
  payment_status: "Pending" | "Paid" | "Failed" | "Refunded";
  partners?: string[];
  game_type?: "Casual" | "Tournament" | "Practice";
  tournament_id?: string;
}

export const bookings: Booking[] = [
  { id: "b-0a", club_id: "emerald", user_id: "u-1001", tee_time: "2026-08-15T07:00", players: 2, status: "Confirmed", subtotal: 2500000, discount_amount: 0, amount: 2500000, payment_status: "Paid", partners: ["Andre Wijaya"], game_type: "Casual" },
  { id: "b-0b", club_id: "royal-jakarta", user_id: "u-1001", tee_time: "2026-08-10T08:30", players: 3, status: "Confirmed", subtotal: 4350000, discount_amount: 0, amount: 4350000, payment_status: "Paid", partners: ["Sinta Dewi", "Reza Halim"], game_type: "Casual" },
  { id: "b-1", club_id: "emerald", user_id: "u-1001", tee_time: "2026-05-23T07:00", players: 2, status: "Confirmed", subtotal: 2500000, discount_amount: 0, amount: 2500000, payment_status: "Paid", partners: ["Andre Wijaya"], game_type: "Casual" },
  { id: "b-2", club_id: "emerald", user_id: "u-1001", tee_time: "2026-04-12T06:30", players: 4, status: "Completed", subtotal: 5000000, discount_amount: 0, amount: 5000000, payment_status: "Paid", partners: ["Andre Wijaya", "Putri Maharani", "Reza Halim"], game_type: "Casual" },
  // b-3 menggunakan vc-3 (RJ-WELCOME: Rp 200,000 off Green Fee) — sudah Redeemed
  { id: "b-3", club_id: "royal-jakarta", user_id: "u-1001", tee_time: "2026-03-08T08:00", players: 2, status: "Completed", subtotal: 3800000, discount_amount: 200000, voucher_id: "vc-3", amount: 3600000, payment_status: "Paid", partners: ["Sinta Dewi"], game_type: "Casual" },
  { id: "b-4", club_id: "bali-national", user_id: "u-1001", tee_time: "2026-02-15T07:30", players: 1, status: "Completed", subtotal: 2400000, discount_amount: 0, amount: 2400000, payment_status: "Paid", game_type: "Tournament", tournament_id: "t-3" },
  { id: "b-4b", club_id: "emerald", user_id: "u-1001", tee_time: "2026-01-22T07:00", players: 3, status: "Completed", subtotal: 3750000, discount_amount: 0, amount: 3750000, payment_status: "Paid", partners: ["Andre Wijaya", "Reza Halim"], game_type: "Casual" },
  { id: "b-5", club_id: "emerald", user_id: "u-1002", tee_time: "2026-05-21T07:00", players: 2, status: "Checked-in", subtotal: 2500000, discount_amount: 0, amount: 2500000, payment_status: "Paid" },
  { id: "b-6", club_id: "emerald", user_id: "u-1003", tee_time: "2026-05-20T08:30", players: 1, status: "Completed", subtotal: 1500000, discount_amount: 0, amount: 1500000, payment_status: "Paid" },
  // b-7 menggunakan vc-6 (EH-PROSHOP: 15% off Pro Shop → tapi ini Green Fee booking, pakai vc-6 sbg contoh Redeemed)
  { id: "b-7", club_id: "emerald", user_id: "u-1004", tee_time: "2026-05-22T06:00", players: 4, status: "Confirmed", subtotal: 5000000, discount_amount: 0, amount: 5000000, payment_status: "Paid" },
  { id: "b-8", club_id: "emerald", user_id: "u-1005", tee_time: "2026-05-19T07:30", players: 2, status: "Completed", subtotal: 2900000, discount_amount: 0, amount: 2900000, payment_status: "Paid" },
  { id: "b-9", club_id: "emerald", user_id: "u-1007", tee_time: "2026-05-18T08:00", players: 1, status: "No-Show", subtotal: 1500000, discount_amount: 0, amount: 1500000, payment_status: "Paid" },
  { id: "b-10", club_id: "emerald", user_id: "u-1008", tee_time: "2026-05-21T09:00", players: 3, status: "Confirmed", subtotal: 3750000, discount_amount: 0, amount: 3750000, payment_status: "Paid" },
  { id: "b-11", club_id: "royal-jakarta", user_id: "u-1003", tee_time: "2026-05-22T07:00", players: 2, status: "Confirmed", subtotal: 3600000, discount_amount: 0, amount: 3600000, payment_status: "Paid" },
  { id: "b-12", club_id: "bali-national", user_id: "u-1002", tee_time: "2026-05-25T06:30", players: 2, status: "Confirmed", subtotal: 4800000, discount_amount: 0, amount: 4800000, payment_status: "Pending" },
  { id: "b-13", club_id: "surabaya-links", user_id: "u-1004", tee_time: "2026-05-20T07:00", players: 2, status: "Completed", subtotal: 1900000, discount_amount: 0, amount: 1900000, payment_status: "Paid" },
];

export interface Visit {
  id: string;
  club_id: string;
  user_id: string;
  booking_id: string;
  check_in_time: string;
  status: "Checked-in" | "Completed" | "No-Show";
}

export const visits: Visit[] = bookings
  .filter((b) => b.status === "Completed" || b.status === "Checked-in" || b.status === "No-Show")
  .map((b, i) => ({
    id: `v-${i + 1}`,
    club_id: b.club_id,
    user_id: b.user_id,
    booking_id: b.id,
    check_in_time: b.tee_time,
    status: b.status === "Completed" ? "Completed" : b.status === "Checked-in" ? "Checked-in" : "No-Show",
  }));

export interface PaymentTransaction {
  id: string;
  club_id: string;
  user_id: string;
  amount: number;
  payment_method_type: "Credit Card" | "QRIS" | "E-Wallet" | "Voucher" | "Loyalty Points" | "Member Account";
  transaction_status: "Pending" | "Paid" | "Failed" | "Refunded";
  reference_number: string;
  settlement_status: "Settled" | "Pending Settlement" | "Failed";
  created_at: string;
  category: "Green Fee" | "Cart" | "Caddie" | "F&B" | "Pro Shop" | "Tournament";
}

export const payments: PaymentTransaction[] = [
  { id: "p-1", club_id: "emerald", user_id: "u-1001", amount: 2500000, payment_method_type: "Credit Card", transaction_status: "Paid", reference_number: "TXN-2026-00045", settlement_status: "Settled", created_at: "2026-05-12", category: "Green Fee" },
  { id: "p-2", club_id: "emerald", user_id: "u-1001", amount: 480000, payment_method_type: "QRIS", transaction_status: "Paid", reference_number: "TXN-2026-00046", settlement_status: "Settled", created_at: "2026-05-12", category: "F&B" },
  { id: "p-3", club_id: "royal-jakarta", user_id: "u-1001", amount: 3600000, payment_method_type: "Credit Card", transaction_status: "Paid", reference_number: "TXN-2026-00031", settlement_status: "Settled", created_at: "2026-03-08", category: "Green Fee" },
  { id: "p-4", club_id: "bali-national", user_id: "u-1001", amount: 2400000, payment_method_type: "E-Wallet", transaction_status: "Paid", reference_number: "TXN-2026-00021", settlement_status: "Settled", created_at: "2026-02-15", category: "Tournament" },
  { id: "p-5", club_id: "emerald", user_id: "u-1002", amount: 2500000, payment_method_type: "Member Account", transaction_status: "Paid", reference_number: "TXN-2026-00050", settlement_status: "Settled", created_at: "2026-05-21", category: "Green Fee" },
  { id: "p-6", club_id: "emerald", user_id: "u-1004", amount: 850000, payment_method_type: "Voucher", transaction_status: "Paid", reference_number: "TXN-2026-00052", settlement_status: "Settled", created_at: "2026-05-22", category: "Pro Shop" },
  { id: "p-7", club_id: "emerald", user_id: "u-1005", amount: 320000, payment_method_type: "Loyalty Points", transaction_status: "Paid", reference_number: "TXN-2026-00048", settlement_status: "Settled", created_at: "2026-05-19", category: "Cart" },
  { id: "p-8", club_id: "bali-national", user_id: "u-1002", amount: 4800000, payment_method_type: "Credit Card", transaction_status: "Pending", reference_number: "TXN-2026-00060", settlement_status: "Pending Settlement", created_at: "2026-05-23", category: "Green Fee" },
];

export interface LoyaltyEntry {
  id: string;
  club_id: string; // "network" for cross-club
  user_id: string;
  points: number; // signed
  transaction_type: "Earn" | "Redeem" | "Bonus" | "Adjust";
  description: string;
  created_at: string;
}

export const loyaltyLedger: LoyaltyEntry[] = [
  { id: "l-1", club_id: "emerald", user_id: "u-1001", points: 2500, transaction_type: "Earn", description: "Green fee spending", created_at: "2026-04-12" },
  { id: "l-2", club_id: "emerald", user_id: "u-1001", points: 1000, transaction_type: "Bonus", description: "Gold tier bonus", created_at: "2026-04-12" },
  { id: "l-3", club_id: "emerald", user_id: "u-1001", points: 1500, transaction_type: "Earn", description: "F&B + Pro Shop", created_at: "2026-05-12" },
  { id: "l-4", club_id: "royal-jakarta", user_id: "u-1001", points: 1200, transaction_type: "Earn", description: "Visitor round", created_at: "2026-03-08" },
  { id: "l-5", club_id: "network", user_id: "u-1001", points: 800, transaction_type: "Bonus", description: "Rhapsody network welcome bonus", created_at: "2024-01-01" },
  { id: "l-6", club_id: "emerald", user_id: "u-1002", points: 8500, transaction_type: "Earn", description: "Platinum activity", created_at: "2026-05-21" },
  { id: "l-7", club_id: "emerald", user_id: "u-1004", points: -500, transaction_type: "Redeem", description: "Cart upgrade voucher", created_at: "2026-05-22" },
];

export interface Voucher {
  id: string;
  club_id: string;
  user_id: string | null;      // null = publik (is_public = true)
  voucher_code: string;
  title: string;
  description?: string;
  discount_type: "Percentage" | "FixedAmount";
  discount_value: number;      // Percentage: 1–100; FixedAmount: IDR integer
  max_discount_cap?: number;   // IDR, batas max potongan (untuk Percentage saja)
  type: "Green Fee" | "F&B" | "Cart" | "Pro Shop";
  status: "Active" | "Redeemed" | "Expired" | "Cancelled";
  quota: number;
  used_count: number;
  starts_at: string;           // ISO date
  expiry_date: string;         // ISO date
  min_booking_amount?: number; // IDR
  is_public: boolean;
}

export const vouchers: Voucher[] = [
  { id: "vc-1", club_id: "emerald", user_id: "u-1001", voucher_code: "EH-GOLD-25", title: "25% Off Weekday Green Fee", discount_type: "Percentage", discount_value: 25, max_discount_cap: 300000, type: "Green Fee", status: "Active", quota: 1, used_count: 0, starts_at: "2026-05-01", expiry_date: "2026-08-31", is_public: false },
  { id: "vc-2", club_id: "emerald", user_id: "u-1001", voucher_code: "EH-FB-150", title: "Rp 150,000 F&B Credit", discount_type: "FixedAmount", discount_value: 150000, type: "F&B", status: "Active", quota: 1, used_count: 0, starts_at: "2026-06-01", expiry_date: "2026-09-15", is_public: false },
  { id: "vc-3", club_id: "royal-jakarta", user_id: "u-1001", voucher_code: "RJ-WELCOME", title: "Visitor Welcome Voucher", discount_type: "FixedAmount", discount_value: 200000, type: "Green Fee", status: "Redeemed", quota: 1, used_count: 1, starts_at: "2026-01-01", expiry_date: "2026-03-31", is_public: false },
  { id: "vc-4", club_id: "bali-national", user_id: "u-1001", voucher_code: "BN-TOURNEY", title: "Tournament Pavilion Lunch", description: "Free F&B untuk peserta turnamen", discount_type: "FixedAmount", discount_value: 250000, type: "F&B", status: "Expired", quota: 1, used_count: 0, starts_at: "2026-01-01", expiry_date: "2026-02-28", is_public: false },
  { id: "vc-5", club_id: "emerald", user_id: null, voucher_code: "EH-BDAY-2026", title: "Birthday Month Free Cart", description: "Gratis cart service di bulan ulang tahun", discount_type: "FixedAmount", discount_value: 320000, type: "Cart", status: "Active", quota: 50, used_count: 12, starts_at: "2026-01-01", expiry_date: "2026-12-31", is_public: true },
  { id: "vc-6", club_id: "emerald", user_id: "u-1004", voucher_code: "EH-PROSHOP", title: "Pro Shop 15% Off", discount_type: "Percentage", discount_value: 15, max_discount_cap: 200000, type: "Pro Shop", status: "Redeemed", quota: 1, used_count: 1, starts_at: "2026-04-01", expiry_date: "2026-06-30", is_public: false },
];

export interface VoucherRedemption {
  id: string;
  voucher_id: string;
  user_id: string;
  booking_id: string;
  redeemed_at: string; // ISO datetime
}

export const voucherRedemptions: VoucherRedemption[] = [
  { id: "vr-1", voucher_id: "vc-3", user_id: "u-1001", booking_id: "b-3", redeemed_at: "2026-03-08T08:00:00" },
];

export interface PromotionCampaign {
  id: string;
  club_id: string;
  title: string;
  target_segment: string;
  campaign_type: "Voucher" | "Discount" | "Bonus Points" | "Tournament Invitation" | "F&B Promo";
  status: "Draft" | "Active" | "Ended";
  redemption_count: number;
  reach: number;
  starts: string;
  ends: string;
}

export const campaigns: PromotionCampaign[] = [
  { id: "c-1", club_id: "emerald", title: "May Weekday Booster", target_segment: "Weekday players", campaign_type: "Bonus Points", status: "Active", redemption_count: 142, reach: 480, starts: "2026-05-01", ends: "2026-05-31" },
  { id: "c-2", club_id: "emerald", title: "Birthday Month Surprise", target_segment: "Birthday month members", campaign_type: "Voucher", status: "Active", redemption_count: 38, reach: 56, starts: "2026-05-01", ends: "2026-05-31" },
  { id: "c-3", club_id: "emerald", title: "Win-Back Inactive 90d", target_segment: "Inactive members", campaign_type: "Discount", status: "Active", redemption_count: 22, reach: 210, starts: "2026-04-15", ends: "2026-06-15" },
  { id: "c-4", club_id: "royal-jakarta", title: "Corporate Twilight", target_segment: "High spenders", campaign_type: "F&B Promo", status: "Active", redemption_count: 91, reach: 320, starts: "2026-05-01", ends: "2026-06-30" },
  { id: "c-5", club_id: "bali-national", title: "Invitational Cup 2026", target_segment: "Tournament players", campaign_type: "Tournament Invitation", status: "Active", redemption_count: 64, reach: 200, starts: "2026-05-10", ends: "2026-07-01" },
  { id: "c-6", club_id: "emerald", title: "Visitor → Member Convert", target_segment: "Visitors who played in last 90 days", campaign_type: "Discount", status: "Ended", redemption_count: 17, reach: 134, starts: "2026-02-01", ends: "2026-04-30" },
];

export interface Scorecard {
  id: string;
  club_id: string;
  user_id: string;
  date: string;
  score: number;
  course_name: string;
  strokes: number[];
  pars: number[];
}

// Standard par layout: front 9 = 36, back 9 = 36, total = 72
export const COURSE_PARS: number[] = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5];

// Stroke index per hole (difficulty ranking, 1 = hardest)
export const COURSE_SI: number[] = [5, 13, 17, 1, 9, 11, 15, 7, 3, 6, 14, 16, 2, 10, 8, 18, 12, 4];

export const scorecards: Scorecard[] = [
  {
    id: "s-1", club_id: "emerald", user_id: "u-1001", date: "2026-04-12", score: 78,
    course_name: "Emerald Hills Championship",
    // eagle H4, birdie H9, bogey H1, double H7
    strokes: [5, 4, 3, 3, 4, 5, 5, 4, 4, 4, 4, 4, 6, 4, 5, 3, 5, 6], pars: COURSE_PARS,
  },
  {
    id: "s-2", club_id: "royal-jakarta", user_id: "u-1001", date: "2026-03-08", score: 76,
    course_name: "Royal Jakarta South",
    // eagle H13, birdie H1, bogey H2, double H16
    strokes: [3, 5, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 3, 5, 5, 5, 5, 6], pars: COURSE_PARS,
  },
  {
    id: "s-3", club_id: "bali-national", user_id: "u-1001", date: "2026-02-15", score: 79,
    course_name: "Bali National Ocean",
    // eagle H9, birdie H11, bogey H5, double H3
    strokes: [4, 4, 5, 5, 5, 4, 3, 4, 3, 5, 2, 5, 6, 5, 5, 3, 5, 6], pars: COURSE_PARS,
  },
  {
    id: "s-4", club_id: "emerald", user_id: "u-1001", date: "2026-01-22", score: 78,
    course_name: "Emerald Hills Championship",
    // eagle H18, birdie H8, bogey H10, double H12
    strokes: [4, 4, 3, 5, 5, 4, 3, 3, 6, 5, 3, 6, 5, 5, 5, 4, 5, 3], pars: COURSE_PARS,
  },
];

export interface Tournament {
  id: string;
  club_id: string;
  title: string;
  date: string;
  status: "Open" | "Registration Closed" | "Finished";
  participants: number;
  max_participants: number;
  fee: number;
  format: string;
  description: string;
  registration_deadline: string;
  shotgun_time: string;
  prize_pool: string;
  prize_slots?: { pos: string; prize: string }[];
  rules: string[];
  schedule: { time: string; label: string }[];
  includes: string[];
  contact: string;
  handicap_basis?: string;
  tie_break?: string;
  team_size?: number;   // 1 = individual, 2+ = team
}

export const tournaments: Tournament[] = [
  {
    id: "t-1",
    club_id: "bali-national",
    title: "Bali National Invitational 2026",
    date: "2026-09-12",
    status: "Open",
    participants: 48,
    max_participants: 64,
    fee: 4500000,
    format: "Stroke Play",
    handicap_basis: "Course handicap (USGA)",
    tie_break: "Count-back — last 9 holes",
    description: "A two-day invitational on the championship course at Nusa Dua. Open to all Rhapsody network members with a valid handicap.",
    registration_deadline: "2026-09-05",
    shotgun_time: "07:00 (shotgun start)",
    prize_pool: "Rp 75,000,000 in prizes + trophy",
    prize_slots: [
      { pos: "1st", prize: "Rp 30,000,000 + trophy" },
      { pos: "2nd", prize: "Rp 20,000,000" },
      { pos: "3rd", prize: "Rp 10,000,000" },
      { pos: "Nearest the pin", prize: "Rp 5,000,000" },
    ],
    rules: ["Handicap index 24.0 or better", "USGA rules apply", "Soft spikes only", "Mandatory caddie"],
    schedule: [
      { time: "06:00", label: "Registration & breakfast" },
      { time: "07:00", label: "Shotgun start — Round 1" },
      { time: "13:00", label: "Lunch at pavilion" },
      { time: "19:00", label: "Welcome dinner" },
    ],
    includes: ["Green fee (2 rounds)", "Caddie & cart", "Tournament gift pack", "Lunch & gala dinner"],
    contact: "events@balinational.example",
    team_size: 1,
  },
  {
    id: "t-2",
    club_id: "emerald",
    title: "Emerald Hills Member Cup",
    date: "2026-08-30",
    status: "Open",
    participants: 72,
    max_participants: 96,
    fee: 2200000,
    format: "Stableford",
    handicap_basis: "Playing handicap · 3 flights (A ≤12, B 13–20, C 21–28)",
    tie_break: "Stableford count-back — last 6 holes",
    description: "The signature monthly Member Cup at Emerald Hills. Stableford scoring with flighted divisions.",
    registration_deadline: "2026-08-25",
    shotgun_time: "06:30 (shotgun start)",
    prize_pool: "Rp 30,000,000 in vouchers",
    prize_slots: [
      { pos: "Flight A — 1st", prize: "Rp 7,000,000 voucher" },
      { pos: "Flight B — 1st", prize: "Rp 5,000,000 voucher" },
      { pos: "Flight C — 1st", prize: "Rp 3,000,000 voucher" },
    ],
    rules: ["Members only", "Max handicap 28", "Three flights: A / B / C"],
    schedule: [
      { time: "05:30", label: "Check-in & breakfast" },
      { time: "06:30", label: "Shotgun start" },
      { time: "12:30", label: "Lunch & prize-giving" },
    ],
    includes: ["Green fee", "Caddie & cart", "Breakfast & lunch", "Goodie bag"],
    contact: "tournaments@emeraldhills.example",
    team_size: 1,
  },
  {
    id: "t-3",
    club_id: "royal-jakarta",
    title: "Royal Jakarta Twilight Cup",
    date: "2026-09-05",
    status: "Open",
    participants: 32,
    max_participants: 48,
    fee: 1800000,
    format: "Best Ball",
    handicap_basis: "Combined team handicap",
    tie_break: "Best ball count-back — last 9",
    description: "After-hours floodlit best-ball event. Pair up with a partner for nine holes under the lights.",
    registration_deadline: "2026-09-01",
    shotgun_time: "17:00 (shotgun start)",
    prize_pool: "Rp 20,000,000 + dining vouchers",
    prize_slots: [
      { pos: "1st Team", prize: "Rp 10,000,000" },
      { pos: "2nd Team", prize: "Rp 5,000,000" },
    ],
    rules: ["Teams of 2", "9 holes floodlit", "Combined handicap < 40"],
    schedule: [
      { time: "16:00", label: "Check-in" },
      { time: "17:00", label: "Shotgun start" },
      { time: "20:00", label: "Dinner & awards" },
    ],
    includes: ["Green fee", "Cart", "Dinner buffet"],
    contact: "events@royaljakarta.example",
    team_size: 2,
  },
  {
    id: "t-4",
    club_id: "bali-national",
    title: "Nusa Dua Open",
    date: "2026-05-22",
    status: "Finished",
    participants: 72,
    max_participants: 72,
    fee: 3500000,
    format: "Stroke Play",
    handicap_basis: "Gross scoring",
    tie_break: "Count-back — last 18",
    description: "The annual Nusa Dua Open — concluded. Results archived.",
    registration_deadline: "2026-05-15",
    shotgun_time: "06:30 (shotgun start)",
    prize_pool: "Rp 50,000,000 + trophy",
    prize_slots: [
      { pos: "1st", prize: "Rp 25,000,000 + trophy" },
      { pos: "2nd", prize: "Rp 15,000,000" },
      { pos: "3rd", prize: "Rp 10,000,000" },
    ],
    rules: ["Open invitational", "Handicap < 18", "Live leaderboard"],
    schedule: [
      { time: "05:30", label: "Check-in" },
      { time: "06:30", label: "Shotgun start" },
      { time: "13:00", label: "Lunch & prize-giving" },
    ],
    includes: ["Green fee", "Caddie & cart", "Lunch"],
    contact: "events@balinational.example",
    team_size: 1,
  },
  {
    id: "t-5",
    club_id: "emerald",
    title: "Emerald Hills System 36 Open",
    date: "2026-10-18",
    status: "Open",
    participants: 18,
    max_participants: 72,
    fee: 1500000,
    format: "System 36",
    handicap_basis: "System 36 — automatic handicap adjustment per hole",
    tie_break: "Count-back — last 9 holes (System 36 points)",
    description: "Open to all handicap levels. System 36 scoring adjusts for difficulty automatically — great for high-handicappers and beginners.",
    registration_deadline: "2026-10-14",
    shotgun_time: "07:00 (shotgun start)",
    prize_pool: "Rp 15,000,000 in prizes",
    prize_slots: [
      { pos: "1st", prize: "Rp 7,000,000" },
      { pos: "2nd", prize: "Rp 4,000,000" },
      { pos: "3rd", prize: "Rp 2,000,000" },
      { pos: "Longest drive", prize: "Rp 1,000,000" },
    ],
    rules: ["Open to all handicaps", "USGA System 36 scoring", "Soft spikes only"],
    schedule: [
      { time: "06:30", label: "Check-in & breakfast" },
      { time: "07:00", label: "Shotgun start" },
      { time: "12:30", label: "Lunch & prize-giving" },
    ],
    includes: ["Green fee", "Cart", "Breakfast & lunch", "Goodie bag"],
    contact: "tournaments@emeraldhills.example",
    team_size: 1,
  },
];

export type TournamentRegStatus = "Registered" | "Waitlist" | "Confirmed" | "Checked-in" | "Completed" | "Cancelled";

export interface TournamentRegistration {
  id: string;
  tournament_id: string;
  user_id: string;
  status: TournamentRegStatus;
  registered_at: string;
  flight?: string;
  tee_time?: string;
  position?: number;
  score?: number;
  payment_status: "Pending" | "Paid" | "Refunded";
}

export const tournamentRegistrations: TournamentRegistration[] = [
  { id: "tr-1", tournament_id: "t-2", user_id: "u-1001", status: "Confirmed", registered_at: "2026-05-10", flight: "A", tee_time: "06:30", payment_status: "Paid" },
  { id: "tr-2", tournament_id: "t-4", user_id: "u-1001", status: "Checked-in", registered_at: "2026-05-12", flight: "Open", tee_time: "06:30", position: 3, score: 71, payment_status: "Paid" },
  { id: "tr-3", tournament_id: "t-3", user_id: "u-1001", status: "Completed", registered_at: "2026-04-20", flight: "—", tee_time: "17:00", position: 7, score: 68, payment_status: "Paid" },
];

export const getTournament = (id: string) => tournaments.find((t) => t.id === id);
export const getRegistrationFor = (userId: string, tournamentId: string) =>
  tournamentRegistrations.find((r) => r.user_id === userId && r.tournament_id === tournamentId);

export interface LeaderboardEntry {
  id: string;
  tournament_id: string;
  player_name: string;
  rhapsody_id: string;
  flight: string;
  handicap: number;
  gross: number;       // total strokes (0 = DNF / not yet finished)
  net: number;         // gross - handicap strokes
  points?: number;     // Stableford / System 36
  thru: number;        // holes completed (0–18)
  status: "Playing" | "Finished" | "DNF" | "WD";
  verified: boolean;   // all holes marker-verified
  tee_time: string;
}

// Mock leaderboard for t-4 (Nusa Dua Open · Stroke Play · Finished)
export const leaderboard: LeaderboardEntry[] = [
  { id: "lb-1",  tournament_id: "t-4", player_name: "Kenji Tanaka",     rhapsody_id: "RH-10005", flight: "Open", handicap: 3,  gross: 68, net: 65, thru: 18, status: "Finished", verified: true,  tee_time: "06:30" },
  { id: "lb-2",  tournament_id: "t-4", player_name: "David Hartono",    rhapsody_id: "RH-10003", flight: "Open", handicap: 6,  gross: 70, net: 64, thru: 18, status: "Finished", verified: true,  tee_time: "06:30" },
  { id: "lb-3",  tournament_id: "t-4", player_name: "Arief Nugroho",    rhapsody_id: "RH-10008", flight: "Open", handicap: 8,  gross: 71, net: 63, thru: 18, status: "Finished", verified: true,  tee_time: "06:42" },
  { id: "lb-4",  tournament_id: "t-4", player_name: "Budi Santoso",     rhapsody_id: "RH-10009", flight: "Open", handicap: 10, gross: 73, net: 63, thru: 18, status: "Finished", verified: true,  tee_time: "06:42" },
  { id: "lb-5",  tournament_id: "t-4", player_name: "Delia Metaputri",  rhapsody_id: "RH-10001", flight: "Open", handicap: 12, gross: 71, net: 59, thru: 18, status: "Finished", verified: true,  tee_time: "06:54" },
  { id: "lb-6",  tournament_id: "t-4", player_name: "Sarah Wijaya",     rhapsody_id: "RH-10002", flight: "Open", handicap: 19, gross: 76, net: 57, thru: 18, status: "Finished", verified: true,  tee_time: "06:54" },
  { id: "lb-7",  tournament_id: "t-4", player_name: "Linda Suryadi",    rhapsody_id: "RH-10004", flight: "Open", handicap: 24, gross: 82, net: 58, thru: 18, status: "Finished", verified: false, tee_time: "07:06" },
  { id: "lb-8",  tournament_id: "t-4", player_name: "Putri Anggraini",  rhapsody_id: "RH-10006", flight: "Open", handicap: 30, gross: 88, net: 58, thru: 18, status: "Finished", verified: false, tee_time: "07:06" },
  { id: "lb-9",  tournament_id: "t-4", player_name: "Hendra Kusuma",    rhapsody_id: "RH-10010", flight: "Open", handicap: 5,  gross: 69, net: 64, thru: 18, status: "Finished", verified: true,  tee_time: "07:18" },
  { id: "lb-10", tournament_id: "t-4", player_name: "Rizal Firmansyah", rhapsody_id: "RH-10011", flight: "Open", handicap: 15, gross: 74, net: 59, thru: 18, status: "Finished", verified: true,  tee_time: "07:18" },
  // t-2 Stableford (in progress — simulates a live tournament)
  { id: "lb-11", tournament_id: "t-2", player_name: "Delia Metaputri",  rhapsody_id: "RH-10001", flight: "A", handicap: 12, gross: 0,  net: 0,  points: 24, thru: 14, status: "Playing",  verified: false, tee_time: "06:30" },
  { id: "lb-12", tournament_id: "t-2", player_name: "Kenji Tanaka",     rhapsody_id: "RH-10005", flight: "A", handicap: 3,  gross: 0,  net: 0,  points: 22, thru: 16, status: "Playing",  verified: false, tee_time: "06:30" },
  { id: "lb-13", tournament_id: "t-2", player_name: "David Hartono",    rhapsody_id: "RH-10003", flight: "A", handicap: 6,  gross: 0,  net: 0,  points: 30, thru: 18, status: "Finished", verified: true,  tee_time: "06:42" },
  { id: "lb-14", tournament_id: "t-2", player_name: "Sarah Wijaya",     rhapsody_id: "RH-10002", flight: "B", handicap: 19, gross: 0,  net: 0,  points: 28, thru: 18, status: "Finished", verified: true,  tee_time: "06:42" },
  { id: "lb-15", tournament_id: "t-2", player_name: "Linda Suryadi",    rhapsody_id: "RH-10004", flight: "B", handicap: 24, gross: 0,  net: 0,  points: 19, thru: 12, status: "Playing",  verified: false, tee_time: "06:54" },
  { id: "lb-16", tournament_id: "t-2", player_name: "Putri Anggraini",  rhapsody_id: "RH-10006", flight: "C", handicap: 30, gross: 0,  net: 0,  points: 25, thru: 18, status: "Finished", verified: false, tee_time: "07:06" },
  { id: "lb-17", tournament_id: "t-2", player_name: "Hendra Kusuma",    rhapsody_id: "RH-10010", flight: "A", handicap: 5,  gross: 0,  net: 0,  points: 21, thru: 15, status: "Playing",  verified: false, tee_time: "07:06" },
  { id: "lb-18", tournament_id: "t-2", player_name: "Rizal Firmansyah", rhapsody_id: "RH-10011", flight: "B", handicap: 15, gross: 0,  net: 0,  points: 26, thru: 18, status: "Finished", verified: true,  tee_time: "07:18" },
];

export const getLeaderboard = (tournamentId: string) =>
  leaderboard.filter((e) => e.tournament_id === tournamentId);

export interface AuditLog {
  id: string;
  actor_user_id: string;
  actor_name: string;
  role: Role;
  action: string;
  club_id: string | "network";
  timestamp: string;
  ip: string;
}

export const auditLogs: AuditLog[] = [
  { id: "a-1", actor_user_id: "admin-eh-1", actor_name: "Emerald Admin", role: "club_admin", action: "Viewed member profile EH-7781", club_id: "emerald", timestamp: "2026-05-23T09:14", ip: "10.0.x.x" },
  { id: "a-2", actor_user_id: "admin-eh-1", actor_name: "Emerald Admin", role: "club_admin", action: "Issued voucher EH-GOLD-25", club_id: "emerald", timestamp: "2026-05-22T16:02", ip: "10.0.x.x" },
  { id: "a-3", actor_user_id: "admin-eh-1", actor_name: "Emerald Admin", role: "club_admin", action: "Created campaign 'May Weekday Booster'", club_id: "emerald", timestamp: "2026-05-01T08:30", ip: "10.0.x.x" },
  { id: "a-4", actor_user_id: "super-1", actor_name: "Realta Superadmin", role: "superadmin", action: "Updated club branding for Bali National", club_id: "bali-national", timestamp: "2026-05-20T11:45", ip: "10.0.x.x" },
  { id: "a-5", actor_user_id: "super-1", actor_name: "Realta Superadmin", role: "superadmin", action: "Reviewed integration sync (Royal Jakarta)", club_id: "royal-jakarta", timestamp: "2026-05-19T13:20", ip: "10.0.x.x" },
  { id: "a-6", actor_user_id: "admin-rj-1", actor_name: "Royal Jakarta Admin", role: "club_admin", action: "Changed loyalty rule: 1pt / Rp 10,000", club_id: "royal-jakarta", timestamp: "2026-05-18T10:05", ip: "10.0.x.x" },
];

export interface IntegrationStatus {
  club_id: string;
  membership_sync: { status: "Online" | "Warning" | "Offline"; last_sync: string };
  teesheet_sync: { status: "Online" | "Warning" | "Offline"; last_sync: string };
  pos_sync: { status: "Online" | "Warning" | "Offline"; last_sync: string };
  payment_sync: { status: "Online" | "Warning" | "Offline"; last_sync: string };
  loyalty_sync: { status: "Online" | "Warning" | "Offline"; last_sync: string };
}

export const integrations: IntegrationStatus[] = [
  {
    club_id: "emerald",
    membership_sync: { status: "Online", last_sync: "2026-05-23T09:50" },
    teesheet_sync: { status: "Online", last_sync: "2026-05-23T09:55" },
    pos_sync: { status: "Online", last_sync: "2026-05-23T09:48" },
    payment_sync: { status: "Online", last_sync: "2026-05-23T09:52" },
    loyalty_sync: { status: "Online", last_sync: "2026-05-23T09:51" },
  },
  {
    club_id: "royal-jakarta",
    membership_sync: { status: "Online", last_sync: "2026-05-23T09:45" },
    teesheet_sync: { status: "Online", last_sync: "2026-05-23T09:46" },
    pos_sync: { status: "Online", last_sync: "2026-05-23T09:44" },
    payment_sync: { status: "Online", last_sync: "2026-05-23T09:43" },
    loyalty_sync: { status: "Online", last_sync: "2026-05-23T09:42" },
  },
  {
    club_id: "bali-national",
    membership_sync: { status: "Online", last_sync: "2026-05-23T09:30" },
    teesheet_sync: { status: "Warning", last_sync: "2026-05-23T07:10" },
    pos_sync: { status: "Online", last_sync: "2026-05-23T09:31" },
    payment_sync: { status: "Online", last_sync: "2026-05-23T09:33" },
    loyalty_sync: { status: "Warning", last_sync: "2026-05-23T06:00" },
  },
  {
    club_id: "surabaya-links",
    membership_sync: { status: "Online", last_sync: "2026-05-23T08:30" },
    teesheet_sync: { status: "Online", last_sync: "2026-05-23T08:35" },
    pos_sync: { status: "Online", last_sync: "2026-05-23T08:32" },
    payment_sync: { status: "Online", last_sync: "2026-05-23T08:31" },
    loyalty_sync: { status: "Online", last_sync: "2026-05-23T08:33" },
  },
  {
    club_id: "bandung-highland",
    membership_sync: { status: "Offline", last_sync: "2026-05-21T18:00" },
    teesheet_sync: { status: "Offline", last_sync: "2026-05-21T18:00" },
    pos_sync: { status: "Offline", last_sync: "2026-05-21T18:00" },
    payment_sync: { status: "Offline", last_sync: "2026-05-21T18:00" },
    loyalty_sync: { status: "Offline", last_sync: "2026-05-21T18:00" },
  },
];

// Tee time slots generator
export function getTeeSlots(date: string) {
  const slots: { time: string; available: boolean; price: number }[] = [];
  for (let h = 6; h <= 16; h++) {
    for (const m of [0, 30]) {
      const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      slots.push({
        time,
        available: Math.random() > 0.25 || h < 9,
        price: h < 11 ? 1250000 : h < 14 ? 1450000 : 1100000,
      });
    }
  }
  return slots;
}

// Helpers
export const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export const getClub = (id: string) => clubs.find((c) => c.id === id);
export const getUser = (id: string) => networkUsers.find((u) => u.id === id);

export function getMembershipFor(userId: string, clubId: string): ClubMemberProfile | undefined {
  return clubMembers.find((m) => m.user_id === userId && m.club_id === clubId);
}

export function pointsByClub(userId: string) {
  const map: Record<string, number> = {};
  loyaltyLedger
    .filter((l) => l.user_id === userId)
    .forEach((l) => {
      map[l.club_id] = (map[l.club_id] || 0) + l.points;
    });
  return map;
}

export const paymentMethods = [
  { id: "pm-1", type: "Credit Card", label: "Visa •••• 4821", icon: "💳", tokenized: true },
  { id: "pm-2", type: "QRIS", label: "QRIS — All-Bank", icon: "📱", tokenized: true },
  { id: "pm-3", type: "E-Wallet", label: "GoPay — +62••••7890", icon: "👛", tokenized: true },
  { id: "pm-4", type: "Member Account", label: "Emerald Hills House Account", icon: "🏛️", tokenized: true },
];

/** GHV = Golf Hub Value (IDR cash equivalent). GHP = Golf Hub Points. */
export interface WalletBalance {
  ghv: number;
  ghp: number;
}

export const initialWalletBalance: WalletBalance = {
  ghv: 3750000,
  ghp: 12480,
};

export interface WalletTransaction {
  id: string;
  type: "GHV" | "GHP";
  direction: "in" | "out";
  amount: number;
  description: string;
  created_at: string;
  reference: string;
}

export const walletTransactions: WalletTransaction[] = [
  { id: "wt-1", type: "GHV", direction: "in",  amount: 5000000, description: "Top-up via Bank Transfer",             created_at: "2026-07-15", reference: "TOPUP-2026-0031" },
  { id: "wt-2", type: "GHV", direction: "out", amount: 1250000, description: "Green fee · Emerald Hills",            created_at: "2026-07-20", reference: "TXN-2026-00041" },
  { id: "wt-3", type: "GHP", direction: "in",  amount: 1250,    description: "Earn: booking Emerald Hills",          created_at: "2026-07-20", reference: "LYL-2026-00041" },
  { id: "wt-4", type: "GHV", direction: "in",  amount: 2500000, description: "Top-up via QRIS",                      created_at: "2026-07-28", reference: "TOPUP-2026-0044" },
  { id: "wt-5", type: "GHV", direction: "out", amount: 1450000, description: "Green fee · Royal Jakarta",            created_at: "2026-08-01", reference: "TXN-2026-00055" },
  { id: "wt-6", type: "GHP", direction: "in",  amount: 1450,    description: "Earn: booking Royal Jakarta",          created_at: "2026-08-01", reference: "LYL-2026-00055" },
  { id: "wt-7", type: "GHP", direction: "out", amount: 500,     description: "Redeem: voucher Emerald Hills",        created_at: "2026-08-05", reference: "LYL-2026-00060" },
  { id: "wt-8", type: "GHP", direction: "in",  amount: 280,     description: "Birthday bonus: Emerald Hills",        created_at: "2026-08-07", reference: "LYL-2026-00061" },
];
