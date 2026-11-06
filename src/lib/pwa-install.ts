export type InstallBrowser = 'chrome' | 'edge' | 'firefox' | 'opera' | 'safari' | 'samsung' | 'vivaldi' | 'brave' | 'other';
export type InstallPlatform = 'ios' | 'android' | 'mac' | 'windows' | 'linux' | 'other';

export type InstallEnvironment = {
  browser: InstallBrowser;
  platform: InstallPlatform;
};

export const browserLabels: Record<InstallBrowser, string> = {
  chrome: 'Google Chrome',
  edge: 'Microsoft Edge',
  firefox: 'Mozilla Firefox',
  opera: 'Opera',
  safari: 'Safari',
  samsung: 'Samsung Internet',
  vivaldi: 'Vivaldi',
  brave: 'Brave / Chromium',
  other: 'Other browser',
};

export const platformLabels: Record<InstallPlatform, string> = {
  ios: 'iPhone / iPad',
  android: 'Android',
  mac: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
  other: 'this device',
};

export function detectInstallEnvironment(
  userAgent: string,
  platform = '',
  maxTouchPoints = 0,
): InstallEnvironment {
  const ua = userAgent.toLowerCase();
  const p = platform.toLowerCase();
  const ios = /iphone|ipad|ipod/.test(ua) || (p === 'macintel' && maxTouchPoints > 1);
  const os: InstallPlatform = ios ? 'ios' :
    ua.includes('android') ? 'android' :
    ua.includes('windows') || p.startsWith('win') ? 'windows' :
    ua.includes('mac os') || p.startsWith('mac') ? 'mac' :
    ua.includes('linux') || p.startsWith('linux') ? 'linux' : 'other';

  // Browser forks often include "Chrome" or "Safari" in the user agent.
  const browser: InstallBrowser =
    /edg\/?|edga\/|edgios\//.test(ua) ? 'edge' :
    /opr\/|opera|opt\/|opios\//.test(ua) ? 'opera' :
    /fxios\/|firefox\/|fennec\//.test(ua) ? 'firefox' :
    /samsungbrowser\//.test(ua) ? 'samsung' :
    /vivaldi\//.test(ua) ? 'vivaldi' :
    /brave\//.test(ua) ? 'brave' :
    /crios\/|chrome\/|chromium\//.test(ua) ? 'chrome' :
    /safari\//.test(ua) ? 'safari' : 'other';

  return { browser, platform: os };
}

export function getInstallGuidance({ browser, platform }: InstallEnvironment): {
  steps: string[];
  note: string;
} {
  if (platform === 'ios') {
    if (browser === 'opera') {
      return {
        steps: [
          'Open the browser Share menu and look for Add to Home Screen.',
          'If that option is missing, open this website in Safari and choose Share → Add to Home Screen.',
          'Enable Open as Web App if shown, then tap Add.',
        ],
        note: 'iPhone and iPad web app installation depends on the browser and iOS version. Safari is the fallback.',
      };
    }
    const openShare = browser === 'chrome'
      ? 'Tap the Share icon beside the address bar in Chrome.'
      : browser === 'edge'
        ? 'Open the Edge menu and tap Share.'
        : browser === 'firefox'
          ? 'Open the Firefox Share menu.'
          : 'Tap Share (you may need to open the Safari page menu first).';
    return {
      steps: [
        openShare,
        'Choose Add to Home Screen (scroll or tap More if needed).',
        'Enable Open as Web App if available, then tap Add.',
      ],
      note: 'On iOS 16.4 and later, supported browsers can add web apps from Share. If the option is missing, use Safari.',
    };
  }
  if (platform === 'android') {
    if (browser === 'firefox') return {
      steps: ['Open the Firefox three-dot menu (⋮).', 'Tap Install.', 'Choose Add automatically or place the icon on your Home Screen.'],
      note: 'Firefox for Android may create a Firefox-powered Home Screen shortcut rather than a separate WebAPK.',
    };
    if (browser === 'samsung') return {
      steps: ['Open the Samsung Internet menu (☰).', 'Choose Add page to → Home screen.', 'Confirm Add.'],
      note: 'Samsung Internet supports installing eligible web apps on supported Samsung devices.',
    };
    if (browser === 'edge') return {
      steps: ['Open the Microsoft Edge menu (⋯).', 'Choose Add to phone or Add to Home Screen.', 'Confirm Add.'],
      note: 'On Android, Edge may create a browser-powered shortcut rather than an independent app.',
    };
    if (browser === 'opera') return {
      steps: ['Open the Opera menu (O or ⋮, depending on version).', 'Choose Add to Home Screen if available.', 'Confirm Add. If unavailable, try Chrome or Samsung Internet.'],
      note: 'Opera installation options depend on the version; some create only a browser shortcut.',
    };
    return {
      steps: ['Open the browser menu (usually ⋮).', 'Choose Install app or Add to Home Screen.', 'Confirm Install or Add.'],
      note: browser === 'chrome'
        ? 'Chrome on compatible Android devices can install Young Peloton as a WebAPK.'
        : 'Your browser may offer only a Home Screen shortcut. Chrome can provide a standalone install on supported Android devices.',
    };
  }
  if (platform === 'mac' && browser === 'safari') {
    return {
      steps: ['Open Young Peloton in Safari.', 'In the menu bar, choose File → Add to Dock.', 'Confirm Add.'],
      note: 'Add to Dock is supported in Safari 17 and later on macOS Sonoma and newer.',
    };
  }
  if (browser === 'firefox' && platform === 'windows') {
    return {
      steps: [
        'In Firefox 143 or newer, look for the Web apps icon in the address bar and click it.',
        'Young Peloton will open in an app-like Firefox window, with a Start menu entry and optional taskbar pin.',
        'If the icon is missing, update Firefox (Microsoft Store versions require Firefox 150+), restart it, and open the site in a normal window.',
      ],
      note: 'Firefox for Windows supports web apps independently of the PWA install prompt. The button in the address bar is controlled by Firefox.',
    };
  }
  if (browser === 'firefox') {
    return {
      steps: [
        'Firefox on macOS and Linux does not offer built-in web app installation at present.',
        'Open Young Peloton in Chrome, Edge, or Safari on macOS.',
        'Then choose Install app (Chrome/Edge) or File → Add to Dock (Safari on macOS).',
      ],
      note: 'The Young Peloton website still works normally in Firefox. An installed app depends on what your browser supports.',
    };
  }
  if (browser === 'edge') return {
    steps: ['Open the Edge menu (⋯).', 'Select Apps → Install this site as an app, or click the Install icon in the address bar.', 'Confirm Install.'],
    note: 'Edge offers native installation on supported desktop systems.',
  };
  if (browser === 'chrome') return {
    steps: ['Look for the Install icon in the Chrome address bar.', 'Alternatively choose the three-dot menu (⋮) → Cast, save, and share → Install page as app.', 'Confirm Install.'],
    note: 'Google Chrome supports standalone installation on supported desktop systems.',
  };
  if (browser === 'opera' || browser === 'vivaldi' || browser === 'brave') return {
    steps: ['Look for an Install icon in the address bar or the browser menu.', 'Select Install app or Create shortcut / Open as window if offered.', 'If your version does not offer standalone installation, open Young Peloton in Chrome or Edge.'],
    note: 'These browsers are Chromium-based, but their install menus and standalone support vary by version.',
  };
  return {
    steps: ['Open your browser menu and look for Install app, Add to Dock or Create app shortcut.', 'If no install command is offered, try Chrome or Microsoft Edge for desktop PWA installation.', 'Confirm the installation and launch Young Peloton from your apps.'],
    note: 'Not every desktop browser supports installing web apps. The website will still work without installation.',
  };
}
