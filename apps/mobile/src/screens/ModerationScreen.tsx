import { useEffect, useState } from "react";
import { ActivityIndicator, ImageBackground, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { api, Report, VerificationStatus } from "../api/client";

type Props = {
  userId: string;
};

export default function ModerationScreen({ userId }: Props) {
  const [reports, setReports] = useState<Report[]>([]);
  const [verifications, setVerifications] = useState<VerificationStatus[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await api.listReports(userId);
        setReports(response.reports);
        const verificationResponse = await api.listVerifications();
        setVerifications(verificationResponse.verifications);
        const blockResponse = await api.listBlocks(userId);
        setBlocked(blockResponse.blocked);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  const updateReport = async (reportId: string, status: Report["status"]) => {
    try {
      const updated = await api.updateReportStatus(reportId, status);
      setReports((prev) => prev.map((report) => (report.id === reportId ? updated : report)));
    } catch (error) {
      console.error(error);
    }
  };

  const updateVerification = async (targetId: string, decision: "approve" | "reject") => {
    try {
      const updated = decision === "approve"
        ? await api.approveVerification(targetId)
        : await api.rejectVerification(targetId);
      setVerifications((prev) =>
        prev.map((item) => (item.userId === targetId ? updated : item))
      );
    } catch (error) {
      console.error(error);
    }
  };

  const banUser = async (targetId: string) => {
    try {
      await api.banUser(targetId);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/pexels-31299941-8587249.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Moderation</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#7b5146" />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Reports</Text>
          {reports.length === 0 ? (
            <Text style={styles.empty}>No reports yet.</Text>
          ) : (
            reports.map((report) => (
              <View key={report.id} style={styles.card}>
                <Text style={styles.label}>Reporter</Text>
                <Text style={styles.value}>{report.reporterId}</Text>
                <Text style={styles.label}>Reported</Text>
                <Text style={styles.value}>{report.reportedUserId}</Text>
                <Text style={styles.label}>Reason</Text>
                <Text style={styles.value}>{report.reason}</Text>
                <Text style={styles.label}>Status</Text>
                <Text style={styles.value}>{report.status}</Text>
                <View style={styles.actionRow}>
                  {(["reviewed", "closed"] as const).map((status) => (
                    <Pressable
                      key={status}
                      style={styles.actionButton}
                      onPress={() => updateReport(report.id, status)}
                    >
                      <Text style={styles.actionText}>{status.toUpperCase()}</Text>
                    </Pressable>
                  ))}
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => banUser(report.reportedUserId)}
                  >
                    <Text style={styles.actionText}>BAN USER</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
          <Text style={styles.sectionTitle}>Verification</Text>
          {verifications.length === 0 ? (
            <Text style={styles.empty}>No verification requests.</Text>
          ) : (
            verifications.map((item) => (
              <View key={item.userId} style={styles.card}>
                <Text style={styles.label}>User</Text>
                <Text style={styles.value}>{item.userId}</Text>
                <Text style={styles.label}>Status</Text>
                <Text style={styles.value}>{item.status}</Text>
                <View style={styles.actionRow}>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => updateVerification(item.userId, "approve")}
                  >
                    <Text style={styles.actionText}>APPROVE</Text>
                  </Pressable>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => updateVerification(item.userId, "reject")}
                  >
                    <Text style={styles.actionText}>REJECT</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
          <Text style={styles.sectionTitle}>Blocked list</Text>
          {blocked.length === 0 ? (
            <Text style={styles.empty}>No blocked users.</Text>
          ) : (
            blocked.map((blockedId) => (
              <View key={blockedId} style={styles.card}>
                <Text style={styles.label}>Blocked user</Text>
                <Text style={styles.value}>{blockedId}</Text>
              </View>
            ))
          )}
        </>
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
    backgroundColor: "rgba(10, 8, 12, 0.72)",
    paddingHorizontal: 20
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff7f5",
    marginTop: 16,
    marginBottom: 16,
    fontFamily: "PlayfairDisplay_600SemiBold"
  },
  empty: {
    color: "#fff7f5"
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 8,
    fontWeight: "700",
    color: "#fff7f5"
  },
  card: {
    backgroundColor: "rgba(18, 12, 20, 0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    padding: 16,
    marginBottom: 12
  },
  label: {
    fontSize: 12,
    color: "#f2d6e6",
    textTransform: "uppercase",
    marginTop: 6
  },
  value: {
    color: "#fff7f5",
    fontWeight: "600"
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10
  },
  actionButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center"
  },
  actionText: {
    color: "#fff7f5",
    fontWeight: "600",
    fontSize: 12
  }
});
