import { useEffect, useState } from "react";
import { Alert, ActivityIndicator, Image, ImageBackground, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api, Profile } from "../api/client";
import { RootStackParamList } from "../navigation/types";
import { getProfileImages } from "../assets/profileImages";

type Props = NativeStackScreenProps<RootStackParamList, "ProfileDetail">;

export default function ProfileDetailScreen({ route }: Props) {
  const { profileId, viewerId } = route.params;
  const navigation = useNavigation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const activeMatchKey = "activeMatchId";
  const pendingMessageKey = "pendingMessage";

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await api.getProfile(profileId);
        setProfile(response);
      } catch (error) {
        console.error(error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [profileId]);

  const reportProfile = async () => {
    try {
      await api.reportUser(viewerId, profileId, "Profile review requested");
      Alert.alert("Report sent", "Thanks for helping keep the community safe.");
    } catch (error) {
      console.error(error);
      Alert.alert("Report error", "Unable to send report.");
    }
  };

  const blockProfile = async () => {
    try {
      await api.blockUser(viewerId, profileId);
      Alert.alert("Blocked", "You will no longer see this profile.");
    } catch (error) {
      console.error(error);
      Alert.alert("Block error", "Unable to block user.");
    }
  };

  const quickLike = async () => {
    try {
      const response = await api.like(viewerId, profileId);
      if (response.matched) {
        Alert.alert("It's a match", "You can now message using credits.");
        await AsyncStorage.setItem(activeMatchKey, profileId);
        navigation.navigate("Messages" as never);
        return;
      }
      Alert.alert("Like sent", "We'll let you know if they match.");
    } catch (error) {
      console.error(error);
      Alert.alert("Like error", "Unable to send like.");
    }
  };

  const sendIcebreaker = async () => {
    try {
      const response = await api.getIcebreakers(viewerId, profileId);
      const prompt = response.prompts[0] ?? "Hi! I'd love to connect.";
      await AsyncStorage.setItem(activeMatchKey, profileId);
      await AsyncStorage.setItem(pendingMessageKey, prompt);
      navigation.navigate("Messages" as never);
    } catch (error) {
      console.error(error);
      Alert.alert("Icebreaker error", "Unable to load icebreakers.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#7b5146" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.empty}>Profile not available.</Text>
      </SafeAreaView>
    );
  }

  return (
    <ImageBackground
      source={require("../../assets/images/pexels-31299941-8587259.jpg")}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
    <View style={styles.overlay} pointerEvents="none" />
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryRow}>
          {getProfileImages(profile.photoKeys ?? (profile.photoKey ? [profile.photoKey] : undefined)).map((source, index) => (
            <Image key={`${profile.id}-photo-${index}`} source={source} style={styles.profileImage} />
          ))}
        </ScrollView>
        <Text style={styles.title}>{profile.displayName}</Text>
        <Text style={styles.meta}>{profile.age} · {profile.role.toUpperCase()}</Text>
        <Text style={styles.bio}>{profile.bio}</Text>
        <View style={styles.chipRow}>
          {(profile.kinkTags ?? []).map((tag) => (
            <View key={tag} style={styles.chip}>
              <Text style={styles.chipText}>{tag.toUpperCase()}</Text>
            </View>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection</Text>
          <Text style={styles.value}>Relationship: {profile.relationshipStyle?.replace("_", " ") ?? "Not set"}</Text>
          <Text style={styles.value}>Availability: {profile.availability?.replace("_", " ") ?? "Not set"}</Text>
          <Text style={styles.value}>Play location: {profile.playLocation ?? "Not set"}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consent & care</Text>
          <Text style={styles.value}>Safeword: {profile.safeword || "Not shared"}</Text>
          <Text style={styles.value}>Boundaries: {profile.boundaries || "Not shared"}</Text>
          <Text style={styles.value}>Hard limits: {(profile.hardLimits ?? []).join(", ") || "Not shared"}</Text>
          <Text style={styles.value}>Soft limits: {(profile.softLimits ?? []).join(", ") || "Not shared"}</Text>
          <Text style={styles.value}>Aftercare: {profile.aftercare ?? "Not set"}</Text>
          <Text style={styles.value}>Aftercare prefs: {(profile.aftercarePreferences ?? []).join(", ") || "Not shared"}</Text>
          <Text style={styles.value}>Aftercare notes: {profile.aftercareNotes || "Not shared"}</Text>
          <Text style={styles.value}>Limits notes: {profile.limitsNotes || "Not shared"}</Text>
        </View>
        <View style={styles.actionRow}>
          <Pressable style={styles.actionButton} onPress={quickLike}>
            <Text style={styles.actionText}>Quick like</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={sendIcebreaker}>
            <Text style={styles.actionText}>Send icebreaker</Text>
          </Pressable>
        </View>
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, styles.primaryButton]}
            onPress={async () => {
              await AsyncStorage.setItem(activeMatchKey, profileId);
              navigation.navigate("Messages" as never);
            }}
          >
            <Text style={[styles.actionText, styles.primaryText]}>Message</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={reportProfile}>
            <Text style={styles.actionText}>Report</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={blockProfile}>
            <Text style={styles.actionText}>Block</Text>
          </Pressable>
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
    backgroundColor: "rgba(14, 10, 14, 0.35)"
  },
  safeArea: {
    flex: 1
  },
  container: {
    flex: 1,
    backgroundColor: "rgba(14, 10, 14, 0.68)",
    paddingHorizontal: 20
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40
  },
  profileImage: {
    width: 280,
    height: 220,
    borderRadius: 18,
    marginTop: 12,
    marginBottom: 8,
    marginRight: 12
  },
  galleryRow: {
    marginTop: 12
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff7f5",
    marginTop: 16,
    fontFamily: "PlayfairDisplay_600SemiBold"
  },
  meta: {
    color: "#f0dbe5",
    marginTop: 4
  },
  bio: {
    marginTop: 12,
    color: "#fff1f6",
    lineHeight: 20
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  chip: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  chipText: {
    fontSize: 10,
    color: "#fff7f5",
    fontWeight: "600"
  },
  section: {
    marginTop: 16,
    backgroundColor: "rgba(18, 12, 20, 0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    padding: 14
  },
  sectionTitle: {
    fontWeight: "700",
    color: "#fff7f5",
    marginBottom: 8
  },
  value: {
    color: "#fff1f6",
    marginBottom: 4
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  },
  primaryButton: {
    backgroundColor: "#7b5146",
    borderColor: "#7b5146"
  },
  actionText: {
    color: "#fff7f5",
    fontWeight: "600"
  },
  primaryText: {
    color: "#fff"
  },
  empty: {
    marginTop: 24,
    color: "#fff7f5",
    textAlign: "center"
  }
});
