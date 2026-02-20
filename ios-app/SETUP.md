# Quartz Azure Monitor iOS App - Setup Guide

**Project:** QuartzMobile
**Last Updated:** January 2026

---

## Prerequisites

- Xcode 16.0 or later
- iOS 17.0+ deployment target
- macOS Sonoma or later
- Apple Developer account (for push notifications)
- Access to Quartz Azure Monitor API

---

## 1. Clone and Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd QuartzMobile

# Open in Xcode
open QuartzMobile.xcodeproj
```

---

## 2. Swift Package Dependencies

The project uses Swift Package Manager. Dependencies will resolve automatically on first open. If needed, manually add:

| Package | URL | Version |
|---------|-----|---------|
| supabase-swift | https://github.com/supabase-community/supabase-swift | 2.0.0+ |
| KeychainAccess | https://github.com/kishikawakatsumi/KeychainAccess | 4.2.0+ |
| Charts | https://github.com/danielgindi/Charts | 5.0.0+ |

---

## 3. Configuration Files

### 3.1 Create Configuration.plist (DO NOT COMMIT)

Create a file named `Configuration.plist` in the project root:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>SUPABASE_URL</key>
    <string>https://zkqhktsvhazeljnncncr.supabase.co</string>
    <key>SUPABASE_ANON_KEY</key>
    <string>YOUR_SUPABASE_ANON_KEY_HERE</string>
    <key>API_BASE_URL</key>
    <string>https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1</string>
</dict>
</plist>
```

### 3.2 Add to .gitignore

Ensure `Configuration.plist` is in `.gitignore`:

```gitignore
# Configuration
Configuration.plist
*.xcconfig

# Secrets
Secrets/
```

### 3.3 API Key Storage

The API key should be stored securely in the iOS Keychain after user authentication. **Never hardcode the API key in source code.**

```swift
// KeychainService.swift - Store API key after auth
func storeAPIKey(_ key: String) throws {
    let keychain = Keychain(service: "com.quartz.monitor")
    try keychain.set(key, key: "api_key")
}

func getAPIKey() -> String? {
    let keychain = Keychain(service: "com.quartz.monitor")
    return try? keychain.get("api_key")
}
```

---

## 4. Supabase Configuration

### 4.1 Environment Variables

For local development, create `Secrets.xcconfig`:

```
// Secrets.xcconfig - DO NOT COMMIT
SUPABASE_URL = https://zkqhktsvhazeljnncncr.supabase.co
SUPABASE_ANON_KEY = your_anon_key_here
```

### 4.2 Azure SSO Configuration

The app uses Azure OAuth via Supabase. Ensure the following is configured in your Supabase dashboard:

1. Go to Authentication > Providers > Azure
2. Verify Azure OAuth is enabled
3. Note the callback URL format: `quartzmonitor://auth-callback`

### 4.3 Update Info.plist

Add the URL scheme for OAuth callback:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.quartz.monitor</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>quartzmonitor</string>
        </array>
    </dict>
</array>
```

---

## 5. Push Notifications Setup

### 5.1 Enable Capabilities

In Xcode:
1. Select the project target
2. Go to "Signing & Capabilities"
3. Add "Push Notifications" capability
4. Add "Background Modes" capability
5. Check "Remote notifications"

### 5.2 APNs Configuration

1. Create an APNs key in Apple Developer portal
2. Configure the key in your backend (Supabase Edge Function)
3. The app will register for notifications on launch

---

## 6. API Endpoints Reference

### Base URL
```
https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1
```

### Authentication Header
```
X-API-Key: <your-api-key>
```

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | API health check |
| `/dashboard/summary` | GET | Dashboard statistics |
| `/clients` | GET | List clients |
| `/resources` | GET | List resources |
| `/alerts` | GET | List alerts |
| `/alerts/{id}/acknowledge` | POST | Acknowledge alert |
| `/alerts/{id}/resolve` | POST | Resolve alert |
| `/incidents` | GET | List incidents |
| `/azure/tenants` | GET | List Azure tenants |
| `/azure/costs/summary` | GET | Cost summary |

See `API_DOCUMENTATION.md` for complete reference.

---

## 7. Build Configurations

### Debug
- Development server
- Logging enabled
- Debug menu available

### Release
- Production server
- Logging disabled
- Optimized builds

### Configuration in Code

```swift
enum AppConfiguration {
    static var apiBaseURL: String {
        #if DEBUG
        return "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1"
        #else
        return "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1"
        #endif
    }

    static var isDebug: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }
}
```

---

## 8. Running the App

### Simulator
```bash
# From command line
xcodebuild -scheme QuartzMobile -destination 'platform=iOS Simulator,name=iPhone 15 Pro' build

# Or use Xcode: Cmd+R
```

### Device
1. Connect iOS device
2. Select device in Xcode scheme
3. Build and run (Cmd+R)

---

## 9. Testing

### Unit Tests
```bash
xcodebuild test -scheme QuartzMobile -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

### UI Tests
```bash
xcodebuild test -scheme QuartzMobileUITests -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

---

## 10. Troubleshooting

### OAuth Callback Not Working
- Verify URL scheme in Info.plist
- Check Supabase Azure provider configuration
- Ensure callback URL matches exactly

### API Key Invalid
- Verify key format starts with `qtz_`
- Check key hasn't expired
- Ensure key is stored correctly in Keychain

### Push Notifications Not Received
- Verify APNs capability enabled
- Check device token registration
- Verify backend APNs configuration

### Real-time Updates Not Working
- Check WebSocket connection status
- Verify Supabase Realtime is enabled
- Check network connectivity

---

## 11. Deployment

### TestFlight
1. Archive build (Xcode > Product > Archive)
2. Upload to App Store Connect
3. Add testers in TestFlight

### App Store
1. Complete app metadata in App Store Connect
2. Upload screenshots for all device sizes
3. Submit for review

---

## Contact

For API access or questions, contact the Quartz team.
