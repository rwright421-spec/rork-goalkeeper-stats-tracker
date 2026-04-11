import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, Component, ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { GoalkeeperProvider } from "@/contexts/GoalkeeperContext";
import { TeamProvider } from "@/contexts/TeamContext";
import { GameProvider } from "@/contexts/GameContext";
import { OpponentProvider } from "@/contexts/OpponentContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PurchasesProvider } from "@/contexts/PurchasesContext";

try {
  SplashScreen.preventAutoHideAsync();
} catch (e) {
  console.log("[RootLayout] SplashScreen.preventAutoHideAsync error:", e);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60,
    },
  },
});

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.log("[ErrorBoundary] Caught error:", error.message);
    console.log("[ErrorBoundary] Component stack:", info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>
            {this.state.error?.message ?? "An unexpected error occurred."}
          </Text>
          <TouchableOpacity style={errorStyles.button} onPress={this.handleReset}>
            <Text style={errorStyles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D1117",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#F0F6FC",
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: "#8B949E",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#10B981",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700" as const,
  },
});

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="team-select" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="new-game"
        options={{ title: "New Game" }}
      />
      <Stack.Screen
        name="game-tracking"
        options={{ title: "Track Game", headerShown: false }}
      />
      <Stack.Screen
        name="game-detail"
        options={{ title: "Game Detail", headerShown: false }}
      />
      <Stack.Screen
        name="onboarding"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="paywall"
        options={{ headerShown: false, presentation: "modal", gestureEnabled: true }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    console.log("[RootLayout] App mounted, hiding splash screen");
    try {
      void SplashScreen.hideAsync();
    } catch (e) {
      console.log("[RootLayout] SplashScreen.hideAsync error:", e);
    }
  }, []);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <ThemeProvider>
              <GoalkeeperProvider>
                <TeamProvider>
                  <GameProvider>
                    <OpponentProvider>
                      <PurchasesProvider>
                        <RootLayoutNav />
                      </PurchasesProvider>
                    </OpponentProvider>
                  </GameProvider>
                </TeamProvider>
              </GoalkeeperProvider>
            </ThemeProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
