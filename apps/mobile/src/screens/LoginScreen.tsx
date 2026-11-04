  import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { isEmail, isVenezuelanPhone, toVenezuelanE164 } from "@llegate/shared";

export default function LoginScreen() {
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [normalized, setNormalized] = useState<string | null>(null);

  const handleValidate = () => {
    const value = contact.trim();
    if (isEmail(value)) {
      setError(null);
      setNormalized(value.toLowerCase());
      return;
    }
    if (isVenezuelanPhone(value)) {
      const e164 = toVenezuelanE164(value);
      if (e164) {
        setError(null);
        setNormalized(e164);
        return;
      }
    }
    setError("Ingresa un email válido o un teléfono venezolano.");
    setNormalized(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar sesión</Text>
      <TextInput
        style={styles.input}
        placeholder="Email o teléfono"
        value={contact}
        onChangeText={setContact}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {normalized ? <Text style={styles.ok}>Normalizado: {normalized}</Text> : null}
      <Pressable style={styles.button} onPress={handleValidate}>
        <Text style={styles.buttonText}>Validar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
  error: { color: "#dc2626" },
  ok: { color: "#16a34a" },
  button: { backgroundColor: "#2563eb", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
