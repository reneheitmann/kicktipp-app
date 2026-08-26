import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.magicprus.kicktipp',
  appName: 'Kicktipp Auswertung',
  webDir: '../dist-mobile',
  plugins: {
    // Ohne presentationOptions unterdrückt iOS eingehende Pushes komplett
    // (kein Banner/Ton), solange die App im Vordergrund ist - die
    // Zustellung selbst läuft davon unbeeinflusst korrekt durch, was beim
    // Testen leicht wie ein Zustellungsfehler aussieht. Im Hintergrund/
    // geschlossen zeigt iOS Pushes ohnehin immer an, unabhängig davon.
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  // Vermeidet eine SwiftPM-Package-Identity-Kollision zwischen
  // @capacitor-firebase/messaging und den Firebase-iOS-SDK-Paketen selbst
  // (siehe Plugin-README) - ohne das schlägt der Xcode-Build fehl.
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          '@capacitor-firebase/messaging': {
            symlink: true,
          },
        },
      },
    },
  },
};

export default config;
