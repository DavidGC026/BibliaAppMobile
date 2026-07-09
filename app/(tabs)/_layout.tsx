import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { shadow } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

function TabIcon({
  name,
  color,
}: {
  name: SymbolViewProps['name'];
  color: ColorValue;
}) {
  return (
    <SymbolView
      name={name}
      tintColor={color}
      size={22}
    />
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const tabBarPaddingTop = 6;
  const tabBarContentHeight = Platform.OS === 'ios' ? 49 : 52;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: tabBarPaddingTop,
          paddingBottom: insets.bottom,
          height: tabBarContentHeight + tabBarPaddingTop + insets.bottom,
          ...shadow.sm,
        },
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => (
            <TabIcon
              color={color}
              name={{ ios: 'house.fill', android: 'home', web: 'home' }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bible"
        options={{
          title: 'Biblia',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabIcon
              color={color}
              name={{ ios: 'book.fill', android: 'menu_book', web: 'menu_book' }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Comunidad',
          tabBarIcon: ({ color }) => (
            <TabIcon
              color={color}
              name={{ ios: 'person.2.fill', android: 'groups', web: 'groups' }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notas',
          tabBarIcon: ({ color }) => (
            <TabIcon
              color={color}
              name={{ ios: 'note.text', android: 'edit_note', web: 'edit_note' }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Grupos',
          tabBarIcon: ({ color }) => (
            <TabIcon
              color={color}
              name={{ ios: 'person.3.fill', android: 'group', web: 'group' }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => (
            <TabIcon
              color={color}
              name={{ ios: 'person.circle.fill', android: 'person', web: 'person' }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
