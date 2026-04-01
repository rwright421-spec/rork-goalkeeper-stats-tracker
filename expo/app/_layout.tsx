import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { GoalkeeperProvider } from "@/contexts/GoalkeeperContext";
import { TeamProvider } from "@/contexts/TeamContext";
import { GameProvider } from "@/contexts/GameContext";
import { OpponentProvider } from "@/contexts/OpponentContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", animation: "slide_from_right" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="team-select" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="new-game" options={{ title: "New Game", headerShown: false }} />
      <Stack.Screen name="game-tracking" options={{ title: "Track Game", headerShown: false }} />
      <Stack.Screen name="game-detail" options={{ title: "Game Detail", headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    console.log('[RootLayout] App mounted, hiding splash screen');
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <ThemeProvider>
            <GoalkeeperProvider>
              <TeamProvider>
                <GameProvider>
                  <OpponentProvider>
                    <RootLayoutNav />
                  </OpponentProvider>
                </GameProvider>
              </TeamProvider>
            </GoalkeeperProvider>
          </ThemeProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
