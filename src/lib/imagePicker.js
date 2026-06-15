// Thin wrapper around expo-image-picker so screens don't repeat permission
// handling. Returns the picked image URI(s) or null when cancelled/denied.

import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

async function ensurePermission() {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;
  const asked = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (asked.granted) return true;
  Alert.alert(
    'Photo access needed',
    'To choose a photo, allow Hit to access your photo library in your device settings.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
  return false;
}

// Pick a single image, optionally with a crop step + aspect ratio.
export async function pickImage({ allowsEditing = true, aspect = [1, 1] } = {}) {
  if (!(await ensurePermission())) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing,
    aspect,
    quality: 0.85,
  });
  if (result.canceled) return null;
  return result.assets?.[0]?.uri || null;
}

// Pick up to `limit` images at once (no crop step). Returns an array of URIs.
export async function pickImages(limit = 6) {
  if (!(await ensurePermission())) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 0.85,
  });
  if (result.canceled) return [];
  return (result.assets || []).map((a) => a.uri).filter(Boolean);
}

export default { pickImage, pickImages };
