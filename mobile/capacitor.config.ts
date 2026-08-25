import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.magicprus.kicktipp',
  appName: 'Kicktipp Auswertung',
  webDir: '../dist-mobile',
  plugins: {
    // Ohne presentationOptions unterdrückt iOS eingehende Pushes komplett
    // (kein Banner/Ton), solange die App im Vordergrund ist - die
    // Zustellung selbst (siehe push_tokens/FCM) läuft davon unbeeinflusst
    // korrekt durch, was beim Testen leicht wie ein Zustellungsfehler
    // aussieht. Im Hintergrund/geschlossen zeigt iOS Pushes ohnehin immer
    // an, unabhängig von dieser Einstellung.
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
