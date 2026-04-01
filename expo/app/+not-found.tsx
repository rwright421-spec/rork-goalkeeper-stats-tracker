import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/contexts/ThemeContext";
import { useMemo } from "react";
import { ThemeColors } from "@/constants/themes";
import { AlertCircle } from "lucide-react-native";

export default function NotFoundScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={styles.container}>
        <AlertCircle size={48} color={colors.textMuted} strokeWidth={1.5} />
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      backgroundColor: c.background,
      gap: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: "600" as const,
      color: c.text,
      marginTop: 8,
    },
    link: {
      marginTop: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 10,
      backgroundColor: c.primaryDark,
    },
    linkText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: c.white,
    },
  });
}
