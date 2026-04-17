import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, InputAccessoryView, Keyboard, Platform } from 'react-native';
import { useColors } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/themes';
import { fontSize } from '@/constants/typography';

export const KEYBOARD_DONE_BAR_ID = 'keyboard-done-bar';

export default function KeyboardDoneBar() {
  const colors = useColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_BAR_ID}>
      <View style={styles.bar}>
        <TouchableOpacity
          testID="keyboard-done-button"
          onPress={() => Keyboard.dismiss()}
          style={styles.button}
          activeOpacity={0.7}
        >
          <Text style={styles.text}>Done</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row' as const,
      justifyContent: 'flex-end' as const,
      alignItems: 'center' as const,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    button: { paddingHorizontal: 12, paddingVertical: 6 },
    text: { fontSize: fontSize.subtitle, fontWeight: '600' as const, color: c.primary },
  });
}
