import { Tabs } from "expo-router";
import { LayoutDashboard, ClipboardList, BarChart3, Settings } from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";
import { useColors } from "@/contexts/ThemeContext";
import { fontSize } from "@/constants/typography";

export default function TabLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          ...(Platform.OS === "web" ? { height: 60 } : {}),
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: fontSize.sm,
          fontWeight: "600" as const,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          title: "Games",
          tabBarIcon: ({ color, size }) => (
            <ClipboardList color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ color, size }) => (
            <BarChart3 color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profiles"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
