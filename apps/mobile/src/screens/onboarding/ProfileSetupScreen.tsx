import { useState } from "react";
import {
  Alert,
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
import { api } from "../../api/client";
import { getProfileImage, profileImageKeys } from "../../assets/profileImages";

type Role = "dom" | "sub" | "switch" | "exploring";

type Props = {
  userId: string;
  role: Role;
  onComplete: () => void;
};

export default function ProfileSetupScreen({ userId, role, onComplete }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("21");
  const [bio, setBio] = useState("");
  const [intent, setIntent] = useState<"play_only" | "relationship" | "exploring">("exploring");
  const [photoKey, setPhotoKey] = useState(profileImageKeys[0]);
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<"new" | "some" | "experienced">("new");
  const [aftercare, setAftercare] = useState<"light" | "medium" | "high">("medium");
  const [sceneTypes, setSceneTypes] = useState<string[]>([]);
  const [hardLimits, setHardLimits] = useState<string[]>([]);
  const [kinkTags, setKinkTags] = useState<string[]>([]);
  const [safeword, setSafeword] = useState("");
  const [boundaries, setBoundaries] = useState("");
  const [relationshipStyle, setRelationshipStyle] = useState<
    "monogamous" | "open" | "poly" | "kink_only" | "casual"
  >("casual");
  const [availability, setAvailability] = useState<"weeknights" | "weekends" | "flexible">("flexible");
  const [playLocation, setPlayLocation] = useState<"private" | "club" | "outdoors" | "travel">("private");
  const [aftercarePreferences, setAftercarePreferences] = useState<string[]>([]);
  const [aftercareNotes, setAftercareNotes] = useState("");
  const [softLimits, setSoftLimits] = useState<string[]>([]);
  const [limitsNotes, setLimitsNotes] = useState("");

  const toggleValue = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const saveProfile = async () => {
    const parsedAge = Number(age);
    if (!displayName.trim() || Number.isNaN(parsedAge) || parsedAge < 21) {
      Alert.alert("Check your info", "Enter a display name and age 21+.");
      return;
    }

    try {
      const payload = {
        id: userId,
        displayName: displayName.trim(),
        age: parsedAge,
        role,
        bio: bio.trim(),
        verified: false,
        intent,
        photoKey,
        photoKeys: photoKey ? [photoKey] : undefined,
        state: state.trim().toUpperCase() || undefined,
        zip: zip.trim() || undefined,
        experienceLevel,
        aftercare,
        sceneTypes,
        hardLimits,
        kinkTags,
        safeword: safeword.trim() || undefined,
        boundaries: boundaries.trim() || undefined,
        relationshipStyle,
        availability,
        playLocation,
        aftercarePreferences,
        aftercareNotes: aftercareNotes.trim() || undefined,
        softLimits,
        limitsNotes: limitsNotes.trim() || undefined
      };
      try {
        await api.updateProfile(userId, payload);
      } catch (error) {
        await api.createProfile(payload);
      }
      onComplete();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "";
      Alert.alert("Profile error", message || "Unable to save profile.");
    }
  };

  return (
    <ImageBackground
      source={require("../../../assets/images/pexels-bedbible-12109316.jpg")}
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
          nestedScrollEnabled
        >
        <View style={styles.card}>
          <Text style={styles.title}>Set up your profile</Text>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Name shown to others"
          />
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            value={age}
            keyboardType="number-pad"
            onChangeText={setAge}
          />
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="What should matches know about you?"
            multiline
          />
          <Text style={styles.label}>Intent</Text>
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
          <Text style={styles.label}>Choose a photo</Text>
          <View style={styles.photoRow}>
            {profileImageKeys.map((key) => (
              <Pressable
                key={key}
                style={[styles.photoChip, photoKey === key && styles.photoChipActive]}
                onPress={() => setPhotoKey(key)}
              >
                <Image source={getProfileImage(key)} style={styles.photoImage} />
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>State</Text>
          <TextInput
            style={styles.input}
            value={state}
            onChangeText={setState}
            placeholder="State (e.g., CA)"
            autoCapitalize="characters"
          />
          <Text style={styles.label}>ZIP code</Text>
          <TextInput
            style={styles.input}
            value={zip}
            onChangeText={setZip}
            placeholder="ZIP"
            keyboardType="number-pad"
          />
          <Text style={styles.label}>Experience</Text>
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
          <Text style={styles.label}>Aftercare</Text>
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
          <Text style={styles.label}>Scene types</Text>
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
          <Text style={styles.label}>Hard limits</Text>
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
          <Text style={styles.label}>Kink tags</Text>
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
          <Text style={styles.label}>Safeword</Text>
          <TextInput
            style={styles.input}
            value={safeword}
            onChangeText={setSafeword}
            placeholder="Optional"
          />
          <Text style={styles.label}>Boundaries</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={boundaries}
            onChangeText={setBoundaries}
            placeholder="Share important boundaries"
            multiline
          />
          <Text style={styles.label}>Relationship style</Text>
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
          <Text style={styles.label}>Availability</Text>
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
          <Text style={styles.label}>Play location</Text>
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
          <Text style={styles.label}>Aftercare preferences</Text>
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
          <Text style={styles.label}>Aftercare notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={aftercareNotes}
            onChangeText={setAftercareNotes}
            placeholder="Anything else you need after a scene?"
            multiline
          />
          <Text style={styles.label}>Soft limits</Text>
          <View style={styles.chipRow}>
            {(["public", "photography", "marks", "roleplay"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.chip, softLimits.includes(item) && styles.chipActive]}
                onPress={() => toggleValue(item, softLimits, setSoftLimits)}
              >
                <Text style={styles.chipText}>{item.replace("_", " ").toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Limits notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={limitsNotes}
            onChangeText={setLimitsNotes}
            placeholder="Explain your limits or conditions"
            multiline
          />
          <Pressable style={styles.button} onPress={saveProfile}>
            <Text style={styles.buttonText}>Finish</Text>
          </Pressable>
        </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 8, 12, 0.2)"
  },
  backgroundImage: {
    opacity: 0.95
  },
  safeArea: {
    flex: 1
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
    flexGrow: 1,
    justifyContent: "center"
  },
  card: {
    backgroundColor: "rgba(255, 250, 245, 0.82)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ead9cd",
    padding: 24
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2b1b12",
    marginBottom: 12
  },
  label: {
    fontSize: 12,
    color: "#6b5142",
    textTransform: "uppercase",
    marginTop: 8
  },
  input: {
    borderWidth: 1,
    borderColor: "#d8c6b9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff"
  },
  textArea: {
    height: 90,
    textAlignVertical: "top"
  },
  button: {
    marginTop: 16,
    backgroundColor: "#7b5146",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
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
    borderColor: "#ead9cd",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  chipActive: {
    backgroundColor: "#ead9cd"
  },
  chipText: {
    fontSize: 11,
    color: "#2b1b12",
    fontWeight: "600"
  },
  photoRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6
  },
  photoChip: {
    borderWidth: 1,
    borderColor: "#ead9cd",
    borderRadius: 12,
    padding: 4
  },
  photoChipActive: {
    borderColor: "#7b5146"
  },
  photoImage: {
    width: 64,
    height: 64,
    borderRadius: 10
  }
});
