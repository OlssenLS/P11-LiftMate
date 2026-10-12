import { Redirect } from 'expo-router';

/**
 * Legacy /analytics route redirected to primary tab /(app)/insights (Brief Slice N).
 */
export default function AnalyticsScreen() {
  return <Redirect href="/(app)/insights" />;
}
