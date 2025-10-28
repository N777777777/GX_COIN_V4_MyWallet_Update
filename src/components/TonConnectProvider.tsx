import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { ReactNode } from 'react';

interface TonConnectProviderProps {
  children: ReactNode;
}

const TonConnectProvider = ({ children }: TonConnectProviderProps) => {
  const manifestUrl = 'https://gxcoinv4mywalletupdate-hitgn.sevalla.page/ton-connect-manifest.json';

  console.log('🔧 TON Connect initialized with manifest:', manifestUrl);

  return (
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      restoreConnection={true}
      actionsConfiguration={{
        twaReturnUrl: 'https://t.me/G3_COIN_V3_BOT',
        returnStrategy: 'back'
      }}
      walletsListConfiguration={{
        includeWallets: [
          {
            appName: "tonkeeper",
            name: "Tonkeeper",
            imageUrl: "https://tonkeeper.com/assets/tonconnect-icon.png",
            aboutUrl: "https://tonkeeper.com",
            universalLink: "https://app.tonkeeper.com/ton-connect",
            bridgeUrl: "https://bridge.tonapi.io/bridge",
            platforms: ["ios", "android", "chrome", "firefox"]
          },
          {
            appName: "mytonwallet",
            name: "MyTonWallet",
            imageUrl: "https://static.mytonwallet.io/icon-256.png",
            aboutUrl: "https://mytonwallet.io",
            universalLink: "https://connect.mytonwallet.org",
            bridgeUrl: "https://tonconnectbridge.mytonwallet.org/bridge",
            platforms: ["chrome", "ios", "android", "firefox"]
          }
        ]
      }}
      uiPreferences={{
        theme: 'SYSTEM'
      }}
    >
      {children}
    </TonConnectUIProvider>
  );
};

export default TonConnectProvider;
