import { useState } from "react";
import { ImageBackground, SafeAreaView, StyleSheet, Text, Pressable, View } from "react-native";

type Props = {
  onContinue: () => void;
};

export default function ConsentScreen({ onContinue }: Props) {
  const [ssc, setSsc] = useState(false);
  const [rack, setRack] = useState(false);

  const canContinue = ssc && rack;

  return (
    <ImageBackground
      source={require("../../../assets/images/pexels-31299941-8587249.jpg")}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} pointerEvents="none" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <Text style={styles.title}>Consent & Safety</Text>
          <Text style={styles.body}>We practice consent-first connections. Acknowledge both to continue.</Text>
          <Pressable style={styles.option} onPress={() => setSsc((prev) => !prev)}>
            <View style={[styles.check, ssc && styles.checkActive]} />
            <Text style={styles.optionText}>Safe, Sane, Consensual (SSC)</Text>
          </Pressable>
          <Pressable style={styles.option} onPress={() => setRack((prev) => !prev)}>
            <View style={[styles.check, rack && styles.checkActive]} />
            <Text style={styles.optionText}>Risk Aware Consensual Kink (RACK)</Text>
          </Pressable>
          <Pressable
            style={[styles.button, !canContinue && styles.buttonDisabled]}
            onPress={onContinue}
            disabled={!canContinue}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </View>
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
    backgroundColor: "rgba(16, 10, 14, 0.18)"
  },
  backgroundImage: {
    opacity: 0.98
  },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  card: {
    backgroundColor: "rgba(255, 250, 245, 0.8)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ead9cd",
    padding: 24
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2b1b12",
    marginBottom: 10
  },
  body: {
    color: "#3e2d25",
    lineHeight: 20,
    marginBottom: 16
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#7b5146",
    marginRight: 12
  },
  checkActive: {
    backgroundColor: "#7b5146"
  },
  optionText: {
    color: "#2b1b12",
    fontWeight: "600"
  },
  button: {
    marginTop: 20,
    backgroundColor: "#7b5146",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center"
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600"
  }
});
