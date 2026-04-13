import { useState } from "react";
import { ImageBackground, SafeAreaView, StyleSheet, Text, Pressable, View } from "react-native";

const roles = ["dom", "sub", "switch", "exploring"] as const;

type Role = (typeof roles)[number];

type Props = {
  onContinue: (role: Role) => void;
};

export default function RoleScreen({ onContinue }: Props) {
  const [selected, setSelected] = useState<Role>("exploring");

  return (
    <ImageBackground
      source={require("../../../assets/images/pexels-31299941-8587259.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Choose your role</Text>
          <Text style={styles.body}>You can update this anytime.</Text>
          {roles.map((role) => (
            <Pressable
              key={role}
              style={[styles.option, selected === role && styles.optionActive]}
              onPress={() => setSelected(role)}
            >
              <Text style={styles.optionText}>{role.toUpperCase()}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.button} onPress={() => onContinue(selected)}>
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
    flex: 1,
    backgroundColor: "rgba(12, 10, 16, 0.65)",
    justifyContent: "center",
    padding: 24
  },
  card: {
    backgroundColor: "rgba(255, 250, 245, 0.92)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ead9cd",
    padding: 24
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2b1b12",
    marginBottom: 8
  },
  body: {
    color: "#3e2d25",
    marginBottom: 16
  },
  option: {
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#ead9cd",
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center"
  },
  optionActive: {
    backgroundColor: "#ead9cd"
  },
  optionText: {
    color: "#2b1b12",
    fontWeight: "600"
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
