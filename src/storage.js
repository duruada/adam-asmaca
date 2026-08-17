import AsyncStorage from '@react-native-async-storage/async-storage';

import { emptyProgress, sanitizeProgress } from './facts';

const KEY = 'adam-asmaca/ilerleme/v1';

/**
 * Kayıtlı ilerlemeyi okur. Bozuk veya eski bir kayıt varsa sıfırdan başlar —
 * ilerleme kaybı bir oyunda sorun değil, çökme sorun.
 */
export async function loadProgress() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    return sanitizeProgress(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

/** Yazma hatası oyunu bozmasın; kayıp sessizce yutuluyor. */
export async function saveProgress(progress) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export async function clearProgress() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* yoksay */
  }
}
