import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { AppDirectoryEntry } from '../native/NativeNotifyIQ';
import { getAppDirectory } from '../native/notifyIQ';
import { appDisplayName, categoryVisual, type AppTheme } from '../theme/tokens';

type Directory = {
  entries: ReadonlyArray<AppDirectoryEntry>;
  /** Real app label when known (captured from Android), otherwise a name derived from the package id. */
  name: (packageName: string) => string;
  iconUri: (packageName: string) => string | null;
  reload: () => void;
};

const fallback: Directory = { entries: [], name: appDisplayName, iconUri: () => null, reload: () => undefined };
const DirectoryContext = createContext<Directory>(fallback);

export function AppDirectoryProvider({ children, refreshKey }: PropsWithChildren<{ refreshKey: number }>) {
  const [entries, setEntries] = useState<ReadonlyArray<AppDirectoryEntry>>([]);
  const load = useCallback(() => { getAppDirectory().then(setEntries).catch(() => undefined); }, []);
  useEffect(() => { load(); }, [load, refreshKey]);
  const value = useMemo<Directory>(() => {
    const byPackage = new Map(entries.map(entry => [entry.packageName, entry]));
    return {
      entries,
      name: pkg => byPackage.get(pkg)?.label ?? appDisplayName(pkg),
      iconUri: pkg => byPackage.get(pkg)?.iconUri ?? null,
      reload: load,
    };
  }, [entries, load]);
  return <DirectoryContext.Provider value={value}>{children}</DirectoryContext.Provider>;
}

export function useAppDirectory() {
  return useContext(DirectoryContext);
}

/** App icon from the local cache; falls back to the category emoji, then to the app's initial. */
export function AppIcon({ theme, packageName, category, size = 40 }: { theme: AppTheme; packageName: string; category?: string; size?: number }) {
  const { iconUri, name } = useAppDirectory();
  const uri = iconUri(packageName);
  if (uri) {
    return <Image accessibilityIgnoresInvertColors source={{ uri }} style={{ width: size, height: size, borderRadius: size * 0.28 }} />;
  }
  if (category) {
    const visual = categoryVisual(theme, category);
    return (
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: visual.bg }]}>
        <Text style={{ fontSize: size * 0.45 }}>{visual.emoji}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.brandSoft }]}>
      <Text style={{ fontSize: size * 0.42, fontWeight: '800', color: theme.colors.brand }}>{name(packageName).charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ circle: { alignItems: 'center', justifyContent: 'center' } });
