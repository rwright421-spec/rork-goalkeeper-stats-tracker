import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, Component, ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { GoalkeeperProvider } from "@/contexts/GoalkeeperContext";
import { TeamProvider } from "@/contexts/TeamContext";
import { GameProvider } from "@/contexts/GameContext";
import { OpponentProvider } from "@/contexts/OpponentContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PurchasesProvider } from "@/contexts/PurchasesContext";
import { SyncStatusProvider } from "@/contexts/SyncStatusContext";

Sentry.init({
  dsn: "https://bb8da1f4f555208dc9abdb9ce84776ca@o4511219865157632.ingest.us.sentry.io/4511219867648000",
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  debug: __DEV__,
});

SplashScreen.preventAutoHideAsync().catch(() => {});

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
    Sentry.captureException(error, {
      extra: { componentStack: info.componentStack },
    });
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <View style={errorStyles.iconCircle}>
            <Text style={errorStyles.iconText}>!</Text>
          </View>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>
            {this.state.error?.message ?? "An unexpected error occurred."}
          </Text>
          <Text style={errorStyles.subMessage}>
            The error has been reported automatically.
          </Text>
          <TouchableOpacity style={errorStyles.button} onPress={this.handleRestart}>
            <Text style={errorStyles.buttonText}>Restart</Text>
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
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(248, 81, 73, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "rgba(248, 81, 73, 0.3)",
  },
  iconText: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: "#F85149",
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
    marginBottom: 8,
    lineHeight: 20,
  },
  subMessage: {
    fontSize: 12,
    color: "#484F58",
    textAlign: "center",
    marginBottom: 24,
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
      <Stack.Screen
        name="theme-preview"
        options={{ title: "Theme Preview" }}
      />
    </Stack>
  );
}

function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <ThemeProvider>
              <SyncStatusProvider>
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
              </SyncStatusProvider>
            </ThemeProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
