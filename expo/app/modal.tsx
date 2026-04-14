import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMemo } from "react";
import { useColors } from "@/contexts/ThemeContext";
import { ThemeColors } from "@/constants/themes";
import { X } from "lucide-react-native";
import { fontSize } from "@/constants/typography";

export default function ModalScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={true}
      onRequestClose={() => router.back()}
    >
      <Pressable style={styles.overlay} onPress={() => router.back()}>
        <View style={styles.modalContent}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>About GK Tracker</Text>
            <TouchableOpacity
              testID="modal-close-btn"
              style={styles.closeIcon}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.description}>
            GK Tracker helps you track goalkeeper performance across games,
            teams, and seasons.
          </Text>
          <TouchableOpacity
            testID="modal-close-button"
            style={styles.closeButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </Modal>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    modalContent: {
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 24,
      margin: 20,
      minWidth: 300,
      borderWidth: 1,
      borderColor: c.border,
    },
    headerRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: 16,
    },
    title: {
      fontSize: fontSize.h2,
      fontWeight: "700" as const,
      color: c.text,
    },
    closeIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surfaceLight,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    description: {
      textAlign: "center" as const,
      marginBottom: 24,
      color: c.textSecondary,
      lineHeight: 22,
      fontSize: fontSize.bodyLg,
    },
    closeButton: {
      backgroundColor: c.primaryDark,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center" as const,
    },
    closeButtonText: {
      color: c.white,
      fontWeight: "700" as const,
      fontSize: fontSize.subtitle,
    },
  });
}
