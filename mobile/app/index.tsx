import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  // Unauthenticated users (customers) go straight to the stalls listing
  if (!user) return <Redirect href="/stalls" />;

  if (user.role === 'STALL_OWNER') return <Redirect href="/stall/dashboard" />;
  if (user.role === 'DELIVERY_PERSON') return <Redirect href="/delivery/dashboard" />;
  if (user.role === 'ADMIN') return <Redirect href="/admin/dashboard" />;

  return <Redirect href="/login" />;
}
