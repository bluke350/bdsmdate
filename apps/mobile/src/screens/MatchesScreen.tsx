import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { api, Match, Profile } from "../api/client";
import { getProfileImage } from "../assets/profileImages";

type Props = {
  userId: string;
};

export default function MatchesScreen({ userId }: Props) {
  const navigation = useNavigation();
  const activeMatchKey = "activeMatchId";
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await api.getMatches(userId);
        setMatches(response.matches);
        const lookup: Record<string, Profile> = {};
        await Promise.all(
          response.matches.map(async (match) => {
            const otherId = match.userId === userId ? match.matchedUserId : match.userId;
            try {
              const profile = await api.getProfile(otherId);
              lookup[otherId] = profile;
            } catch (error) {
              console.error(error);
            }
          })
        );
        setProfiles(lookup);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  return (
    <ImageBackground
      source={require("../../assets/images/pexels-31299941-8587259.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Matches</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#7b5146" />
      ) : matches.length === 0 ? (
        <Text style={styles.empty}>No matches yet.</Text>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const otherId = item.userId === userId ? item.matchedUserId : item.userId;
            return (
              <Pressable
                style={styles.card}
                onPress={() => navigation.navigate("ProfileDetail" as never, { profileId: otherId, viewerId: userId } as never)}
              >
                <View style={styles.row}>
                  <Image source={getProfileImage(profiles[otherId]?.photoKey)} style={styles.avatar} />
                  <View style={styles.nameColumn}>
                    <Text style={styles.name}>{profiles[otherId]?.displayName ?? otherId}</Text>
                    <Text style={styles.meta}>Matched {new Date(item.matchedAt).toLocaleDateString()}</Text>
                  </View>
                  {profiles[otherId]?.verified ? <Text style={styles.badge}>Verified</Text> : null}
                </View>
                <Pressable
                  style={styles.messageButton}
                  onPress={async () => {
                    await AsyncStorage.setItem(activeMatchKey, otherId);
                    navigation.navigate("Messages" as never);
                  }}
                >
                  <Text style={styles.messageText}>Message</Text>
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}
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
    backgroundColor: "rgba(12, 10, 16, 0.7)",
    paddingHorizontal: 20
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff7f5",
    marginTop: 16,
    marginBottom: 16,
    fontFamily: "PlayfairDisplay_600SemiBold",
    textAlign: "center",
    letterSpacing: 0.6
  },
  empty: {
    color: "#fff7f5"
  },
  card: {
    backgroundColor: "rgba(18, 12, 20, 0.78)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    padding: 16,
    marginBottom: 12
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22
  },
  nameColumn: {
    flex: 1,
    marginLeft: 12
  },
  name: {
    fontWeight: "700",
    color: "#fff7f5"
  },
  badge: {
    fontSize: 12,
    color: "#ffd7ea",
    fontWeight: "600"
  },
  meta: {
    marginTop: 4,
    color: "#e7cddd"
  },
  messageButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  messageText: {
    color: "#fff7f5",
    fontWeight: "600",
    fontSize: 12
  }
});
