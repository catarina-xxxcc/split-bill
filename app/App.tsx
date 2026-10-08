import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { initDatabase } from './src/db/database';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { supabase } from './src/lib/supabase';
import { useStore } from './src/store/useStore';
import { pullAll } from './src/sync/sync';
import HomeScreen from './src/screens/HomeScreen';
import GroupScreen from './src/screens/GroupScreen';
import NewGroupScreen from './src/screens/NewGroupScreen';
import JoinScreen from './src/screens/JoinScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import SettleScreen from './src/screens/SettleScreen';
import StatsScreen from './src/screens/StatsScreen';
import LoginScreen from './src/screens/LoginScreen';

function Root() {
  const route = useStore((s) => s.route);
  const refresh = useStore((s) => s.refresh);
  const { user, loading } = useAuth();

  useEffect(() => {
    initDatabase();
  }, []);

  useEffect(() => {
    if (user) {
      pullAll().then(() => refresh());
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        pullAll().then(() => refresh());
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>加载中…</Text>
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      {route.name === 'home' && <HomeScreen />}
      {route.name === 'group' && <GroupScreen groupId={route.groupId} />}
      {route.name === 'newGroup' && <NewGroupScreen />}
      {route.name === 'join' && <JoinScreen />}
      {route.name === 'addExpense' && <AddExpenseScreen groupId={route.groupId} />}
      {route.name === 'settle' && <SettleScreen groupId={route.groupId} />}
      {route.name === 'stats' && <StatsScreen groupId={route.groupId} />}
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
