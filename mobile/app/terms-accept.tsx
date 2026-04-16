import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../lib/api';
import { DELIVERY_PERSON_TERMS, STALL_OWNER_TERMS } from '../lib/terms';

export default function TermsAcceptScreen() {
  const router = useRouter();
  const { role, version } = useLocalSearchParams<{ role: string; version: string }>();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const termsText = role === 'STALL_OWNER' ? STALL_OWNER_TERMS : DELIVERY_PERSON_TERMS;
  const roleLabel = role === 'STALL_OWNER' ? 'Stall Owner' : 'Delivery Person';

  const handleAccept = async () => {
    if (!accepted) return;
    setSubmitting(true);
    try {
      await api.post('/auth/accept-terms', { role, version });
      router.replace('/');
    } catch {
      Alert.alert('Error', 'Failed to record acceptance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Updated Terms & Conditions</Text>
      <Text style={styles.subtitle}>
        Our Terms & Conditions have been updated. Please read and accept them to continue as a {roleLabel}.
      </Text>

      <ScrollView style={styles.termsBox} showsVerticalScrollIndicator>
        <Text style={styles.termsText}>{termsText}</Text>
      </ScrollView>

      <Pressable
        style={styles.checkRow}
        onPress={() => setAccepted(!accepted)}
      >
        <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
          {accepted && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkLabel}>I have read and agree to the {roleLabel} Terms & Conditions</Text>
      </Pressable>

      <Pressable
        style={[styles.acceptBtn, (!accepted || submitting) && { opacity: 0.5 }]}
        onPress={handleAccept}
        disabled={!accepted || submitting}
      >
        <Text style={styles.acceptBtnText}>{submitting ? 'Saving...' : 'Accept & Continue'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 24, paddingTop: 56 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16, lineHeight: 20 },
  termsBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginBottom: 16 },
  termsText: { fontSize: 13, color: '#374151', lineHeight: 20 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  checkLabel: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },
  acceptBtn: { backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
