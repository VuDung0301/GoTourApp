import React, { useState } from 'react';
import {
  View,
  TextInput as RNTextInput,
  StyleSheet,
  Text,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from './IconSymbol';

interface TextInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  icon?: string;
}

export const TextInput = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
  labelStyle,
  icon,
}: TextInputProps) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const inputBorderColor = error ? colors.error : isFocused ? colors.tint : colors.tabIconDefault;

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={[styles.label, { color: colors.text }, labelStyle]}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          {
            borderColor: inputBorderColor,
            backgroundColor: colors.background,
          },
        ]}
      >
        {icon && (
          <View style={styles.iconContainer}>
            <IconSymbol name={icon} size={20} color={colors.tabIconDefault} />
          </View>
        )}

        <RNTextInput
          style={[
            styles.input,
            { color: colors.text },
            icon && styles.inputWithIcon,
            multiline && styles.multilineInput,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.tabIconDefault}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {secureTextEntry && (
          <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
            <IconSymbol
              name={isPasswordVisible ? 'eye.slash.fill' : 'eye.fill'}
              size={20}
              color={colors.tabIconDefault}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputWithIcon: {
    paddingLeft: 8,
  },
  iconContainer: {
    paddingLeft: 16,
  },
  multilineInput: {
    textAlignVertical: 'top',
    minHeight: 100,
  },
  eyeIcon: {
    padding: 10,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
}); 