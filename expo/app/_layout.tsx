import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { GoalkeeperProvider } from "@/contexts/GoalkeeperContext";
import { SyncStatusProvider } from "@/contexts/SyncStatusContext";
import { TeamProvider } from "@/contexts/TeamContext";
import { GameProvider } from "@/contexts/GameContext";
import { OpponentProvider } from "@/contexts/OpponentContext";
import { PurchasesProvider } from "@/contexts/PurchasesContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="new-game" options={{ headerShown: true, headerTitle: "New Game" }} />
      <Stack.Screen name="game-tracking" options={{ headerShown: true, headerTitle: "Track Game" }} />
      <Stack.Screen name="game-detail" options={{ headerShown: true, headerTitle: "Game Details" }} />
      <Stack.Screen name="team-select" options={{ headerShown: true, headerTitle: "Select Team" }} />
      <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
      <Stack.Screen name="theme-preview" options={{ headerShown: true, headerTitle: "Theme Preview" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <ThemeProvider>
            <SyncStatusProvider>
              <GoalkeeperProvider>
                <OpponentProvider>
                  <TeamProvider>
                    <GameProvider>
                      <PurchasesProvider>
                        <RootLayoutNav />
                      </PurchasesProvider>
                    </GameProvider>
                  </TeamProvider>
                </OpponentProvider>
              </GoalkeeperProvider>
            </SyncStatusProvider>
          </ThemeProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
