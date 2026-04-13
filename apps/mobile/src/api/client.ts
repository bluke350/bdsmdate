import { Platform } from "react-native";

type Role = "dom" | "sub" | "switch" | "exploring";

export type Profile = {
  id: string;
  displayName: string;
  age: number;
  role: Role;
  bio: string;
  verified: boolean;
  intent?: "play_only" | "relationship" | "exploring";
  state?: string;
  zip?: string;
  experienceLevel?: "new" | "some" | "experienced";
  aftercare?: "light" | "medium" | "high";
  sceneTypes?: string[];
  hardLimits?: string[];
  kinkTags?: string[];
  safeword?: string;
  boundaries?: string;
  relationshipStyle?: "monogamous" | "open" | "poly" | "kink_only" | "casual";
  availability?: "weeknights" | "weekends" | "flexible";
  playLocation?: "private" | "club" | "outdoors" | "travel";
  aftercarePreferences?: string[];
  aftercareNotes?: string;
  softLimits?: string[];
  limitsNotes?: string;
  lastActiveAt?: string;
  boostedUntil?: string;
  photoKey?: string;
  photoKeys?: string[];
  compatibilityScore?: number;
  smartPrompts?: string[];
  seenToday?: boolean;
};

export type SubscriptionStatus = {
  userId: string;
  status: "active" | "canceled";
  startedAt: string;
  weeklyCredits: number;
  nextWeeklyCreditAt: string;
  boostBalance: number;
};

export type Match = {
  id: string;
  userId: string;
  matchedUserId: string;
  matchedAt: string;
};

export type Message = {
  id: string;
  fromUserId: string;
  toUserId: string;
  body: string;
  priority?: boolean;
  sentAt: string;
};

export type Report = {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  createdAt: string;
  status: "open" | "reviewed" | "closed";
};

export type VerificationStatus = {
  userId: string;
  status: "not_started" | "pending" | "verified" | "rejected";
  updatedAt: string;
};

export type PurchaseReceipt = {
  productId: string;
  receiptId: string;
};

export type ConsentStatus = {
  matchKey: string;
  checklist: string[];
  statuses: Record<string, { agreed: boolean; updatedAt: string | null }>;
};

export type DiscoverFilters = {
  role?: Role;
  verified?: boolean;
  ageMin?: number;
  ageMax?: number;
  state?: string;
  zip?: string;
  experience?: "new" | "some" | "experienced";
  aftercare?: "light" | "medium" | "high";
  scene?: string;
  excludeLimit?: string;
  relationshipStyle?: "monogamous" | "open" | "poly" | "kink_only" | "casual";
  availability?: "weeknights" | "weekends" | "flexible";
  playLocation?: "private" | "club" | "outdoors" | "travel";
  kinkTags?: string[];
  aftercarePreferences?: string[];
  softLimits?: string[];
  minCompatibility?: number;
  seenToday?: boolean;
};

const baseUrl = Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getProfile: (userId: string) => request<Profile>(`/profiles/${userId}`),
  createProfile: (profile: Profile) =>
    request<Profile>("/profiles", {
      method: "POST",
      body: JSON.stringify(profile)
    }),
  updateProfile: (userId: string, profile: Partial<Profile>) =>
    request<Profile>(`/profiles/${userId}`, {
      method: "PUT",
      body: JSON.stringify(profile)
    }),
  getDiscover: (userId: string, filters?: DiscoverFilters) => {
    const params = new URLSearchParams({ userId });
    if (filters?.role) {
      params.set("role", filters.role);
    }
    if (filters?.verified !== undefined) {
      params.set("verified", String(filters.verified));
    }
    if (filters?.ageMin !== undefined) {
      params.set("ageMin", String(filters.ageMin));
    }
    if (filters?.ageMax !== undefined) {
      params.set("ageMax", String(filters.ageMax));
    }
    if (filters?.state) {
      params.set("state", filters.state);
    }
    if (filters?.zip) {
      params.set("zip", filters.zip);
    }
    if (filters?.experience) {
      params.set("experience", filters.experience);
    }
    if (filters?.aftercare) {
      params.set("aftercare", filters.aftercare);
    }
    if (filters?.scene) {
      params.set("scene", filters.scene);
    }
    if (filters?.excludeLimit) {
      params.set("excludeLimit", filters.excludeLimit);
    }
    if (filters?.relationshipStyle) {
      params.set("relationshipStyle", filters.relationshipStyle);
    }
    if (filters?.availability) {
      params.set("availability", filters.availability);
    }
    if (filters?.playLocation) {
      params.set("playLocation", filters.playLocation);
    }
    if (filters?.kinkTags && filters.kinkTags.length > 0) {
      params.set("kinkTags", filters.kinkTags.join(","));
    }
    if (filters?.aftercarePreferences && filters.aftercarePreferences.length > 0) {
      params.set("aftercarePreferences", filters.aftercarePreferences.join(","));
    }
    if (filters?.softLimits && filters.softLimits.length > 0) {
      params.set("softLimits", filters.softLimits.join(","));
    }
    if (filters?.minCompatibility !== undefined) {
      params.set("minCompatibility", String(filters.minCompatibility));
    }
    if (filters?.seenToday !== undefined) {
      params.set("seenToday", String(filters.seenToday));
    }
    return request<{ profiles: Profile[] }>(`/discover?${params.toString()}`);
  },
  seedProfiles: () =>
    request<{ ok: boolean }>("/admin/seed", {
      method: "POST"
    }),
  like: (fromUserId: string, toUserId: string) =>
    request<{ matched: boolean; match?: Match }>("/likes", {
      method: "POST",
      body: JSON.stringify({ fromUserId, toUserId })
    }),
  getMatches: (userId: string) => request<{ matches: Match[] }>(`/matches?userId=${userId}`),
  getCredits: (userId: string) => request<{ userId: string; credits: number }>(`/credits/${userId}`),
  addCredits: (userId: string, amount: number) =>
    request<{ userId: string; credits: number }>("/credits/add", {
      method: "POST",
      body: JSON.stringify({ userId, amount })
    }),
  purchaseCredits: (userId: string, receipt: PurchaseReceipt) =>
    request<{ userId: string; credits: number }>("/credits/purchase", {
      method: "POST",
      body: JSON.stringify({ userId, ...receipt })
    }),
  sendMessage: (fromUserId: string, toUserId: string, body: string, priority?: boolean) =>
    request<{ ok: boolean; remainingCredits: number; message: Message }>("/message", {
      method: "POST",
      body: JSON.stringify({ fromUserId, toUserId, body, priority })
    }),
  getThread: (userA: string, userB: string) =>
    request<{ messages: Message[] }>(`/messages/thread?userA=${userA}&userB=${userB}`),
  reportUser: (reporterId: string, reportedUserId: string, reason: string) =>
    request("/reports", {
      method: "POST",
      body: JSON.stringify({ reporterId, reportedUserId, reason })
    }),
  listBlocks: (userId: string) => request<{ blocked: string[] }>(`/blocks?userId=${userId}`),
  blockUser: (userId: string, blockedUserId: string) =>
    request("/blocks", {
      method: "POST",
      body: JSON.stringify({ userId, blockedUserId })
    }),
  unblockUser: (userId: string, blockedUserId: string) =>
    request("/blocks", {
      method: "DELETE",
      body: JSON.stringify({ userId, blockedUserId })
    }),
  listReports: (userId: string) => request<{ reports: Report[] }>(`/reports?userId=${userId}`),
  updateReportStatus: (reportId: string, status: Report["status"]) =>
    request<Report>(`/reports/${reportId}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }),
  startVerification: (userId: string) =>
    request<VerificationStatus>("/verification/start", {
      method: "POST",
      body: JSON.stringify({ userId })
    }),
  getVerification: (userId: string) =>
    request<VerificationStatus>(`/verification/${userId}`),
  listVerifications: () => request<{ verifications: VerificationStatus[] }>("/verification"),
  approveVerification: (userId: string) =>
    request<VerificationStatus>(`/verification/${userId}/approve`, {
      method: "POST"
    }),
  rejectVerification: (userId: string) =>
    request<VerificationStatus>(`/verification/${userId}/reject`, {
      method: "POST"
    }),
  banUser: (userId: string) =>
    request<{ userId: string; banned: boolean }>(`/ban/${userId}`, {
      method: "POST"
    }),
  getConsent: (userId: string, otherId: string) =>
    request<ConsentStatus>(`/consent?userId=${userId}&otherId=${otherId}`),
  setConsent: (userId: string, otherId: string, checklist: string[]) =>
    request<ConsentStatus>("/consent", {
      method: "POST",
      body: JSON.stringify({ userId, otherId, checklist })
    }),
  getIcebreakers: (userId: string, otherId: string) =>
    request<{ prompts: string[] }>(`/icebreakers?userId=${userId}&otherId=${otherId}`),
  getSubscription: (userId: string) =>
    request<{ subscription: SubscriptionStatus | null }>(`/subscription/${userId}`),
  startSubscription: (userId: string) =>
    request<{ subscription: SubscriptionStatus }>("/subscription/start", {
      method: "POST",
      body: JSON.stringify({ userId })
    }),
  cancelSubscription: (userId: string) =>
    request<{ subscription: SubscriptionStatus }>("/subscription/cancel", {
      method: "POST",
      body: JSON.stringify({ userId })
    }),
  useBoost: (userId: string) =>
    request<{ boostedUntil: string; boostBalance: number }>("/boosts/use", {
      method: "POST",
      body: JSON.stringify({ userId })
    })
};
