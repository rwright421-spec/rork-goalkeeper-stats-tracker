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

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="team-select" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="new-game" options={{ title: "New Game", headerShown: false }} />
      <Stack.Screen name="game-tracking" options={{ title: "Track Game", headerShown: false }} />
      <Stack.Screen name="game-detail" options={{ title: "Game Detail", headerShown: false }} />
      <Stack.Screen name="share-profile" options={{ title: "Share Profile", presentation: "modal" }} />
      <Stack.Screen name="join-profile" options={{ title: "Join Profile", presentation: "modal" }} />
      <Stack.Screen name="manage-members" options={{ title: "Members", presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
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
