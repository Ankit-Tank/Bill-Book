import AsyncStorage from '@react-native-async-storage/async-storage';

const SHOP_PROFILE_KEY = '@billbook_shop_profile';

export interface ShopProfile {
  name: string;
  address: string;
  phone: string;
}

export const DEFAULT_SHOP_PROFILE: ShopProfile = {
  name: 'My Shop',
  address: '',
  phone: '',
};

/** Read the shop details the owner saved on the More tab (used on statements). */
export async function loadShopProfile(): Promise<ShopProfile> {
  try {
    const raw = await AsyncStorage.getItem(SHOP_PROFILE_KEY);
    if (!raw) return DEFAULT_SHOP_PROFILE;
    const data = JSON.parse(raw);
    return {
      name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : DEFAULT_SHOP_PROFILE.name,
      address: typeof data.address === 'string' ? data.address.trim() : '',
      phone: typeof data.phone === 'string' ? data.phone.trim() : '',
    };
  } catch {
    return DEFAULT_SHOP_PROFILE;
  }
}

export async function saveShopProfile(profile: ShopProfile): Promise<ShopProfile> {
  const clean: ShopProfile = {
    name: profile.name.trim() || DEFAULT_SHOP_PROFILE.name,
    address: profile.address.trim(),
    phone: profile.phone.trim(),
  };
  await AsyncStorage.setItem(SHOP_PROFILE_KEY, JSON.stringify(clean));
  return clean;
}
