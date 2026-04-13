import { ImageBackground, SafeAreaView, StyleSheet, Text, Pressable, View } from "react-native";

type Props = {
  onContinue: () => void;
};

export default function WelcomeScreen({ onContinue }: Props) {
  return (
    <ImageBackground
      source={require("../../../assets/images/cord-allman-OIRkQruBw9U-unsplash.jpg")}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} pointerEvents="none" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome to bdsmdate</Text>
          <Text style={styles.body}>This app is for adults 21+ exploring consensual kink and connection.</Text>
          <Text style={styles.body}>We focus on clear consent, boundaries, and respectful communication.</Text>
          <Pressable style={styles.button} onPress={onContinue}>
            <Text style={styles.buttonText}>I am 21+</Text>
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
    backgroundColor: "rgba(15, 10, 14, 0.18)"
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
    fontSize: 26,
    fontWeight: "700",
    color: "#2b1b12",
    marginBottom: 12
  },
  body: {
    color: "#3e2d25",
    lineHeight: 20,
    marginBottom: 10
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
  }
});
