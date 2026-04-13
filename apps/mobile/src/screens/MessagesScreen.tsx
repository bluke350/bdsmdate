import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { api, ConsentStatus, Match, Message, Profile } from "../api/client";
import { getProfileImage } from "../assets/profileImages";

type Props = {
  userId: string;
};

export default function MessagesScreen({ userId }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [blocked, setBlocked] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [consent, setConsent] = useState<ConsentStatus | null>(null);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const [priority, setPriority] = useState(false);
  const [aftercareChecklist, setAftercareChecklist] = useState<string[]>([
    "Hydration",
    "Check-in text",
    "Snacks",
    "Warm blanket",
    "Quiet time"
  ]);
  const [aftercareSelected, setAftercareSelected] = useState<string[]>([]);
  const activeMatchKey = "activeMatchId";
  const pendingMessageKey = "pendingMessage";

  const loadCredits = async () => {
    try {
      const response = await api.getCredits(userId);
      setCredits(response.credits);
    } catch (error) {
      console.error(error);
    }
  };

  const activeMatch = useMemo(() => {
    if (!selectedId) {
      return null;
    }
    return matches.find(
      (match) => match.userId === selectedId || match.matchedUserId === selectedId
    );
  }, [matches, selectedId]);

  useEffect(() => {
    const loadMatches = async () => {
      const response = await api.getMatches(userId);
      setMatches(response.matches);
      if (pendingMatchId) {
        const match = response.matches.find((item) =>
          item.userId === pendingMatchId || item.matchedUserId === pendingMatchId
        );
        if (match) {
          setSelectedId(pendingMatchId);
          setPendingMatchId(null);
          await AsyncStorage.removeItem(activeMatchKey);
        }
      } else if (response.matches.length > 0 && !selectedId) {
        const otherId = response.matches[0].userId === userId
          ? response.matches[0].matchedUserId
          : response.matches[0].userId;
        setSelectedId(otherId);
      }
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
      try {
        const profile = await api.getProfile(userId);
        setViewerProfile(profile);
      } catch (error) {
        console.error(error);
      }
    };

    loadMatches();
  }, [userId, pendingMatchId, selectedId]);

  useFocusEffect(() => {
    let active = true;
    const readPending = async () => {
      try {
        const stored = await AsyncStorage.getItem(activeMatchKey);
        const draft = await AsyncStorage.getItem(pendingMessageKey);
        if (active && stored) {
          setPendingMatchId(stored);
        }
        if (active && draft) {
          setText(draft);
          await AsyncStorage.removeItem(pendingMessageKey);
        }
      } catch (error) {
        console.error(error);
      }
    };
    readPending();
    return () => {
      active = false;
    };
  });

  useEffect(() => {
    loadCredits();
  }, [userId]);

  useEffect(() => {
    const loadThread = async () => {
      if (!selectedId) {
        setMessages([]);
        return;
      }
      const response = await api.getThread(userId, selectedId);
      setMessages(response.messages);
    };

    loadThread();
  }, [userId, selectedId]);

  useEffect(() => {
    const loadConsent = async () => {
      if (!selectedId) {
        setConsent(null);
        setChecklist([]);
        return;
      }
      try {
        const response = await api.getConsent(userId, selectedId);
        setConsent(response);
        setChecklist(response.checklist.length > 0 ? response.checklist : [
          "Discuss hard limits",
          "Confirm safeword",
          "Agree on aftercare",
          "Share health considerations",
          "Set scene expectations"
        ]);
      } catch (error) {
        console.error(error);
      }
    };

    loadConsent();
  }, [userId, selectedId]);

  useEffect(() => {
    const loadIcebreakers = async () => {
      if (!selectedId) {
        setIcebreakers([]);
        return;
      }
      try {
        const response = await api.getIcebreakers(userId, selectedId);
        setIcebreakers(response.prompts);
      } catch (error) {
        console.error(error);
      }
    };

    loadIcebreakers();
  }, [userId, selectedId]);

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

  const sendMessage = async () => {
    if (!selectedId || !text.trim()) {
      return;
    }
    const cost = priority ? 2 : 1;
    if (credits !== null && credits < cost) {
      Alert.alert("Out of credits", `Add credits to send ${priority ? "priority" : "messages"}.`);
      return;
    }
    try {
      const response = await api.sendMessage(userId, selectedId, text.trim(), priority);
      setMessages((prev) => [...prev, response.message]);
      setText("");
      setPriority(false);
      setCredits(response.remainingCredits);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "";
      if (message.includes("Consent checklist required")) {
        Alert.alert("Consent required", "Complete the consent checklist to unlock messaging.");
        return;
      }
      Alert.alert("Credits required", "Add credits to send messages.");
      loadCredits();
    }
  };

  const toggleChecklistItem = (item: string) => {
    setChecklist((prev) =>
      prev.includes(item) ? prev.filter((entry) => entry !== item) : [...prev, item]
    );
  };

  const toggleAftercare = (item: string) => {
    setAftercareSelected((prev) =>
      prev.includes(item) ? prev.filter((entry) => entry !== item) : [...prev, item]
    );
  };

  const shareAftercare = () => {
    if (!selectedId) {
      return;
    }
    if (aftercareSelected.length === 0) {
      Alert.alert("Aftercare", "Select at least one expectation to share.");
      return;
    }
    const message = `Aftercare expectations: ${aftercareSelected.join(", ")}.`;
    setText(message);
  };

  const shareConsent = async () => {
    if (!selectedId) {
      return;
    }
    try {
      const response = await api.setConsent(userId, selectedId, checklist);
      setConsent(response);
      Alert.alert("Consent shared", "Your checklist is saved. Waiting on your match.");
    } catch (error) {
      console.error(error);
      Alert.alert("Consent error", "Unable to save checklist.");
    }
  };

  const sendReport = async () => {
    if (!selectedId || !reportReason.trim()) {
      Alert.alert("Report", "Add a reason before sending a report.");
      return;
    }
    try {
      await api.reportUser(userId, selectedId, reportReason.trim());
      setReportReason("");
      Alert.alert("Report sent", "Thanks for helping keep the community safe.");
    } catch (error) {
      console.error(error);
      Alert.alert("Report error", "Unable to send report.");
    }
  };

  const blockUser = async () => {
    if (!selectedId) {
      return;
    }
    try {
      await api.blockUser(userId, selectedId);
      setBlocked((prev) => [...prev, selectedId]);
      Alert.alert("Blocked", "You will no longer see this user.");
    } catch (error) {
      console.error(error);
      Alert.alert("Block error", "Unable to block user.");
    }
  };

  const consentBanner = () => {
    if (!selectedId) {
      return null;
    }
    const youAgreed = consent?.statuses[userId]?.agreed ?? false;
    const matchAgreed = selectedId ? consent?.statuses[selectedId]?.agreed ?? false : false;
    if (!consent) {
      return { text: "Consent checklist not started yet.", variant: "pending" };
    }
    if (youAgreed && matchAgreed) {
      return { text: "Consent confirmed. You can chat safely.", variant: "ready" };
    }
    if (youAgreed) {
      return { text: "Waiting on your match to confirm consent.", variant: "pending" };
    }
    return { text: "Confirm consent before meeting.", variant: "pending" };
  };

  const negotiationCards = [
    { title: "Scene goals", prompt: "What do you want to feel during a scene?" },
    { title: "Limits check", prompt: "Any hard limits we should know?" },
    { title: "Safeword", prompt: "What safeword do you prefer?" },
    { title: "Aftercare", prompt: "What aftercare helps you feel grounded?" }
  ];

  return (
    <ImageBackground
      source={require("../../assets/images/cord-allman-OIRkQruBw9U-unsplash.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Messages</Text>
      <View style={styles.row}>
        <View style={styles.matchList}>
          <Text style={styles.section}>Matches</Text>
          <FlatList
            data={matches}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const otherId = item.userId === userId ? item.matchedUserId : item.userId;
              const active = otherId === selectedId;
              return (
                <Pressable onPress={() => setSelectedId(otherId)} style={[styles.matchItem, active && styles.matchActive]}>
                  <View style={styles.matchRow}>
                    <View style={styles.matchIdentity}>
                      <Image source={getProfileImage(profiles[otherId]?.photoKey)} style={styles.matchAvatar} />
                      <Text style={styles.matchName}>{profiles[otherId]?.displayName ?? otherId}</Text>
                    </View>
                    {profiles[otherId]?.verified ? <Text style={styles.badge}>Verified</Text> : null}
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
        <View style={styles.thread}>
          <View style={styles.threadHeader}>
            <Text style={styles.section}>Thread</Text>
            {selectedId ? (
              <View style={styles.threadIdentity}>
                <Image source={getProfileImage(profiles[selectedId]?.photoKey)} style={styles.threadAvatar} />
                <Text style={styles.threadUser}>{profiles[selectedId]?.displayName ?? selectedId}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.creditRow}>
            <View style={styles.creditPill}>
              <Text style={styles.creditText}>{credits ?? "--"}</Text>
            </View>
            <Text style={styles.creditLabel}>credits · 1 per message · 2 priority</Text>
            <Pressable style={styles.creditRefresh} onPress={loadCredits}>
              <Text style={styles.creditRefreshText}>Refresh</Text>
            </Pressable>
          </View>
          {activeMatch ? (
            <>
              {consentBanner() ? (
                <View
                  style={[
                    styles.consentBanner,
                    consentBanner()?.variant === "ready" && styles.consentBannerReady
                  ]}
                >
                  <Text style={styles.consentBannerText}>{consentBanner()?.text}</Text>
                </View>
              ) : null}
              <View style={styles.safetyBanner}>
                <Text style={styles.safetyText}>Safety tip: Agree on limits, safeword, and aftercare before meeting.</Text>
              </View>
              <View style={styles.negotiationCard}>
                <Text style={styles.section}>Scene negotiation</Text>
                <View style={styles.negotiationRow}>
                  {negotiationCards.map((card) => (
                    <Pressable key={card.title} style={styles.negotiationChip} onPress={() => setText(card.prompt)}>
                      <Text style={styles.negotiationTitle}>{card.title}</Text>
                      <Text style={styles.negotiationText}>{card.prompt}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.consentCard}>
                <Text style={styles.section}>Consent checklist</Text>
                {checklist.map((item) => (
                  <Pressable
                    key={item}
                    style={styles.consentRow}
                    onPress={() => toggleChecklistItem(item)}
                  >
                    <View style={[styles.checkbox, checklist.includes(item) && styles.checkboxActive]} />
                    <Text style={styles.consentText}>{item}</Text>
                  </Pressable>
                ))}
                <View style={styles.consentStatusRow}>
                  <Text style={styles.consentStatus}>You: {consent?.statuses[userId]?.agreed ? "Done" : "Pending"}</Text>
                  <Text style={styles.consentStatus}>Match: {selectedId && consent?.statuses[selectedId]?.agreed ? "Done" : "Pending"}</Text>
                </View>
                <Pressable style={styles.consentButton} onPress={shareConsent}>
                  <Text style={styles.consentButtonText}>Share checklist</Text>
                </Pressable>
              </View>
              <View style={styles.aftercareCard}>
                <Text style={styles.section}>Aftercare expectations</Text>
                {aftercareChecklist.map((item) => (
                  <Pressable
                    key={item}
                    style={styles.consentRow}
                    onPress={() => toggleAftercare(item)}
                  >
                    <View style={[styles.checkbox, aftercareSelected.includes(item) && styles.checkboxActive]} />
                    <Text style={styles.consentText}>{item}</Text>
                  </Pressable>
                ))}
                <Pressable style={styles.consentButton} onPress={shareAftercare}>
                  <Text style={styles.consentButtonText}>Share aftercare expectations</Text>
                </Pressable>
              </View>
              {icebreakers.length > 0 ? (
                <View style={styles.icebreakerCard}>
                  <Text style={styles.section}>Icebreakers</Text>
                  <View style={styles.icebreakerRow}>
                    {icebreakers.map((prompt) => (
                      <Pressable key={prompt} style={styles.icebreakerChip} onPress={() => setText(prompt)}>
                        <Text style={styles.icebreakerText}>{prompt}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
              {blocked.includes(selectedId ?? "") ? (
                <Text style={styles.empty}>This user is blocked.</Text>
              ) : null}
              <FlatList
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.bubbleRow,
                      item.fromUserId === userId ? styles.bubbleRowOutgoing : styles.bubbleRowIncoming
                    ]}
                  >
                    <Image
                      source={
                        item.fromUserId === userId
                          ? getProfileImage(viewerProfile?.photoKey)
                          : getProfileImage(profiles[item.fromUserId]?.photoKey)
                      }
                      style={styles.bubbleAvatar}
                    />
                    <View
                      style={[
                        styles.bubble,
                        item.fromUserId === userId ? styles.outgoing : styles.incoming
                      ]}
                    >
                      {item.priority ? (
                        <Text style={styles.priorityBadge}>Priority</Text>
                      ) : null}
                      <Text style={styles.messageText}>{item.body}</Text>
                    </View>
                  </View>
                )}
              />
              <View style={styles.inputRow}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Send a message"
                  style={styles.input}
                  placeholderTextColor="#f0dbe5"
                />
                <Pressable
                  style={[styles.priorityToggle, priority && styles.priorityToggleActive]}
                  onPress={() => setPriority((prev) => !prev)}
                >
                  <Text style={styles.priorityToggleText}>Priority</Text>
                </Pressable>
                <Pressable style={[styles.send, credits === 0 && styles.sendDisabled]} onPress={sendMessage}>
                  <Text style={styles.sendText}>Send</Text>
                </Pressable>
              </View>
              <View style={styles.reportRow}>
                <TextInput
                  value={reportReason}
                  onChangeText={setReportReason}
                  placeholder="Report reason"
                  style={styles.reportInput}
                  placeholderTextColor="#f0dbe5"
                />
                <Pressable style={styles.reportButton} onPress={sendReport}>
                  <Text style={styles.reportText}>Report</Text>
                </Pressable>
              </View>
              <Pressable style={styles.blockButton} onPress={blockUser}>
                <Text style={styles.blockText}>Block user</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.empty}>Match with someone to chat.</Text>
          )}
        </View>
      </View>
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
    backgroundColor: "rgba(10, 8, 12, 0.72)",
    paddingHorizontal: 16
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff7f5",
    marginTop: 16,
    marginBottom: 12,
    fontFamily: "PlayfairDisplay_600SemiBold",
    textAlign: "center",
    letterSpacing: 0.6
  },
  row: {
    flex: 1,
    flexDirection: "row",
    gap: 12
  },
  matchList: {
    width: 120,
    backgroundColor: "rgba(18, 12, 20, 0.78)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    padding: 12
  },
  thread: {
    flex: 1,
    backgroundColor: "rgba(18, 12, 20, 0.78)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    padding: 12
  },
  threadHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  consentBanner: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8
  },
  consentBannerReady: {
    backgroundColor: "rgba(92, 222, 178, 0.25)"
  },
  consentBannerText: {
    color: "#fff7f5",
    fontSize: 12
  },
  creditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8
  },
  creditPill: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  creditText: {
    color: "#fff7f5",
    fontWeight: "700",
    fontSize: 12
  },
  creditLabel: {
    fontSize: 11,
    color: "#f0dbe5"
  },
  creditRefresh: {
    marginLeft: "auto",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  creditRefreshText: {
    fontSize: 11,
    color: "#fff7f5",
    fontWeight: "600"
  },
  threadUser: {
    fontSize: 12,
    color: "#f0dbe5"
  },
  section: {
    fontWeight: "600",
    marginBottom: 8,
    color: "#fff7f5"
  },
  matchItem: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8
  },
  matchActive: {
    backgroundColor: "rgba(255, 92, 143, 0.34)"
  },
  matchName: {
    color: "#fff7f5",
    fontSize: 12
  },
  matchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  matchIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  matchAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14
  },
  badge: {
    fontSize: 10,
    color: "#ffd7ea",
    fontWeight: "600"
  },
  threadIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  threadAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 8
  },
  bubbleRowIncoming: {
    alignSelf: "flex-start"
  },
  bubbleRowOutgoing: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse"
  },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14
  },
  bubble: {
    padding: 10,
    borderRadius: 12,
    maxWidth: "80%"
  },
  outgoing: {
    alignSelf: "flex-end",
    backgroundColor: "#7b5146"
  },
  incoming: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.16)"
  },
  messageText: {
    color: "#fff7f5"
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8
  },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#fff7f5"
  },
  reportInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#fff7f5"
  },
  reportButton: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10
  },
  reportText: {
    color: "#fff7f5",
    fontWeight: "600"
  },
  safetyBanner: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8
  },
  safetyText: {
    color: "#fff7f5",
    fontSize: 12
  },
  consentCard: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 4
  },
  checkboxActive: {
    backgroundColor: "rgba(255, 92, 143, 0.6)",
    borderColor: "rgba(255, 92, 143, 0.8)"
  },
  consentText: {
    color: "#fff7f5",
    fontSize: 12,
    flex: 1
  },
  consentStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 8
  },
  consentStatus: {
    color: "#f0dbe5",
    fontSize: 11
  },
  consentButton: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center"
  },
  consentButtonText: {
    color: "#fff7f5",
    fontWeight: "600",
    fontSize: 12
  },
  icebreakerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10
  },
  icebreakerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  icebreakerChip: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  icebreakerText: {
    color: "#fff7f5",
    fontSize: 11
  },
  negotiationCard: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10
  },
  negotiationRow: {
    gap: 8
  },
  negotiationChip: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 10
  },
  negotiationTitle: {
    color: "#fff7f5",
    fontWeight: "700",
    marginBottom: 2,
    fontSize: 12
  },
  negotiationText: {
    color: "#f0dbe5",
    fontSize: 11
  },
  aftercareCard: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10
  },
  blockButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center"
  },
  blockText: {
    color: "#fff7f5",
    fontWeight: "600"
  },
  send: {
    backgroundColor: "#7b5146",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10
  },
  priorityToggle: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10
  },
  priorityToggleActive: {
    backgroundColor: "rgba(255, 92, 143, 0.35)"
  },
  priorityToggleText: {
    color: "#fff7f5",
    fontWeight: "600",
    fontSize: 11
  },
  priorityBadge: {
    color: "#ffd7ea",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4
  },
  sendDisabled: {
    opacity: 0.5
  },
  sendText: {
    color: "#fff",
    fontWeight: "600"
  },
  empty: {
    color: "#fff7f5"
  }
});
