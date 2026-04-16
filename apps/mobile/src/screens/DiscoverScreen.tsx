import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api, Profile, SubscriptionStatus } from "../api/client";
import { RootStackParamList } from "../navigation/types";
import { getProfileImage } from "../assets/profileImages";

type Props = {
  userId: string;
};
export default function DiscoverScreen({ userId }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"dom" | "sub" | "switch" | "exploring" | "any">("any");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [ageMin, setAgeMin] = useState("21");
  const [ageMax, setAgeMax] = useState("40");
  const [blocked, setBlocked] = useState<string[]>([]);
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [experience, setExperience] = useState<"any" | "new" | "some" | "experienced">("any");
  const [aftercare, setAftercare] = useState<"any" | "light" | "medium" | "high">("any");
  const [scene, setScene] = useState("any");
  const [excludeLimit, setExcludeLimit] = useState("");
  const [relationshipStyle, setRelationshipStyle] = useState<
    "any" | "monogamous" | "open" | "poly" | "kink_only" | "casual"
  >("any");
  const [availability, setAvailability] = useState<"any" | "weeknights" | "weekends" | "flexible">("any");
  const [playLocation, setPlayLocation] = useState<"any" | "private" | "club" | "outdoors" | "travel">("any");
  const [kinkTags, setKinkTags] = useState<string[]>([]);
  const [aftercarePrefs, setAftercarePrefs] = useState<string[]>([]);
  const [softLimits, setSoftLimits] = useState<string[]>([]);
  const [minCompatibility, setMinCompatibility] = useState("0");
  const [seenTodayOnly, setSeenTodayOnly] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const isSubscriber = subscription?.status === "active";

  const toggleValue = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const formatIntent = (intent?: Profile["intent"]) => {
    if (!intent) {
      return "";
    }
    return intent.replace("_", " ");
  };

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const parsedMin = Number(ageMin);
      const parsedMax = Number(ageMax);
      const parsedCompatibility = Number(minCompatibility);
      const filters = {
        role: role === "any" ? undefined : role,
        verified: verifiedOnly ? true : undefined,
        ageMin: Number.isFinite(parsedMin) ? parsedMin : undefined,
        ageMax: Number.isFinite(parsedMax) ? parsedMax : undefined,
        state: state.trim().toUpperCase() || undefined,
        zip: zip.trim() || undefined,
        experience: experience === "any" ? undefined : experience,
        aftercare: aftercare === "any" ? undefined : aftercare,
        scene: scene === "any" ? undefined : scene,
        excludeLimit: excludeLimit.trim() || undefined,
        relationshipStyle: relationshipStyle === "any" ? undefined : relationshipStyle,
        availability: availability === "any" ? undefined : availability,
        playLocation: playLocation === "any" ? undefined : playLocation,
        kinkTags: kinkTags.length > 0 ? kinkTags : undefined,
        aftercarePreferences: aftercarePrefs.length > 0 ? aftercarePrefs : undefined,
        softLimits: softLimits.length > 0 ? softLimits : undefined,
        minCompatibility: isSubscriber && Number.isFinite(parsedCompatibility) ? parsedCompatibility : undefined,
        seenToday: isSubscriber && seenTodayOnly ? true : undefined
      };
      const response = await api.getDiscover(userId, filters);
      const filtered = response.profiles.filter((profile) => !blocked.includes(profile.id));
      setProfiles(filtered);
    } catch (error) {
      console.error(error);
      Alert.alert("Discovery error", "Unable to load profiles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [
    role,
    verifiedOnly,
    blocked,
    experience,
    aftercare,
    scene,
    relationshipStyle,
    availability,
    playLocation,
    kinkTags,
    aftercarePrefs,
    softLimits,
    minCompatibility,
    seenTodayOnly,
    isSubscriber
  ]);

  useEffect(() => {
    const loadBlocks = async () => {
      try {
        const response = await api.listBlocks(userId);
        setBlocked(response.blocked);
      } catch (error) {
        console.error(error);
      }
    };

    loadBlocks();
  }, [userId]);

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const response = await api.getSubscription(userId);
        setSubscription(response.subscription);
      } catch (error) {
        setSubscription(null);
      }
    };

    loadSubscription();
  }, [userId]);

  const handleLike = async (targetId: string) => {
    try {
      const response = await api.like(userId, targetId);
      if (response.matched) {
        Alert.alert("It's a match", "You can now message using credits.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Like error", "Unable to send like.");
    }

    setProfiles((prev) => prev.slice(1));
  };

  const handleSkip = () => {
    setProfiles((prev) => prev.slice(1));
  };

  const handleBlock = async (targetId: string) => {
    try {
      await api.blockUser(userId, targetId);
      setBlocked((prev) => [...prev, targetId]);
      Alert.alert("Blocked", "You will no longer see this profile.");
    } catch (error) {
      console.error(error);
      Alert.alert("Block error", "Unable to block user.");
    }
  };

  const handleReport = async (targetId: string) => {
    try {
      await api.reportUser(userId, targetId, "Inappropriate profile");
      Alert.alert("Report sent", "Thanks for keeping the community safe.");
    } catch (error) {
      console.error(error);
      Alert.alert("Report error", "Unable to send report.");
    }
  };

  const nextProfile = useMemo(() => profiles[0], [profiles]);

  return (
    <ImageBackground
      source={require("../../assets/images/pexels-kuiyibo-12577547.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Discover</Text>
        <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Role</Text>
        <View style={styles.filterRow}>
          {(["any", "dom", "sub", "switch", "exploring"] as const).map((item) => (
            <Pressable
              key={item}
              style={[styles.filterChip, role === item && styles.filterChipActive]}
              onPress={() => setRole(item)}
            >
              <Text style={styles.filterChipText}>{item.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Min age</Text>
            <TextInput
              style={styles.filterInput}
              value={ageMin}
              keyboardType="number-pad"
              onChangeText={setAgeMin}
              onEndEditing={loadProfiles}
              placeholderTextColor="#f0dbe5"
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Max age</Text>
            <TextInput
              style={styles.filterInput}
              value={ageMax}
              keyboardType="number-pad"
              onChangeText={setAgeMax}
              onEndEditing={loadProfiles}
              placeholderTextColor="#f0dbe5"
            />
          </View>
          <Pressable
            style={[styles.filterToggle, verifiedOnly && styles.filterToggleActive]}
            onPress={() => setVerifiedOnly((prev) => !prev)}
          >
            <Text style={styles.filterToggleText}>{verifiedOnly ? "Verified" : "Any"}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.filterRow}>
        <View style={styles.filterField}>
          <Text style={styles.filterLabel}>State</Text>
          <TextInput
            style={styles.filterInput}
            value={state}
            onChangeText={setState}
            onEndEditing={loadProfiles}
            autoCapitalize="characters"
            placeholder="CA"
            placeholderTextColor="#f0dbe5"
          />
        </View>
        <View style={styles.filterField}>
          <Text style={styles.filterLabel}>ZIP</Text>
          <TextInput
            style={styles.filterInput}
            value={zip}
            onChangeText={setZip}
            onEndEditing={loadProfiles}
            keyboardType="number-pad"
            placeholder="94107"
            placeholderTextColor="#f0dbe5"
          />
        </View>
      </View>
      <View style={styles.filterRow}>
        <View style={styles.filterField}>
          <Text style={styles.filterLabel}>Experience</Text>
          <View style={styles.filterRow}>
            {(["any", "new", "some", "experienced"] as const).map((level) => (
              <Pressable
                key={level}
                style={[styles.filterChip, experience === level && styles.filterChipActive]}
                onPress={() => setExperience(level)}
              >
                <Text style={styles.filterChipText}>{level.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.filterRow}>
        <View style={styles.filterField}>
          <Text style={styles.filterLabel}>Aftercare</Text>
          <View style={styles.filterRow}>
            {(["any", "light", "medium", "high"] as const).map((level) => (
              <Pressable
                key={level}
                style={[styles.filterChip, aftercare === level && styles.filterChipActive]}
                onPress={() => setAftercare(level)}
              >
                <Text style={styles.filterChipText}>{level.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.filterRow}>
        <View style={styles.filterField}>
          <Text style={styles.filterLabel}>Scene</Text>
          <View style={styles.filterRow}>
            {(["any", "rope", "impact", "sensation", "power", "roleplay"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.filterChip, scene === item && styles.filterChipActive]}
                onPress={() => setScene(item)}
              >
                <Text style={styles.filterChipText}>{item.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.filterRow}>
        <View style={styles.filterField}>
          <Text style={styles.filterLabel}>Exclude limit</Text>
          <TextInput
            style={styles.filterInput}
            value={excludeLimit}
            onChangeText={setExcludeLimit}
            onEndEditing={loadProfiles}
            placeholder="e.g., needles"
            placeholderTextColor="#f0dbe5"
          />
        </View>
      </View>
      <View style={styles.filterRow}>
        <View style={styles.filterField}>
          <Text style={styles.filterLabel}>Relationship style</Text>
          <View style={styles.filterRow}>
            {(["any", "monogamous", "open", "poly", "kink_only", "casual"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.filterChip, relationshipStyle === item && styles.filterChipActive]}
                onPress={() => setRelationshipStyle(item)}
              >
                <Text style={styles.filterChipText}>{item.replace("_", " ").toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.filterRow}>
        <View style={styles.filterField}>
          <Text style={styles.filterLabel}>Kink tags (multi)</Text>
          <View style={styles.filterRow}>
            {(["rope", "impact", "power", "sensation", "service", "petplay"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.filterChip, kinkTags.includes(item) && styles.filterChipActive]}
                onPress={() => toggleValue(item, kinkTags, setKinkTags)}
              >
                <Text style={styles.filterChipText}>{item.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.filterRow}>
        <View style={styles.filterField}>
          <Text style={styles.filterLabel}>Availability</Text>
          <View style={styles.filterRow}>
            {(["any", "weeknights", "weekends", "flexible"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.filterChip, availability === item && styles.filterChipActive]}
                onPress={() => setAvailability(item)}
              >
                <Text style={styles.filterChipText}>{item.replace("_", " ").toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.filterRow}>
        <View style={styles.filterField}>
          <Text style={styles.filterLabel}>Play location</Text>
          <View style={styles.filterRow}>
            {(["any", "private", "club", "outdoors", "travel"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.filterChip, playLocation === item && styles.filterChipActive]}
                onPress={() => setPlayLocation(item)}
              >
                <Text style={styles.filterChipText}>{item.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.filterRow}>
        <View style={styles.filterField}>
          <Text style={styles.filterLabel}>Aftercare prefs</Text>
          <View style={styles.filterRow}>
            {(["cuddles", "water", "blanket", "check-ins", "quiet time"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.filterChip, aftercarePrefs.includes(item) && styles.filterChipActive]}
                onPress={() => toggleValue(item, aftercarePrefs, setAftercarePrefs)}
              >
                <Text style={styles.filterChipText}>{item.replace("-", " ").toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.filterRow}>
        <View style={styles.filterField}>
          <Text style={styles.filterLabel}>Soft limits</Text>
          <View style={styles.filterRow}>
            {(["public", "photography", "marks", "roleplay"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.filterChip, softLimits.includes(item) && styles.filterChipActive]}
                onPress={() => toggleValue(item, softLimits, setSoftLimits)}
              >
                <Text style={styles.filterChipText}>{item.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      {isSubscriber ? (
        <View style={styles.filterCard}>
          <Text style={styles.filterLabel}>Advanced filters</Text>
          <View style={styles.filterRow}>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Min match %</Text>
              <TextInput
                style={styles.filterInput}
                value={minCompatibility}
                keyboardType="number-pad"
                onChangeText={setMinCompatibility}
                onEndEditing={loadProfiles}
                placeholder="70"
                placeholderTextColor="#f0dbe5"
              />
            </View>
            <Pressable
              style={[styles.filterToggle, seenTodayOnly && styles.filterToggleActive]}
              onPress={() => setSeenTodayOnly((prev) => !prev)}
            >
              <Text style={styles.filterToggleText}>{seenTodayOnly ? "Seen today" : "Any"}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
        {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff7f5" />
        </View>
      ) : nextProfile ? (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate("ProfileDetail", { profileId: nextProfile.id, viewerId: userId })}
        >
          <Image source={getProfileImage(nextProfile.photoKey)} style={styles.profileImage} />
          <Text style={styles.name}>{nextProfile.displayName}</Text>
          <Text style={styles.meta}>
            {nextProfile.age} · {nextProfile.role.toUpperCase()}
          </Text>
          <View style={styles.badgeRow}>
            {nextProfile.compatibilityScore !== undefined ? (
              <View style={[styles.badge, styles.matchBadge]}>
                <Text style={styles.badgeText}>{nextProfile.compatibilityScore}% match</Text>
              </View>
            ) : null}
            {nextProfile.seenToday ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Seen today</Text>
              </View>
            ) : null}
            {nextProfile.boostedUntil && new Date(nextProfile.boostedUntil).getTime() > Date.now() ? (
              <View style={[styles.badge, styles.boostBadge]}>
                <Text style={styles.badgeText}>Boosted</Text>
              </View>
            ) : null}
            {nextProfile.intent ? (
              <View style={[styles.badge, styles.intentBadge]}>
                <Text style={styles.badgeText}>{formatIntent(nextProfile.intent)}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.bio}>{nextProfile.bio}</Text>
          {(nextProfile.kinkTags ?? []).length > 0 ? (
            <View style={styles.tagRow}>
              {(nextProfile.kinkTags ?? []).map((tag: string) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Text style={styles.detailText}>{nextProfile.relationshipStyle?.replace("_", " ") ?? ""}</Text>
            <Text style={styles.detailText}>{nextProfile.availability?.replace("_", " ") ?? ""}</Text>
            <Text style={styles.detailText}>{nextProfile.playLocation ?? ""}</Text>
          </View>
          {(nextProfile.smartPrompts ?? []).length > 0 ? (
            <View style={styles.promptRow}>
              {(nextProfile.smartPrompts ?? []).map((prompt) => (
                <View key={prompt} style={styles.promptChip}>
                  <Text style={styles.promptText}>{prompt}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {nextProfile.verified ? "Verified" : "Unverified"}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.skip]} onPress={handleSkip}>
              <Text style={styles.buttonText}>Skip</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.like]} onPress={() => handleLike(nextProfile.id)}>
              <Text style={styles.buttonText}>Like</Text>
            </Pressable>
          </View>
          <View style={styles.safetyRow}>
            <Pressable style={styles.safetyButton} onPress={() => handleReport(nextProfile.id)}>
              <Text style={styles.safetyText}>Report</Text>
            </Pressable>
            <Pressable style={styles.safetyButton} onPress={() => handleBlock(nextProfile.id)}>
              <Text style={styles.safetyText}>Block</Text>
            </Pressable>
          </View>
        </Pressable>
      ) : (
        <View style={styles.center}>
          <Text style={styles.empty}>No more profiles right now.</Text>
          <Pressable style={styles.reload} onPress={loadProfiles}>
            <Text style={styles.reloadText}>Reload</Text>
          </Pressable>
        </View>
      )}
        <View style={styles.queueList}>
          <Text style={styles.queueTitle}>Up next</Text>
          {profiles.slice(1).map((item) => (
            <View key={item.id} style={styles.queueItem}>
              <Text style={styles.queueName}>{item.displayName}</Text>
              <Text style={styles.queueMeta}>{item.role}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1
  },
  container: {
    flex: 1,
    backgroundColor: "rgba(14, 10, 14, 0.68)",
    paddingHorizontal: 20
  },
  scrollContent: {
    paddingBottom: 32
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff7f5",
    marginTop: 16,
    fontFamily: "PlayfairDisplay_600SemiBold",
    textAlign: "center",
    letterSpacing: 0.6
  },
  filterCard: {
    marginTop: 16,
    backgroundColor: "rgba(20, 14, 22, 0.72)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    padding: 12
  },
  filterLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    color: "#f2d6e6",
    marginBottom: 6
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8
  },
  filterChip: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999
  },
  filterChipActive: {
    backgroundColor: "rgba(255, 92, 143, 0.34)"
  },
  filterChipText: {
    fontSize: 11,
    color: "#fff7f5",
    fontWeight: "600"
  },
  filterField: {
    flex: 1
  },
  filterInput: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#fff7f5"
  },
  filterToggle: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12
  },
  filterToggleActive: {
    backgroundColor: "rgba(255, 92, 143, 0.45)"
  },
  filterToggleText: {
    color: "#fff7f5",
    fontWeight: "600"
  },
  card: {
    marginTop: 20,
    backgroundColor: "rgba(18, 12, 20, 0.78)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)"
  },
  profileImage: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    marginBottom: 12
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff7f5"
  },
  meta: {
    marginTop: 4,
    color: "#e7cddd",
    fontSize: 14
  },
  bio: {
    marginTop: 12,
    color: "#fff1f6",
    lineHeight: 20
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  tagChip: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999
  },
  tagText: {
    fontSize: 10,
    color: "#fff7f5",
    fontWeight: "600"
  },
  detailRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10
  },
  detailText: {
    fontSize: 11,
    color: "#f0dbe5",
    textTransform: "capitalize"
  },
  badgeRow: {
    flexDirection: "row",
    marginTop: 12,
    flexWrap: "wrap",
    gap: 8
  },
  badge: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  matchBadge: {
    backgroundColor: "rgba(255, 92, 143, 0.35)"
  },
  boostBadge: {
    backgroundColor: "rgba(255, 194, 102, 0.25)"
  },
  intentBadge: {
    backgroundColor: "rgba(89, 200, 255, 0.2)"
  },
  badgeText: {
    fontSize: 12,
    color: "#fff7f5"
  },
  promptRow: {
    marginTop: 12,
    gap: 8
  },
  promptChip: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12
  },
  promptText: {
    color: "#fff7f5",
    fontSize: 11,
    lineHeight: 16
  },
  actions: {
    flexDirection: "row",
    marginTop: 16,
    gap: 12
  },
  safetyRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12
  },
  safetyButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center"
  },
  safetyText: {
    color: "#fff7f5",
    fontWeight: "600"
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center"
  },
  skip: {
    backgroundColor: "rgba(255, 255, 255, 0.14)"
  },
  like: {
    backgroundColor: "#7b5146"
  },
  buttonText: {
    color: "#fff7f5",
    fontWeight: "600"
  },
  center: {
    alignItems: "center",
    marginTop: 24
  },
  empty: {
    color: "#fff7f5",
    marginBottom: 12
  },
  reload: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10
  },
  reloadText: {
    color: "#fff7f5" 
  },
  queueList: {
    paddingBottom: 24
  },
  queueTitle: {
    marginTop: 20,
    marginBottom: 8,
    color: "#fff7f5",
    fontWeight: "600"
  },
  queueItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.14)"
  },
  queueName: {
    fontWeight: "600",
    color: "#fff7f5"
  },
  queueMeta: {
    color: "#e7cddd"
  }
});
