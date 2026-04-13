import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold } from "@expo-google-fonts/playfair-display";
import { SpaceGrotesk_400Regular, SpaceGrotesk_600SemiBold } from "@expo-google-fonts/space-grotesk";
import DiscoverScreen from "./src/screens/DiscoverScreen";
import MatchesScreen from "./src/screens/MatchesScreen";
import MessagesScreen from "./src/screens/MessagesScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import ModerationScreen from "./src/screens/ModerationScreen";
import ProfileDetailScreen from "./src/screens/ProfileDetailScreen";
import { RootStackParamList } from "./src/navigation/types";
import WelcomeScreen from "./src/screens/onboarding/WelcomeScreen";
import ConsentScreen from "./src/screens/onboarding/ConsentScreen";
import RoleScreen from "./src/screens/onboarding/RoleScreen";
import ProfileSetupScreen from "./src/screens/onboarding/ProfileSetupScreen";
import { colors } from "./src/theme/colors";

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const OnboardingStack = createNativeStackNavigator();
const userId = "user_1";
const onboardingKey = "onboardingComplete";

function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [role, setRole] = useState<"dom" | "sub" | "switch" | "exploring">("exploring");

  return (
    <OnboardingStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.slate },
        headerTitleStyle: { color: colors.ink, fontFamily: "PlayfairDisplay_600SemiBold" },
        headerTitleAlign: "center"
      }}
    >
      <OnboardingStack.Screen name="Welcome" options={{ headerShown: false }}>
        {({ navigation }) => (
          <WelcomeScreen onContinue={() => navigation.navigate("Consent")} />
        )}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen name="Consent" options={{ title: "Consent" }}>
        {({ navigation }) => (
          <ConsentScreen onContinue={() => navigation.navigate("Role")} />
        )}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen name="Role" options={{ title: "Role" }}>
        {({ navigation }) => (
          <RoleScreen
            onContinue={(selectedRole) => {
              setRole(selectedRole);
              navigation.navigate("ProfileSetup");
            }}
          />
        )}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen name="ProfileSetup" options={{ title: "Profile" }}>
        {() => <ProfileSetupScreen userId={userId} role={role} onComplete={onComplete} />}
      </OnboardingStack.Screen>
    </OnboardingStack.Navigator>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.slate },
        headerTitleStyle: { color: colors.ink, fontFamily: "PlayfairDisplay_600SemiBold" },
        headerTitleAlign: "center",
        tabBarStyle: { backgroundColor: colors.slate, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.rose,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: { fontFamily: "SpaceGrotesk_600SemiBold" },
        tabBarIcon: ({ color, size, focused }) => {
          let icon = "ellipse";
          if (route.name === "Discover") icon = focused ? "compass" : "compass-outline";
          if (route.name === "Matches") icon = focused ? "heart" : "heart-outline";
          if (route.name === "Messages") icon = focused ? "chatbubbles" : "chatbubbles-outline";
          if (route.name === "Profile") icon = focused ? "person" : "person-outline";
          if (route.name === "Moderation") icon = focused ? "shield" : "shield-outline";
          return <Ionicons name={icon as any} size={size} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Discover">
        {() => <DiscoverScreen userId={userId} />}
      </Tab.Screen>
      <Tab.Screen name="Matches">
        {() => <MatchesScreen userId={userId} />}
      </Tab.Screen>
      <Tab.Screen name="Messages">
        {() => <MessagesScreen userId={userId} />}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {() => <ProfileScreen userId={userId} />}
      </Tab.Screen>
      <Tab.Screen name="Moderation">
        {() => <ModerationScreen userId={userId} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold
  });

  useEffect(() => {
    const load = async () => {
      try {
        const value = await AsyncStorage.getItem(onboardingKey);
        setOnboarded(value === "true");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem(onboardingKey, "true");
    setOnboarded(true);
  };

  if (loading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.rose} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <RootStack.Navigator>
        {onboarded ? (
          <RootStack.Screen
            name="MainTabs"
            component={Tabs}
            options={{ headerShown: false }}
          />
        ) : (
          <RootStack.Screen name="Onboarding" options={{ headerShown: false }}>
            {() => <OnboardingFlow onComplete={finishOnboarding} />}
          </RootStack.Screen>
        )}
        <RootStack.Screen
          name="ProfileDetail"
          component={ProfileDetailScreen}
          options={{ title: "Profile" }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
