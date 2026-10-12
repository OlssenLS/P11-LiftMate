import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Slice N Navigation Architecture & Tab Bar Contract', () => {
  const rootDir = path.resolve(__dirname, '../../../../');
  const tabBarPath = path.join(rootDir, 'apps/mobile/src/components/ui/tab-bar.tsx');
  const layoutPath = path.join(rootDir, 'apps/mobile/src/app/(app)/_layout.tsx');
  const insightsPath = path.join(rootDir, 'apps/mobile/src/app/(app)/insights.tsx');
  const homePath = path.join(rootDir, 'apps/mobile/src/app/(app)/index.tsx');
  const youPath = path.join(rootDir, 'apps/mobile/src/app/(app)/you.tsx');
  const appJsonPath = path.join(rootDir, 'apps/mobile/app.json');

  it('defines the 4 primary tabs as Home · Train · Food · Insights in TabBar component', () => {
    const tabBarContent = fs.readFileSync(tabBarPath, 'utf8');

    // TabKey type definition
    expect(tabBarContent).toContain("export type TabKey = 'home' | 'train' | 'food' | 'insights';");

    // Tab items array
    expect(tabBarContent).toContain("{ key: 'home', labelKey: 'tabs.home', icon: House }");
    expect(tabBarContent).toContain("{ key: 'train', labelKey: 'tabs.train', icon: Dumbbell }");
    expect(tabBarContent).toContain("{ key: 'food', labelKey: 'tabs.food', icon: Utensils }");
    expect(tabBarContent).toContain("{ key: 'insights', labelKey: 'tabs.insights', icon: TrendingUp }");

    // Coach button remains a detached circle button
    expect(tabBarContent).toContain('styles.coachCircle');
    expect(tabBarContent).toContain('onCoachPress');
  });

  it('configures Expo Router Tabs in (app)/_layout.tsx to include insights and hide you/coach from pill', () => {
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');

    expect(layoutContent).toContain('<Tabs.Screen name="index" options={{ title: \'Home\' }} />');
    expect(layoutContent).toContain('<Tabs.Screen name="train" options={{ title: \'Train\' }} />');
    expect(layoutContent).toContain('<Tabs.Screen name="food" options={{ title: \'Food\' }} />');
    expect(layoutContent).toContain('<Tabs.Screen name="insights" options={{ title: \'Insights\' }} />');
    expect(layoutContent).toContain('<Tabs.Screen name="you" options={{ href: null, title: \'You\' }} />');
    expect(layoutContent).toContain('<Tabs.Screen name="coach" options={{ href: null, title: \'Coach\' }} />');
  });

  it('provides avatar on Home that navigates to Profile / You', () => {
    const homeContent = fs.readFileSync(homePath, 'utf8');
    expect(homeContent).toContain("router.push('/(app)/you')");
    expect(homeContent).toContain('accessibilityLabel="Open Profile & Settings"');
  });

  it('provides a back navigation button on You screen to return to Home', () => {
    const youContent = fs.readFileSync(youPath, 'utf8');
    expect(youContent).toContain('accessibilityLabel="Go back"');
    expect(youContent).toContain('router.back()');
  });

  it('implements Insights tab with Data Sufficiency Gate and Not enough data yet state', () => {
    const insightsContent = fs.readFileSync(insightsPath, 'utf8');
    expect(insightsContent).toContain("t('insights.title')");
    expect(insightsContent).toContain("t('analytics.notEnoughDataTitle')");
    expect(insightsContent).toContain("t('analytics.workoutsLogged')");
    expect(insightsContent).toContain("t('analytics.nutritionDays')");
    expect(insightsContent).toContain("useTabScrollPadding()");
  });

  it('has liftmate scheme configured for deep links in app.json', () => {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    expect(appJson.expo.scheme).toBe('liftmate');
  });
});
