import express from "express";
import { PrismaClient, Prisma } from "@prisma/client";

const app = express();
app.use(express.json());

type Profile = {
  id: string;
  displayName: string;
  age: number;
  role: "dom" | "sub" | "switch" | "exploring";
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

type Match = {
  id: string;
  userId: string;
  matchedUserId: string;
  matchedAt: string;
};

type Message = {
  id: string;
  fromUserId: string;
  toUserId: string;
  body: string;
  priority?: boolean;
  sentAt: string;
};

type Report = {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  createdAt: string;
  status: "open" | "reviewed" | "closed";
};

type VerificationStatus = {
  userId: string;
  status: "not_started" | "pending" | "verified" | "rejected";
  updatedAt: string;
};

type ConsentChecklist = {
  matchKey: string;
  checklist: string[];
  statuses: Record<string, { agreed: boolean; updatedAt: string | null }>;
};

type Subscription = {
  userId: string;
  status: "active" | "canceled";
  startedAt: string;
  weeklyCredits: number;
  nextWeeklyCreditAt: string;
  boostBalance: number;
};

const prisma = new PrismaClient();
const creditBalances = new Map<string, number>();
const likes = new Set<string>();
const matches: Match[] = [];
const messages: Message[] = [];
const reports: Report[] = [];
const verification = new Map<string, VerificationStatus>();
const blocks = new Map<string, Set<string>>();
const bans = new Set<string>();
const consentByMatch = new Map<string, ConsentChecklist>();
const subscriptions = new Map<string, Subscription>();

const defaultConsentChecklist = [
  "Discuss hard limits",
  "Confirm safeword",
  "Agree on aftercare",
  "Share health considerations",
  "Set scene expectations"
];

const listOverlap = (left: string[] = [], right: string[] = []) => {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item)).length;
};

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

const computeCompatibility = (viewer?: Profile, candidate?: Profile) => {
  if (!viewer || !candidate) {
    return undefined;
  }
  let score = 50;
  const aftercareOverlap = listOverlap(viewer.aftercarePreferences, candidate.aftercarePreferences);
  const kinkOverlap = listOverlap(viewer.kinkTags, candidate.kinkTags);
  const sceneOverlap = listOverlap(viewer.sceneTypes, candidate.sceneTypes);
  const softOverlap = listOverlap(viewer.softLimits, candidate.softLimits);
  score += Math.min(20, aftercareOverlap * 8);
  score += Math.min(20, kinkOverlap * 5);
  score += Math.min(10, sceneOverlap * 5);
  score += Math.min(10, softOverlap * 5);

  const viewerHard = new Set(viewer.hardLimits ?? []);
  const candidateHard = new Set(candidate.hardLimits ?? []);
  const candidateScenes = new Set(candidate.sceneTypes ?? []);
  const viewerScenes = new Set(viewer.sceneTypes ?? []);
  const conflictWithViewer = Array.from(viewerHard).some((limit) => candidateScenes.has(limit));
  const conflictWithCandidate = Array.from(candidateHard).some((limit) => viewerScenes.has(limit));
  if (conflictWithViewer || conflictWithCandidate) {
    score -= 15;
  }

  return Math.round(clampScore(score));
};

const buildSmartPrompts = (profile: Profile) => {
  const prompts: string[] = [];
  if ((profile.aftercarePreferences ?? []).length > 0) {
    prompts.push("Ask about their ideal aftercare ritual.");
  }
  if ((profile.sceneTypes ?? []).includes("rope")) {
    prompts.push("Favorite rope style or harness?");
  }
  if ((profile.sceneTypes ?? []).includes("impact")) {
    prompts.push("What kind of impact play feels best?");
  }
  if (profile.relationshipStyle) {
    prompts.push(`What does ${profile.relationshipStyle.replace("_", " ")} look like to you?`);
  }
  if (profile.playLocation) {
    prompts.push(`Preferred play setting: ${profile.playLocation}.`);
  }
  if (profile.boundaries) {
    prompts.push("Any must-know boundaries before a first meet?");
  }
  if (prompts.length === 0) {
    prompts.push("What helps you feel safe and seen in a scene?");
  }
  return prompts.slice(0, 3);
};

const isSeenToday = (lastActiveAt?: string) => {
  if (!lastActiveAt) {
    return false;
  }
  const last = new Date(lastActiveAt).getTime();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  return now - last <= dayMs;
};

const ensureWeeklyCredits = (userId: string) => {
  const subscription = subscriptions.get(userId);
  if (!subscription || subscription.status !== "active") {
    return subscription;
  }
  const now = Date.now();
  let nextAt = new Date(subscription.nextWeeklyCreditAt).getTime();
  if (!Number.isFinite(nextAt)) {
    nextAt = now + 7 * 24 * 60 * 60 * 1000;
  }
  let credits = creditBalances.get(userId) ?? 0;
  let updated = false;
  const weeklyMs = 7 * 24 * 60 * 60 * 1000;
  while (now >= nextAt) {
    credits += subscription.weeklyCredits;
    nextAt += weeklyMs;
    updated = true;
  }
  if (updated) {
    creditBalances.set(userId, credits);
    subscription.nextWeeklyCreditAt = new Date(nextAt).toISOString();
    subscriptions.set(userId, subscription);
  }
  return subscription;
};

const seedPhotoPrefix = "pexels_";

const isSeedProfile = async (userId: string) => {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  return Boolean(profile?.photoKey && profile.photoKey.startsWith(seedPhotoPrefix));
};

const fallbackReplies = [
  "Hey! Thanks for the message. What kind of connection are you hoping for?",
  "Hi there. I prefer clear boundaries and a slow pace—how do you like to negotiate?",
  "Appreciate you reaching out. What helps you feel safe and respected?",
  "Hey! I like consent-first chats. Any hard limits I should know?",
  "Hi! I’m into calm, respectful vibes. What are your must-haves?"
];

const generateSeedReply = async (seedId: string, fromId: string, incoming: string) => {
  const seedProfile = await prisma.profile.findUnique({ where: { id: seedId } });
  if (!seedProfile) {
    return fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
  }
  const model = process.env.OLLAMA_MODEL ?? "llama3.1:8b";
  const prompt = [
    "You are roleplaying as a consenting adult on a BDSM dating app.",
    "Be respectful, explicit content is allowed, but keep it non-violent and consent-forward.",
    "Ask clarifying questions and keep replies under 60 words.",
    `Your profile: ${seedProfile.displayName}, role: ${seedProfile.role}, intent: ${seedProfile.intent ?? "exploring"}.`,
    `Bio: ${seedProfile.bio}`,
    `Their message: ${incoming}`,
    "Reply:"
  ].join("\n");

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false })
    });
    if (!response.ok) {
      throw new Error("Ollama request failed");
    }
    const data = (await response.json()) as { response?: string };
    const text = (data.response ?? "").trim();
    if (!text) {
      throw new Error("Empty AI response");
    }
    return text;
  } catch (error) {
    console.error(error);
    return fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
  }
};

const buildMatchKey = (userA: string, userB: string) => {
  return [userA, userB].sort().join(":");
};

const getConsentSummary = (matchKey: string, userA: string, userB: string) => {
  const existing = consentByMatch.get(matchKey);
  const checklist = existing?.checklist ?? defaultConsentChecklist;
  const statusA = existing?.statuses[userA] ?? { agreed: false, updatedAt: null };
  const statusB = existing?.statuses[userB] ?? { agreed: false, updatedAt: null };
  return {
    matchKey,
    checklist,
    statuses: {
      [userA]: statusA,
      [userB]: statusB
    }
  };
};

const toStringArray = (value: string | null) => {
  if (!value) {
    return [];
  }
  return value.split(",").map((item) => item.trim()).filter(Boolean);
};

const fromStringArray = (value?: string[]) => {
  if (!value || value.length === 0) {
    return null;
  }
  return value.join(",");
};

const normalizeProfile = (profile: Prisma.ProfileGetPayload<{}>): Profile => {
  return {
    id: profile.id,
    displayName: profile.displayName,
    age: profile.age,
    role: profile.role as Profile["role"],
    bio: profile.bio,
    verified: profile.verified,
    intent: profile.intent as Profile["intent"],
    state: profile.state ?? undefined,
    zip: profile.zip ?? undefined,
    experienceLevel: profile.experienceLevel as Profile["experienceLevel"],
    aftercare: profile.aftercare as Profile["aftercare"],
    sceneTypes: toStringArray(profile.sceneTypes),
    hardLimits: toStringArray(profile.hardLimits),
    kinkTags: toStringArray(profile.kinkTags),
    safeword: profile.safeword ?? undefined,
    boundaries: profile.boundaries ?? undefined,
    relationshipStyle: profile.relationshipStyle as Profile["relationshipStyle"],
    availability: profile.availability as Profile["availability"],
    playLocation: profile.playLocation as Profile["playLocation"],
    aftercarePreferences: toStringArray(profile.aftercarePreferences),
    aftercareNotes: profile.aftercareNotes ?? undefined,
    softLimits: toStringArray(profile.softLimits),
    limitsNotes: profile.limitsNotes ?? undefined,
    lastActiveAt: profile.lastActiveAt?.toISOString(),
    boostedUntil: profile.boostedUntil?.toISOString(),
    photoKey: profile.photoKey ?? undefined,
    photoKeys: toStringArray(profile.photoKeys)
  };
};

const seedProfiles = async (force = false) => {
  const count = await prisma.profile.count();
  if (count > 0 && !force) {
    return;
  }
  const seedPhotoKeys = [
    "pexels_woman_01.jpg",
    "pexels_woman_02.jpg",
    "pexels_woman_03.jpg",
    "pexels_woman_04.jpg",
    "pexels_woman_05.jpg",
    "pexels_woman_06.jpg",
    "pexels_woman_07.jpg",
    "pexels_woman_08.jpg",
    "pexels_woman_09.jpg",
    "pexels_woman_10.jpg",
    "pexels_woman_11.jpg",
    "pexels_woman_12.jpg",
    "pexels_woman_13.jpg",
    "pexels_woman_14.jpg",
    "pexels_woman_15.jpg",
    "pexels_woman_16.jpg",
    "pexels_woman_17.jpg",
    "pexels_woman_18.jpg",
    "pexels_woman_19.jpg",
    "pexels_woman_20.jpg",
    "pexels_man_01.jpg",
    "pexels_man_02.jpg",
    "pexels_man_03.jpg",
    "pexels_man_04.jpg",
    "pexels_man_05.jpg",
    "pexels_man_06.jpg",
    "pexels_man_07.jpg",
    "pexels_man_08.jpg",
    "pexels_man_09.jpg",
    "pexels_man_10.jpg",
    "pexels_man_11.jpg",
    "pexels_man_12.jpg",
    "pexels_man_13.jpg",
    "pexels_man_14.jpg",
    "pexels_man_15.jpg",
    "pexels_man_16.jpg",
    "pexels_man_17.jpg",
    "pexels_man_18.jpg",
    "pexels_man_19.jpg",
    "pexels_man_20.jpg",
    "pexels_couple_01.jpg",
    "pexels_couple_02.jpg",
    "pexels_couple_03.jpg",
    "pexels_couple_04.jpg",
    "pexels_couple_05.jpg",
    "pexels_couple_06.jpg",
    "pexels_couple_07.jpg",
    "pexels_couple_08.jpg",
    "pexels_couple_09.jpg",
    "pexels_couple_10.jpg",
    "pexels_couple_11.jpg",
    "pexels_couple_12.jpg",
    "pexels_couple_13.jpg",
    "pexels_couple_14.jpg",
    "pexels_couple_15.jpg"
  ];
  const seedRoles: Profile["role"][] = ["dom", "sub", "switch", "exploring"];
  const seedIntents: Profile["intent"][] = ["play_only", "relationship", "exploring"];
  const seedExperience: Profile["experienceLevel"][] = ["new", "some", "experienced"];
  const seedAftercare: Profile["aftercare"][] = ["light", "medium", "high"];
  const seedRelationship: Profile["relationshipStyle"][] = ["monogamous", "open", "poly", "kink_only", "casual"];
  const seedAvailability: Profile["availability"][] = ["weeknights", "weekends", "flexible"];
  const seedPlayLocation: Profile["playLocation"][] = ["private", "club", "outdoors", "travel"];
  const seedStates = ["CA", "NY", "TX", "CO", "FL", "IL", "WA", "MA", "AZ", "GA"];
  const seedScenes = ["rope", "impact", "sensation", "power", "roleplay"];
  const seedKinks = ["rope", "impact", "power", "sensation", "service", "petplay"];
  const seedAftercarePrefs = ["cuddles", "water", "blanket", "check-ins", "quiet time"];
  const seedSoftLimits = ["public", "photography", "marks", "roleplay"];
  const seedBios = [
    "Consent-forward, curious, and big on clear communication.",
    "I like a calm vibe, thoughtful negotiation, and steady aftercare.",
    "Kink-friendly and grounded. Trust and chemistry matter most.",
    "Open to learning together with patience and respect.",
    "I value clear limits, playful energy, and kind check-ins.",
    "Looking for connection first, then we can build from there.",
    "Soft power exchange, honest talks, and a no-rush pace.",
    "I enjoy planning scenes and debriefing after.",
    "Gentle, steady, and direct. Boundaries are non-negotiable.",
    "I love mutual curiosity and low-pressure exploration."
  ];
  const seedWomen = [
    "Avery",
    "Jordan",
    "Morgan",
    "Riley",
    "Quinn",
    "Casey",
    "Sasha",
    "Tessa",
    "Nora",
    "Priya",
    "Maya",
    "Lena",
    "Harper",
    "Isla",
    "Naomi",
    "Zoe",
    "Camille",
    "Eva",
    "Remy",
    "Lila"
  ];
  const seedMen = [
    "Rowan",
    "Theo",
    "Elias",
    "Jonah",
    "Miles",
    "Caleb",
    "Owen",
    "Isaac",
    "Levi",
    "Noah",
    "Gavin",
    "Julian",
    "Adrian",
    "Nico",
    "Kai",
    "Silas",
    "Rhys",
    "Bennett",
    "Finn",
    "Emmett"
  ];
  const seedCouples = [
    "Alex & Jordan",
    "Sam & Riley",
    "Casey & Morgan",
    "Avery & Kai",
    "Nico & Jules",
    "Maya & Theo",
    "Quinn & Rowan",
    "Lena & Owen",
    "Priya & Noah",
    "Sasha & Eli",
    "Harper & Miles",
    "Tessa & Finn",
    "Zoe & Rhys",
    "Cam & Remy",
    "Naomi & Jude"
  ];
  const seedSafewords = [
    "Anchor",
    "Lighthouse",
    "Saffron",
    "Atlas",
    "Pine",
    "Orbit",
    "Copper",
    "North",
    "Sunset",
    "Ember"
  ];
  const seedBoundaries = [
    "No breath play. Check in often.",
    "No humiliation or degradation.",
    "No blood play. Keep it low intensity.",
    "Prefer written negotiation before meeting.",
    "No surprise impact. Warm-ups only.",
    "No marks on the face or neck."
  ];
  const seedAftercareNotes = [
    "Water, a blanket, and quiet time.",
    "Gentle check-ins and a slow come-down.",
    "Snacks and a calm debrief after.",
    "Soft touch and a short walk outside.",
    "Hydration and some music.",
    "A follow-up text the next day."
  ];
  const seedLimitsNotes = [
    "Please ask before leaving marks.",
    "Keep intensity moderate unless agreed.",
    "No surprises. Clear consent only.",
    "Slow pacing helps me feel safe.",
    "Stick to negotiated scenes.",
    "No photos without consent."
  ];
  const pickPair = (list: string[], index: number) => [
    list[index % list.length],
    list[(index + 2) % list.length]
  ];
  let womanIndex = 0;
  let manIndex = 0;
  let coupleIndex = 0;
  const sample: Prisma.ProfileCreateManyInput[] = seedPhotoKeys.map((photoKey, index) => {
    const id = `user_${index + 1}`;
    const sceneTypes = pickPair(seedScenes, index);
    const kinkTags = pickPair(seedKinks, index);
    const aftercarePreferences = pickPair(seedAftercarePrefs, index);
    const softLimits = [seedSoftLimits[index % seedSoftLimits.length]];
    const isWoman = photoKey.startsWith("pexels_woman_");
    const isMan = photoKey.startsWith("pexels_man_");
    const isCouple = photoKey.startsWith("pexels_couple_");
    let displayName = "Profile";
    if (isWoman) {
      displayName = seedWomen[womanIndex % seedWomen.length];
      womanIndex += 1;
    } else if (isMan) {
      displayName = seedMen[manIndex % seedMen.length];
      manIndex += 1;
    } else if (isCouple) {
      displayName = seedCouples[coupleIndex % seedCouples.length];
      coupleIndex += 1;
    }
    const role = isCouple ? "exploring" : seedRoles[index % seedRoles.length];
    const intent = isCouple ? "relationship" : seedIntents[index % seedIntents.length];
    const relationshipStyle = isCouple
      ? (coupleIndex % 2 === 0 ? "open" : "poly")
      : seedRelationship[index % seedRelationship.length];
    const ageBase = isCouple ? 28 : 23;
    const age = ageBase + (index % 16);
    return {
      id,
      displayName,
      age,
      role,
      bio: seedBios[index % seedBios.length],
      verified: index % 4 === 0,
      intent,
      photoKey,
      photoKeys: fromStringArray([photoKey]),
      state: seedStates[index % seedStates.length],
      zip: `9${(index % 9) + 1}10${index % 10}`,
      experienceLevel: seedExperience[index % seedExperience.length],
      aftercare: seedAftercare[index % seedAftercare.length],
      sceneTypes: fromStringArray(sceneTypes),
      hardLimits: fromStringArray([]),
      kinkTags: fromStringArray(kinkTags),
      safeword: seedSafewords[index % seedSafewords.length],
      boundaries: seedBoundaries[index % seedBoundaries.length],
      relationshipStyle,
      availability: seedAvailability[index % seedAvailability.length],
      playLocation: seedPlayLocation[index % seedPlayLocation.length],
      aftercarePreferences: fromStringArray(aftercarePreferences),
      aftercareNotes: seedAftercareNotes[index % seedAftercareNotes.length],
      softLimits: fromStringArray(softLimits),
      limitsNotes: seedLimitsNotes[index % seedLimitsNotes.length],
      lastActiveAt: new Date(Date.now() - (index % 36) * 60 * 60 * 1000)
    };
  });

  await prisma.profile.createMany({ data: sample });
};

seedProfiles().catch((error) => console.error(error));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/admin/seed", async (_req, res) => {
  await prisma.profile.deleteMany();
  creditBalances.clear();
  likes.clear();
  matches.length = 0;
  messages.length = 0;
  reports.length = 0;
  verification.clear();
  blocks.clear();
  bans.clear();
  consentByMatch.clear();
  subscriptions.clear();
  await seedProfiles(true);
  res.json({ ok: true });
});

app.get("/profiles/:id", async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { id: req.params.id } });
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json(normalizeProfile(profile));
});

app.put("/profiles/:id", async (req, res) => {
  const existing = await prisma.profile.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const update = req.body as Partial<Profile>;
  if (update.displayName !== undefined && !update.displayName) {
    res.status(400).json({ error: "Missing profile fields" });
    return;
  }

  const updated = await prisma.profile.update({
    where: { id: req.params.id },
    data: {
      displayName: update.displayName,
      age: update.age,
      role: update.role,
      bio: update.bio,
      verified: update.verified,
      intent: update.intent,
      state: update.state,
      zip: update.zip,
      experienceLevel: update.experienceLevel,
      aftercare: update.aftercare,
      sceneTypes: update.sceneTypes ? fromStringArray(update.sceneTypes) : undefined,
      hardLimits: update.hardLimits ? fromStringArray(update.hardLimits) : undefined,
      kinkTags: update.kinkTags ? fromStringArray(update.kinkTags) : undefined,
      safeword: update.safeword,
      boundaries: update.boundaries,
      relationshipStyle: update.relationshipStyle,
      availability: update.availability,
      playLocation: update.playLocation,
      aftercarePreferences: update.aftercarePreferences ? fromStringArray(update.aftercarePreferences) : undefined,
      aftercareNotes: update.aftercareNotes,
      softLimits: update.softLimits ? fromStringArray(update.softLimits) : undefined,
      limitsNotes: update.limitsNotes,
      photoKey: update.photoKey,
      photoKeys: update.photoKeys ? fromStringArray(update.photoKeys) : undefined,
      lastActiveAt: new Date()
    }
  });

  res.json(normalizeProfile(updated));
});

app.get("/discover", async (req, res) => {
  const {
    userId,
    role,
    verified,
    ageMin,
    ageMax,
    state,
    zip,
    experience,
    aftercare,
    scene,
    excludeLimit,
    relationshipStyle,
    availability,
    playLocation,
    kinkTags,
    aftercarePreferences,
    softLimits,
    minCompatibility,
    seenToday
  } = req.query as {
    userId?: string;
    role?: string;
    verified?: string;
    ageMin?: string;
    ageMax?: string;
    state?: string;
    zip?: string;
    experience?: string;
    aftercare?: string;
    scene?: string;
    excludeLimit?: string;
    relationshipStyle?: string;
    availability?: string;
    playLocation?: string;
    kinkTags?: string;
    aftercarePreferences?: string;
    softLimits?: string;
    minCompatibility?: string;
    seenToday?: string;
  };
  const selectedKinkTags = kinkTags ? kinkTags.split(",").filter(Boolean) : [];
  const selectedAftercarePrefs = aftercarePreferences ? aftercarePreferences.split(",").filter(Boolean) : [];
  const selectedSoftLimits = softLimits ? softLimits.split(",").filter(Boolean) : [];
  const blocked = userId ? blocks.get(userId) ?? new Set<string>() : new Set<string>();
  const parsedMin = ageMin ? Number(ageMin) : undefined;
  const parsedMax = ageMax ? Number(ageMax) : undefined;
  const parsedCompatibility = minCompatibility ? Number(minCompatibility) : undefined;
  const seenTodayOnly = seenToday === "true" ? true : false;
  const verifiedFilter = verified === "true" ? true : verified === "false" ? false : undefined;
  const normalizedState = state ? state.toUpperCase() : undefined;

  const allProfiles = await prisma.profile.findMany();
  const list = allProfiles.map(normalizeProfile).filter((profile) => {
    if (profile.id === userId) {
      return false;
    }
    if (bans.has(profile.id)) {
      return false;
    }
    if (blocked.has(profile.id)) {
      return false;
    }
    if (role && profile.role !== role) {
      return false;
    }
    if (verifiedFilter !== undefined && profile.verified !== verifiedFilter) {
      return false;
    }
    if (parsedMin !== undefined && profile.age < parsedMin) {
      return false;
    }
    if (parsedMax !== undefined && profile.age > parsedMax) {
      return false;
    }
    if (normalizedState && profile.state?.toUpperCase() !== normalizedState) {
      return false;
    }
    if (zip && profile.zip !== zip) {
      return false;
    }
    if (experience && profile.experienceLevel !== experience) {
      return false;
    }
    if (aftercare && profile.aftercare !== aftercare) {
      return false;
    }
    if (scene && !(profile.sceneTypes ?? []).includes(scene)) {
      return false;
    }
    if (excludeLimit && (profile.hardLimits ?? []).includes(excludeLimit)) {
      return false;
    }
    if (relationshipStyle && profile.relationshipStyle !== relationshipStyle) {
      return false;
    }
    if (selectedKinkTags.length > 0) {
      const tags = profile.kinkTags ?? [];
      if (!selectedKinkTags.every((tag) => tags.includes(tag))) {
        return false;
      }
    }
    if (availability && profile.availability !== availability) {
      return false;
    }
    if (playLocation && profile.playLocation !== playLocation) {
      return false;
    }
    if (selectedAftercarePrefs.length > 0) {
      const prefs = profile.aftercarePreferences ?? [];
      if (!selectedAftercarePrefs.every((pref) => prefs.includes(pref))) {
        return false;
      }
    }
    if (selectedSoftLimits.length > 0) {
      const limits = profile.softLimits ?? [];
      if (!selectedSoftLimits.every((limit) => limits.includes(limit))) {
        return false;
      }
    }
    return true;
  });
  const viewerRecord = userId ? await prisma.profile.findUnique({ where: { id: userId } }) : null;
  const viewer = viewerRecord ? normalizeProfile(viewerRecord) : undefined;
  let enriched = list.map((profile) => ({
    ...profile,
    compatibilityScore: computeCompatibility(viewer, profile),
    smartPrompts: buildSmartPrompts(profile),
    seenToday: isSeenToday(profile.lastActiveAt)
  }));
  if (Number.isFinite(parsedCompatibility)) {
    enriched = enriched.filter(
      (profile) => (profile.compatibilityScore ?? 0) >= (parsedCompatibility ?? 0)
    );
  }
  if (seenTodayOnly) {
    enriched = enriched.filter((profile) => profile.seenToday);
  }
  res.json({ profiles: enriched });
});

app.post("/profiles", async (req, res) => {
  const { id, displayName, age, role, bio, verified } = req.body as Profile;

  if (!id || !displayName || !age || !role) {
    res.status(400).json({ error: "Missing profile fields" });
    return;
  }

  const created = await prisma.profile.create({
    data: {
      id,
      displayName,
      age,
      role,
      bio: bio ?? "",
      verified: Boolean(verified),
      intent: req.body.intent,
      state: req.body.state,
      zip: req.body.zip,
      experienceLevel: req.body.experienceLevel,
      aftercare: req.body.aftercare,
      sceneTypes: fromStringArray(req.body.sceneTypes),
      hardLimits: fromStringArray(req.body.hardLimits),
      kinkTags: fromStringArray(req.body.kinkTags),
      safeword: req.body.safeword,
      boundaries: req.body.boundaries,
      relationshipStyle: req.body.relationshipStyle,
      availability: req.body.availability,
      playLocation: req.body.playLocation,
      aftercarePreferences: fromStringArray(req.body.aftercarePreferences),
      aftercareNotes: req.body.aftercareNotes,
      softLimits: fromStringArray(req.body.softLimits),
      limitsNotes: req.body.limitsNotes,
      photoKey: req.body.photoKey,
      photoKeys: fromStringArray(req.body.photoKeys),
      lastActiveAt: new Date()
    }
  });

  res.status(201).json(normalizeProfile(created));
});

app.post("/likes", (req, res) => {
  const { fromUserId, toUserId } = req.body as {
    fromUserId: string;
    toUserId: string;
  };

  if (!fromUserId || !toUserId) {
    res.status(400).json({ error: "Missing like fields" });
    return;
  }

  const likeKey = `${fromUserId}:${toUserId}`;
  likes.add(likeKey);

  const mutualKey = `${toUserId}:${fromUserId}`;
  if (likes.has(mutualKey)) {
    const match: Match = {
      id: `match_${matches.length + 1}`,
      userId: fromUserId,
      matchedUserId: toUserId,
      matchedAt: new Date().toISOString()
    };
    matches.push(match);
    res.status(201).json({ matched: true, match });
    return;
  }

  res.json({ matched: false });
});

app.get("/matches", (req, res) => {
  const { userId } = req.query as { userId?: string };
  if (!userId) {
    res.json({ matches });
    return;
  }

  const blocked = blocks.get(userId) ?? new Set<string>();

  res.json({
    matches: matches.filter(
      (match) => {
        if (!(match.userId === userId || match.matchedUserId === userId)) {
          return false;
        }
        const otherId = match.userId === userId ? match.matchedUserId : match.userId;
        if (blocked.has(otherId) || bans.has(otherId)) {
          return false;
        }
        return true;
      }
    )
  });
});

app.get("/consent", (req, res) => {
  const { userId, otherId } = req.query as { userId?: string; otherId?: string };
  if (!userId || !otherId) {
    res.status(400).json({ error: "Missing consent participants" });
    return;
  }
  const matchKey = buildMatchKey(userId, otherId);
  res.json(getConsentSummary(matchKey, userId, otherId));
});

app.post("/consent", (req, res) => {
  const { userId, otherId, checklist } = req.body as {
    userId?: string;
    otherId?: string;
    checklist?: string[];
  };
  if (!userId || !otherId) {
    res.status(400).json({ error: "Missing consent participants" });
    return;
  }
  const matchKey = buildMatchKey(userId, otherId);
  const existing = consentByMatch.get(matchKey);
  const nextChecklist = checklist && checklist.length > 0 ? checklist : existing?.checklist ?? defaultConsentChecklist;
  const next: ConsentChecklist = {
    matchKey,
    checklist: nextChecklist,
    statuses: {
      ...(existing?.statuses ?? {}),
      [userId]: { agreed: true, updatedAt: new Date().toISOString() }
    }
  };
  consentByMatch.set(matchKey, next);
  res.json(getConsentSummary(matchKey, userId, otherId));
});

app.get("/icebreakers", (req, res) => {
  const { userId, otherId } = req.query as { userId?: string; otherId?: string };
  if (!userId || !otherId) {
    res.status(400).json({ error: "Missing participants" });
    return;
  }
  const prompts = [
    "What does a great first scene look like for you?",
    "What aftercare helps you feel grounded?",
    "What are your top three must-haves?",
    "What boundaries are most important to you?",
    "How do you like to negotiate before meeting?",
    "What pace feels most comfortable for you?",
    "What is your favorite way to build trust?",
    "What does respect look like to you in a scene?"
  ];
  const picks = prompts
    .slice()
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);
  res.json({ prompts: picks });
});

app.get("/credits/:userId", (req, res) => {
  const { userId } = req.params;
  ensureWeeklyCredits(userId);
  const credits = creditBalances.get(userId) ?? 0;
  res.json({ userId, credits });
});

app.get("/subscription/:userId", (req, res) => {
  const { userId } = req.params;
  const subscription = ensureWeeklyCredits(userId) ?? null;
  res.json({ subscription });
});

app.post("/subscription/start", (req, res) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: "Missing userId" });
    return;
  }
  const existing = subscriptions.get(userId);
  if (existing && existing.status === "active") {
    res.json({ subscription: existing });
    return;
  }
  const now = new Date();
  const subscription: Subscription = {
    userId,
    status: "active",
    startedAt: now.toISOString(),
    weeklyCredits: 10,
    nextWeeklyCreditAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    boostBalance: 3
  };
  subscriptions.set(userId, subscription);
  res.json({ subscription });
});

app.post("/subscription/cancel", (req, res) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: "Missing userId" });
    return;
  }
  const existing = subscriptions.get(userId);
  if (!existing) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }
  const updated = { ...existing, status: "canceled" as const };
  subscriptions.set(userId, updated);
  res.json({ subscription: updated });
});

app.post("/boosts/use", (req, res) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: "Missing userId" });
    return;
  }
  const subscription = subscriptions.get(userId);
  if (!subscription || subscription.status !== "active") {
    res.status(403).json({ error: "Subscription required" });
    return;
  }
  if (subscription.boostBalance <= 0) {
    res.status(402).json({ error: "No boosts remaining" });
    return;
  }
  subscription.boostBalance -= 1;
  subscriptions.set(userId, subscription);
  const boostedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  prisma.profile.update({
    where: { id: userId },
    data: { boostedUntil: new Date(boostedUntil) }
  }).catch((error) => console.error(error));
  res.json({ boostedUntil, boostBalance: subscription.boostBalance });
});

app.post("/message", (req, res) => {
  const { fromUserId, toUserId, body, priority } = req.body as {
    fromUserId: string;
    toUserId: string;
    body: string;
    priority?: boolean;
  };

  if (!fromUserId || !toUserId || !body) {
    res.status(400).json({ error: "Missing fields" });
    return;
  }

  if (bans.has(fromUserId) || bans.has(toUserId)) {
    res.status(403).json({ error: "User is banned" });
    return;
  }

  const matchKey = buildMatchKey(fromUserId, toUserId);
  const consent = consentByMatch.get(matchKey);
  if (consent) {
    const fromStatus = consent.statuses[fromUserId];
    const toStatus = consent.statuses[toUserId];
    if (!fromStatus?.agreed || !toStatus?.agreed) {
      res.status(403).json({ error: "Consent checklist required" });
      return;
    }
  }

  const blocked = blocks.get(fromUserId) ?? new Set<string>();
  if (blocked.has(toUserId)) {
    res.status(403).json({ error: "User is blocked" });
    return;
  }

  const currentCredits = creditBalances.get(fromUserId) ?? 0;
  const cost = priority ? 2 : 1;
  if (currentCredits < cost) {
    res.status(402).json({ error: "Not enough credits" });
    return;
  }

  creditBalances.set(fromUserId, currentCredits - cost);

  const message: Message = {
    id: `msg_${messages.length + 1}`,
    fromUserId,
    toUserId,
    body,
    priority: Boolean(priority),
    sentAt: new Date().toISOString()
  };

  messages.push(message);
  res.json({ ok: true, remainingCredits: currentCredits - cost, message });

  if (toUserId.startsWith("user_")) {
    isSeedProfile(toUserId)
      .then((seed) => {
        if (!seed) {
          return null;
        }
        return generateSeedReply(toUserId, fromUserId, body);
      })
      .then((reply) => {
        if (!reply) {
          return;
        }
        const aiMessage: Message = {
          id: `msg_${messages.length + 1}`,
          fromUserId: toUserId,
          toUserId: fromUserId,
          body: reply,
          sentAt: new Date().toISOString()
        };
        messages.push(aiMessage);
      })
      .catch((error) => console.error(error));
  }
});

app.get("/messages/thread", (req, res) => {
  const { userA, userB } = req.query as { userA?: string; userB?: string };

  if (!userA || !userB) {
    res.status(400).json({ error: "Missing thread participants" });
    return;
  }

  if (bans.has(userA) || bans.has(userB)) {
    res.status(403).json({ error: "User is banned" });
    return;
  }

  const blocked = blocks.get(userA) ?? new Set<string>();
  if (blocked.has(userB)) {
    res.status(403).json({ error: "User is blocked" });
    return;
  }

  const thread = messages.filter(
    (message) =>
      (message.fromUserId === userA && message.toUserId === userB) ||
      (message.fromUserId === userB && message.toUserId === userA)
  );

  res.json({ messages: thread });
});

app.post("/reports", (req, res) => {
  const { reporterId, reportedUserId, reason } = req.body as {
    reporterId: string;
    reportedUserId: string;
    reason: string;
  };

  if (!reporterId || !reportedUserId || !reason) {
    res.status(400).json({ error: "Missing report fields" });
    return;
  }

  const report: Report = {
    id: `report_${reports.length + 1}`,
    reporterId,
    reportedUserId,
    reason,
    createdAt: new Date().toISOString(),
    status: "open"
  };

  reports.push(report);
  res.status(201).json(report);
});

app.get("/blocks", (req, res) => {
  const { userId } = req.query as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: "Missing userId" });
    return;
  }
  const blocked = blocks.get(userId) ?? new Set<string>();
  res.json({ blocked: Array.from(blocked.values()) });
});

app.post("/blocks", (req, res) => {
  const { userId, blockedUserId } = req.body as { userId: string; blockedUserId: string };
  if (!userId || !blockedUserId) {
    res.status(400).json({ error: "Missing block fields" });
    return;
  }
  const set = blocks.get(userId) ?? new Set<string>();
  set.add(blockedUserId);
  blocks.set(userId, set);
  res.json({ userId, blockedUserId });
});

app.delete("/blocks", (req, res) => {
  const { userId, blockedUserId } = req.body as { userId: string; blockedUserId: string };
  if (!userId || !blockedUserId) {
    res.status(400).json({ error: "Missing block fields" });
    return;
  }
  const set = blocks.get(userId);
  if (set) {
    set.delete(blockedUserId);
  }
  res.json({ userId, blockedUserId });
});

app.get("/reports", (_req, res) => {
  res.json({ reports });
});

app.patch("/reports/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status?: Report["status"] };
  const report = reports.find((item) => item.id === id);
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  if (!status || !["open", "reviewed", "closed"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  report.status = status;
  res.json(report);
});

app.post("/verification/start", (req, res) => {
  const { userId } = req.body as { userId: string };
  if (!userId) {
    res.status(400).json({ error: "Missing userId" });
    return;
  }

  const status: VerificationStatus = {
    userId,
    status: "pending",
    updatedAt: new Date().toISOString()
  };
  verification.set(userId, status);
  res.json(status);
});

app.get("/verification", (_req, res) => {
  res.json({ verifications: Array.from(verification.values()) });
});

app.get("/verification/:userId", (req, res) => {
  const { userId } = req.params;
  const status = verification.get(userId) ?? {
    userId,
    status: "not_started",
    updatedAt: new Date().toISOString()
  };
  res.json(status);
});

app.post("/verification/:userId/approve", (req, res) => {
  const { userId } = req.params;
  const current = verification.get(userId) ?? {
    userId,
    status: "pending",
    updatedAt: new Date().toISOString()
  };
  const updated: VerificationStatus = {
    ...current,
    status: "verified",
    updatedAt: new Date().toISOString()
  };
  verification.set(userId, updated);
  prisma.profile.update({
    where: { id: userId },
    data: { verified: true }
  }).catch((error) => console.error(error));
  res.json(updated);
});

app.post("/verification/:userId/reject", (req, res) => {
  const { userId } = req.params;
  const current = verification.get(userId) ?? {
    userId,
    status: "pending",
    updatedAt: new Date().toISOString()
  };
  const updated: VerificationStatus = {
    ...current,
    status: "rejected",
    updatedAt: new Date().toISOString()
  };
  verification.set(userId, updated);
  res.json(updated);
});

app.post("/ban/:userId", (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    res.status(400).json({ error: "Missing userId" });
    return;
  }
  bans.add(userId);
  res.json({ userId, banned: true });
});

app.post("/credits/add", (req, res) => {
  const { userId, amount } = req.body as { userId: string; amount: number };

  if (!userId || !amount || amount <= 0) {
    res.status(400).json({ error: "Invalid credit amount" });
    return;
  }

  const currentCredits = creditBalances.get(userId) ?? 0;
  const updated = currentCredits + amount;
  creditBalances.set(userId, updated);
  res.json({ userId, credits: updated });
});

app.post("/credits/purchase", (req, res) => {
  const { userId, productId, receiptId } = req.body as {
    userId: string;
    productId: string;
    receiptId: string;
  };

  if (!userId || !productId || !receiptId) {
    res.status(400).json({ error: "Invalid purchase payload" });
    return;
  }

  const creditMap: Record<string, number> = {
    "credits_5": 5,
    "credits_15": 15,
    "credits_30": 30
  };

  const amount = creditMap[productId];
  if (!amount) {
    res.status(400).json({ error: "Unknown product" });
    return;
  }

  const currentCredits = creditBalances.get(userId) ?? 0;
  const updated = currentCredits + amount;
  creditBalances.set(userId, updated);
  res.json({ userId, credits: updated });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`API listening on ${port}`);
});
