import NetInfo from '@react-native-community/netinfo';

export async function checkConnection(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
}
