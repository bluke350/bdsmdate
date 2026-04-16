import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert, Image, ImageBackground, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api, Profile, SubscriptionStatus, VerificationStatus } from "../api/client";
import { getProfileImage } from "../assets/profileImages";

type Props = {
  userId: string;
};

export default function ProfileScreen({ userId }: Props) {
  const [credits, setCredits] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Profile["role"] | "">("");
  const [bio, setBio] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [blocked, setBlocked] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<"new" | "some" | "experienced">("new");
  const [aftercare, setAftercare] = useState<"light" | "medium" | "high">("medium");
  const [sceneTypes, setSceneTypes] = useState<string[]>([]);
  const [hardLimits, setHardLimits] = useState<string[]>([]);
  const [kinkTags, setKinkTags] = useState<string[]>([]);
  const [safeword, setSafeword] = useState("");
  const [boundaries, setBoundaries] = useState("");
  const [intent, setIntent] = useState<"play_only" | "relationship" | "exploring">("exploring");
  const [relationshipStyle, setRelationshipStyle] = useState<
    "monogamous" | "open" | "poly" | "kink_only" | "casual"
  >("casual");
  const [availability, setAvailability] = useState<"weeknights" | "weekends" | "flexible">("flexible");
  const [playLocation, setPlayLocation] = useState<"private" | "club" | "outdoors" | "travel">("private");
  const [aftercarePreferences, setAftercarePreferences] = useState<string[]>([]);
  const [aftercareNotes, setAftercareNotes] = useState("");
  const [softLimits, setSoftLimits] = useState<string[]>([]);
  const [limitsNotes, setLimitsNotes] = useState("");
  const [photoKey, setPhotoKey] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [boostedUntil, setBoostedUntil] = useState<string | null>(null);

  const isSubscriber = subscription?.status === "active";
  const nextCreditDate = subscription?.nextWeeklyCreditAt
    ? new Date(subscription.nextWeeklyCreditAt).toLocaleDateString()
    : "N/A";
  const boostActive = boostedUntil ? new Date(boostedUntil).getTime() > Date.now() : false;

  const toggleValue = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const loadCredits = async () => {
    try {
      const response = await api.getCredits(userId);
      setCredits(response.credits);
    } catch (error) {
      console.error(error);
    }
  };

  const loadProfile = async () => {
    try {
      const response = await api.getProfile(userId);
      setProfile(response);
      setDisplayName(response.displayName);
      setRole(response.role);
      setBio(response.bio);
      setState(response.state ?? "");
      setZip(response.zip ?? "");
      setExperienceLevel(response.experienceLevel ?? "new");
      setAftercare(response.aftercare ?? "medium");
      setSceneTypes(response.sceneTypes ?? []);
      setHardLimits(response.hardLimits ?? []);
      setKinkTags(response.kinkTags ?? []);
      setSafeword(response.safeword ?? "");
      setBoundaries(response.boundaries ?? "");
      setIntent(response.intent ?? "exploring");
      setRelationshipStyle(response.relationshipStyle ?? "casual");
      setAvailability(response.availability ?? "flexible");
      setPlayLocation(response.playLocation ?? "private");
      setAftercarePreferences(response.aftercarePreferences ?? []);
      setAftercareNotes(response.aftercareNotes ?? "");
      setSoftLimits(response.softLimits ?? []);
      setLimitsNotes(response.limitsNotes ?? "");
      setPhotoKey(response.photoKey ?? "");
      setBoostedUntil(response.boostedUntil ?? null);
    } catch (error) {
      console.error(error);
      setProfile(null);
    }
  };

  const loadSubscription = async () => {
    try {
      const response = await api.getSubscription(userId);
      setSubscription(response.subscription);
    } catch (error) {
      setSubscription(null);
    }
  };

  const loadVerification = async () => {
    try {
      const response = await api.getVerification(userId);
      setVerification(response);
    } catch (error) {
      console.error(error);
      setVerification(null);
    }
  };

  const loadBlocks = async () => {
    try {
      const response = await api.listBlocks(userId);
      setBlocked(response.blocked);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadCredits();
    loadProfile();
    loadVerification();
    loadBlocks();
    loadSubscription();
  }, [userId]);

  const addCredits = async () => {
    try {
      const response = await api.addCredits(userId, 5);
      setCredits(response.credits);
      Alert.alert("Credits added", "5 credits added to your balance.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Unable to add credits.");
    }
  };

  const purchaseCredits = async (amount: number) => {
    try {
      const receiptId = `receipt_${Date.now()}`;
      const productId = `credits_${amount}`;
      const response = await api.purchaseCredits(userId, { productId, receiptId });
      setCredits(response.credits);
      Alert.alert("Purchase complete", `${amount} credits added to your balance.`);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Unable to add credits.");
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Allow access to your photo library to upload a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoKey(result.assets[0].uri);
    }
  };

  const saveProfile = async () => {
    if (!displayName.trim() || !role) {
      Alert.alert("Missing info", "Display name and role are required.");
      return;
    }

    try {
      const updated = await api.updateProfile(userId, {
        displayName: displayName.trim(),
        role,
        bio: bio.trim(),
        state: state.trim().toUpperCase() || undefined,
        zip: zip.trim() || undefined,
        experienceLevel,
        aftercare,
        sceneTypes,
        hardLimits,
        kinkTags,
        safeword: safeword.trim() || undefined,
        boundaries: boundaries.trim() || undefined,
        intent,
        relationshipStyle,
        availability,
        playLocation,
        aftercarePreferences,
        aftercareNotes: aftercareNotes.trim() || undefined,
        softLimits,
        limitsNotes: limitsNotes.trim() || undefined,
        photoKey: photoKey || undefined,
        photoKeys: photoKey ? [photoKey] : undefined
      });
      setProfile(updated);
      setEditing(false);
      Alert.alert("Profile saved", "Your profile has been updated.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Unable to save profile.");
    }
  };

  const startVerification = async () => {
    try {
      const response = await api.startVerification(userId);
      setVerification(response);
      Alert.alert("Verification started", "We will notify you when verification is complete.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Unable to start verification.");
    }
  };

  const startSubscription = async () => {
    try {
      const response = await api.startSubscription(userId);
      setSubscription(response.subscription);
      Alert.alert("Subscribed", "Weekly credits and boosts are now active.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Unable to start subscription.");
    }
  };

  const cancelSubscription = async () => {
    try {
      const response = await api.cancelSubscription(userId);
      setSubscription(response.subscription);
      Alert.alert("Subscription canceled", "You can rejoin anytime.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Unable to cancel subscription.");
    }
  };

  const useBoost = async () => {
    try {
      const response = await api.useBoost(userId);
      setBoostedUntil(response.boostedUntil);
      setSubscription((prev) =>
        prev ? { ...prev, boostBalance: response.boostBalance } : prev
      );
      Alert.alert("Boost active", "Your profile is boosted for 24 hours.");
    } catch (error) {
      console.error(error);
      Alert.alert("Boost unavailable", "Subscribe or add more boosts to continue.");
    }
  };

  const unblockUser = async (blockedId: string) => {
    try {
      await api.unblockUser(userId, blockedId);
      setBlocked((prev) => prev.filter((id) => id !== blockedId));
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Unable to unblock user.");
    }
  };

  const reseedProfiles = () => {
    Alert.alert("Reseed profiles", "This will reset profiles and matches. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          try {
            await api.seedProfiles();
            await loadProfile();
            Alert.alert("Seeded", "Profiles reset to the default seed list.");
          } catch (error) {
            console.error(error);
            Alert.alert("Error", "Unable to reseed profiles.");
          }
        }
      }
    ]);
  };

  return (
    <ImageBackground
      source={require("../../assets/images/pexels-bedbible-12109316.jpg")}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
    <View style={styles.overlay} pointerEvents="none" />
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Profile</Text>
        <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile details</Text>
          <Pressable onPress={() => setEditing((prev) => !prev)}>
            <Text style={styles.link}>{editing ? "Cancel" : "Edit"}</Text>
          </Pressable>
        </View>
        <Text style={styles.label}>Profile photo</Text>
        <View style={styles.photoUploadRow}>
          <Image source={getProfileImage(photoKey || profile?.photoKey)} style={styles.photoPreview} />
          {editing && (
            <Pressable style={styles.uploadButton} onPress={pickPhoto}>
              <Text style={styles.uploadButtonText}>{photoKey ? "Change photo" : "Upload photo"}</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.label}>Display name</Text>
        {editing ? (
          <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} />
        ) : (
          <Text style={styles.value}>{profile?.displayName ?? "Not set"}</Text>
        )}
        <Text style={styles.label}>Role</Text>
        {editing ? (
          <View style={styles.roleRow}>
            {(["dom", "sub", "switch", "exploring"] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => setRole(option)}
                style={[styles.roleChip, role === option && styles.roleChipActive]}
              >
                <Text style={styles.roleChipText}>{option.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.value}>{profile?.role ?? "Not set"}</Text>
        )}
        <Text style={styles.label}>Bio</Text>
        {editing ? (
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            multiline
          />
        ) : (
          <Text style={styles.value}>{profile?.bio ?? "Not set"}</Text>
        )}
        <Text style={styles.label}>State</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={state}
            onChangeText={setState}
            autoCapitalize="characters"
          />
        ) : (
          <Text style={styles.value}>{profile?.state ?? "Not set"}</Text>
        )}
        <Text style={styles.label}>ZIP code</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={zip}
            onChangeText={setZip}
            keyboardType="number-pad"
          />
        ) : (
          <Text style={styles.value}>{profile?.zip ?? "Not set"}</Text>
        )}
        <Text style={styles.label}>Experience</Text>
        {editing ? (
          <View style={styles.chipRow}>
            {(["new", "some", "experienced"] as const).map((level) => (
              <Pressable
                key={level}
                style={[styles.chip, experienceLevel === level && styles.chipActive]}
                onPress={() => setExperienceLevel(level)}
              >
                <Text style={styles.chipText}>{level.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.value}>{profile?.experienceLevel ?? "Not set"}</Text>
        )}
        <Text style={styles.label}>Aftercare</Text>
        {editing ? (
          <View style={styles.chipRow}>
            {(["light", "medium", "high"] as const).map((level) => (
              <Pressable
                key={level}
                style={[styles.chip, aftercare === level && styles.chipActive]}
                onPress={() => setAftercare(level)}
              >
                <Text style={styles.chipText}>{level.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.value}>{profile?.aftercare ?? "Not set"}</Text>
        )}
        <Text style={styles.label}>Scene types</Text>
        {editing ? (
          <View style={styles.chipRow}>
            {(["rope", "impact", "sensation", "power", "roleplay"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.chip, sceneTypes.includes(item) && styles.chipActive]}
                onPress={() => toggleValue(item, sceneTypes, setSceneTypes)}
              >
                <Text style={styles.chipText}>{item.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.value}>{(profile?.sceneTypes ?? []).join(", ") || "Not set"}</Text>
        )}
        <Text style={styles.label}>Hard limits</Text>
        {editing ? (
          <View style={styles.chipRow}>
            {(["impact", "needles", "humiliation"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.chip, hardLimits.includes(item) && styles.chipActive]}
                onPress={() => toggleValue(item, hardLimits, setHardLimits)}
              >
                <Text style={styles.chipText}>{item.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.value}>{(profile?.hardLimits ?? []).join(", ") || "Not set"}</Text>
        )}
        <Text style={styles.label}>Kink tags</Text>
        {editing ? (
          <View style={styles.chipRow}>
            {(["rope", "impact", "power", "sensation", "service", "petplay"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.chip, kinkTags.includes(item) && styles.chipActive]}
                onPress={() => toggleValue(item, kinkTags, setKinkTags)}
              >
                <Text style={styles.chipText}>{item.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.value}>{(profile?.kinkTags ?? []).join(", ") || "Not set"}</Text>
        )}
        <Text style={styles.label}>Safeword</Text>
        {editing ? (
          <TextInput style={styles.input} value={safeword} onChangeText={setSafeword} />
        ) : (
          <Text style={styles.value}>{profile?.safeword ?? "Not set"}</Text>
        )}
        <Text style={styles.label}>Boundaries</Text>
        {editing ? (
          <TextInput
            style={[styles.input, styles.textArea]}
            value={boundaries}
            onChangeText={setBoundaries}
            multiline
          />
        ) : (
          <Text style={styles.value}>{profile?.boundaries ?? "Not set"}</Text>
        )}
        <Text style={styles.label}>Intent</Text>
        {editing ? (
          <View style={styles.chipRow}>
            {(["play_only", "relationship", "exploring"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.chip, intent === item && styles.chipActive]}
                onPress={() => setIntent(item)}
              >
                <Text style={styles.chipText}>{item.replace("_", " ").toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.value}>{profile?.intent?.replace("_", " ") ?? "Not set"}</Text>
        )}
        <Text style={styles.label}>Relationship style</Text>
        {editing ? (
          <View style={styles.chipRow}>
            {(["monogamous", "open", "poly", "kink_only", "casual"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.chip, relationshipStyle === item && styles.chipActive]}
                onPress={() => setRelationshipStyle(item)}
              >
                <Text style={styles.chipText}>{item.replace("_", " ").toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.value}>{profile?.relationshipStyle?.replace("_", " ") ?? "Not set"}</Text>
        )}
        <Text style={styles.label}>Availability</Text>
        {editing ? (
          <View style={styles.chipRow}>
            {(["weeknights", "weekends", "flexible"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.chip, availability === item && styles.chipActive]}
                onPress={() => setAvailability(item)}
              >
                <Text style={styles.chipText}>{item.replace("_", " ").toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.value}>{profile?.availability?.replace("_", " ") ?? "Not set"}</Text>
        )}
        <Text style={styles.label}>Play location</Text>
        {editing ? (
          <View style={styles.chipRow}>
            {(["private", "club", "outdoors", "travel"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.chip, playLocation === item && styles.chipActive]}
                onPress={() => setPlayLocation(item)}
              >
                <Text style={styles.chipText}>{item.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.value}>{profile?.playLocation ?? "Not set"}</Text>
        )}
        <Text style={styles.label}>Aftercare preferences</Text>
        {editing ? (
          <View style={styles.chipRow}>
            {(["cuddles", "water", "blanket", "check-ins", "quiet time"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.chip, aftercarePreferences.includes(item) && styles.chipActive]}
                onPress={() => toggleValue(item, aftercarePreferences, setAftercarePreferences)}
              >
                <Text style={styles.chipText}>{item.replace("-", " ").toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.value}>{(profile?.aftercarePreferences ?? []).join(", ") || "Not set"}</Text>
        )}
        <Text style={styles.label}>Aftercare notes</Text>
        {editing ? (
          <TextInput
            style={[styles.input, styles.textArea]}
            value={aftercareNotes}
            onChangeText={setAftercareNotes}
            multiline
          />
        ) : (
          <Text style={styles.value}>{profile?.aftercareNotes ?? "Not set"}</Text>
        )}
        <Text style={styles.label}>Soft limits</Text>
        {editing ? (
          <View style={styles.chipRow}>
            {(["public", "photography", "marks", "roleplay"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.chip, softLimits.includes(item) && styles.chipActive]}
                onPress={() => toggleValue(item, softLimits, setSoftLimits)}
              >
                <Text style={styles.chipText}>{item.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.value}>{(profile?.softLimits ?? []).join(", ") || "Not set"}</Text>
        )}
        <Text style={styles.label}>Limits notes</Text>
        {editing ? (
          <TextInput
            style={[styles.input, styles.textArea]}
            value={limitsNotes}
            onChangeText={setLimitsNotes}
            multiline
          />
        ) : (
          <Text style={styles.value}>{profile?.limitsNotes ?? "Not set"}</Text>
        )}
        {editing && (
          <Pressable style={styles.button} onPress={saveProfile}>
            <Text style={styles.buttonText}>Save Profile</Text>
          </Pressable>
        )}
        <Text style={styles.label}>Verified</Text>
        <Text style={styles.value}>{profile?.verified ? "Yes" : "No"}</Text>
        <Text style={styles.label}>Verification status</Text>
        <Text style={styles.value}>{verification?.status ?? "not_started"}</Text>
        <Pressable style={styles.secondaryButton} onPress={startVerification}>
          <Text style={styles.secondaryText}>Start verification</Text>
        </Pressable>
        <Text style={styles.label}>User ID</Text>
        <Text style={styles.value}>{userId}</Text>
        <Text style={styles.label}>Credits</Text>
        <Text style={styles.value}>{credits}</Text>
        <Text style={styles.helper}>Simulated in-app purchase (placeholder).</Text>
        <View style={styles.creditRow}>
          {[5, 15, 30].map((amount) => (
            <Pressable
              key={amount}
              style={styles.creditButton}
              onPress={() => purchaseCredits(amount)}
            >
              <Text style={styles.creditText}>+{amount}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.secondaryButton} onPress={addCredits}>
          <Text style={styles.secondaryText}>Quick add 5 credits</Text>
        </Pressable>
        <Text style={styles.label}>Subscription</Text>
        <Text style={styles.value}>{isSubscriber ? "Active" : "Not active"}</Text>
        <Text style={styles.helper}>Weekly credits: {subscription?.weeklyCredits ?? 0}</Text>
        <Text style={styles.helper}>Next credit drop: {nextCreditDate}</Text>
        <Text style={styles.helper}>Boosts available: {subscription?.boostBalance ?? 0}</Text>
        <View style={styles.subscriptionRow}>
          {isSubscriber ? (
            <Pressable style={styles.secondaryButton} onPress={cancelSubscription}>
              <Text style={styles.secondaryText}>Cancel subscription</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.button} onPress={startSubscription}>
              <Text style={styles.buttonText}>Start subscription</Text>
            </Pressable>
          )}
        </View>
        <Pressable style={styles.secondaryButton} onPress={useBoost}>
          <Text style={styles.secondaryText}>{boostActive ? "Boost active" : "Boost profile"}</Text>
        </Pressable>
        {__DEV__ ? (
          <>
            <Text style={styles.label}>Admin</Text>
            <Pressable style={styles.secondaryButton} onPress={reseedProfiles}>
              <Text style={styles.secondaryText}>Reseed demo profiles</Text>
            </Pressable>
          </>
        ) : null}
        <Text style={styles.label}>Blocked users</Text>
        {blocked.length === 0 ? (
          <Text style={styles.value}>None</Text>
        ) : (
          blocked.map((blockedId) => (
            <View key={blockedId} style={styles.blockRow}>
              <Text style={styles.blockedText}>{blockedId}</Text>
              <Pressable style={styles.unblockButton} onPress={() => unblockUser(blockedId)}>
                <Text style={styles.unblockText}>Unblock</Text>
              </Pressable>
            </View>
          ))
        )}
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
  backgroundImage: {
    opacity: 0.85
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(14, 10, 14, 0.25)"
  },
  safeArea: {
    flex: 1
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 48,
    paddingHorizontal: 20,
    flexGrow: 1
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff7f5",
    marginTop: 16,
    marginBottom: 16,
    fontFamily: "PlayfairDisplay_600SemiBold"
  },
  card: {
    backgroundColor: "rgba(18, 12, 20, 0.8)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    padding: 20
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  sectionTitle: {
    fontWeight: "700",
    color: "#fff7f5"
  },
  link: {
    color: "#ffd7ea",
    fontWeight: "600"
  },
  label: {
    fontSize: 12,
    color: "#f2d6e6",
    textTransform: "uppercase",
    marginTop: 8
  },
  helper: {
    color: "#f0dbe5",
    fontSize: 12
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff7f5",
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#fff7f5"
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top"
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  roleChip: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  roleChipActive: {
    backgroundColor: "rgba(255, 92, 143, 0.34)"
  },
  roleChipText: {
    fontSize: 12,
    color: "#fff7f5",
    fontWeight: "600"
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6
  },
  chip: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  chipActive: {
    backgroundColor: "rgba(255, 92, 143, 0.34)"
  },
  chipText: {
    fontSize: 11,
    color: "#fff7f5",
    fontWeight: "600"
  },
  button: {
    backgroundColor: "#7b5146",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600"
  },
  creditRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8
  },
  creditButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center"
  },
  creditText: {
    color: "#fff7f5",
    fontWeight: "600"
  },
  secondaryButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center"
  },
  subscriptionRow: {
    marginTop: 6
  },
  secondaryText: {
    color: "#fff7f5",
    fontWeight: "600"
  },
  blockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  blockedText: {
    color: "#fff7f5",
    fontWeight: "600"
  },
  unblockButton: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  unblockText: {
    color: "#fff7f5",
    fontWeight: "600",
    fontSize: 12
  },
  photoUploadRow: {
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    marginBottom: 4
  },
  photoPreview: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)"
  },
  uploadButton: {
    backgroundColor: "#7b5146",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 12
  },
  uploadButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13
  }
});
