import { BackgroundConfig } from '@/types/settings'

export interface GASettings {
  measurementId: string
}

export interface SMTPSettings {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

export interface SSOSettings {
  provider: 'none' | 'google' | 'auth0' | 'oidc'
  clientId: string
  clientSecret: string
  issuerUrl: string
}

export interface BrandingSettings {
  adminAppName?: string
  mobileAppName?: string
  logoUrl?: string
  iconUrl?: string
  updatedAt?: string
  updatedBy?: string
  loginBackground?: BackgroundConfig
  homeBackground?: BackgroundConfig
  profileBackground?: BackgroundConfig
  loginBackgroundColor?: string
  applicationListBackground?: BackgroundConfig
}

export interface IntegrationsSettings {
  mobileGA: GASettings
  smtpMobile: SMTPSettings
  smtpAdmin: SMTPSettings
  ssoMobile: SSOSettings
  ssoAdmin: SSOSettings
  push?: {
    fcmServerKey?: string
    apnsKeyId?: string
    apnsTeamId?: string
    apnsKeyP8?: string
    apnsTopic?: string
  }
  deepLinks?: {
    iosAssociatedDomains?: string[]
    androidAppLinks?: string[]
    urlSchemes?: string[]
    adminRedirectUris?: string[]
  }
  monitoring?: {
    sentryDsn?: string
    environment?: string
    tracesSampleRate?: number
    profilesSampleRate?: number
  }
  featureFlags?: Record<string, boolean>
  endpoints?: {
    apiBaseUrl?: string
    websocketUrl?: string
    cdnBaseUrl?: string
  }
  auth?: {
    jwtTtlMinutes?: number
    refreshTtlDays?: number
    allowedProviders?: string[]
    redirectUris?: string[]
  }
  security?: {
    recaptchaSiteKey?: string
    recaptchaSecret?: string
    rateLimitRps?: number
    corsOrigins?: string[]
    cspConnectSrc?: string[]
  }
  storage?: {
    bucket?: string
    region?: string
    accessKeyId?: string
    secretAccessKey?: string
    cdnBaseUrl?: string
    maxUploadMb?: number
  }
  webAnalytics?: {
    gaMeasurementId?: string
    consentMode?: 'auto' | 'basic' | 'disabled'
  }
  branding?: {
    logoUrl?: string
    faviconUrl?: string
    primaryColor?: string
    termsUrl?: string
    privacyUrl?: string
    supportEmail?: string
  }
  localization?: {
    defaultLocale?: string
    availableLocales?: string[]
    fallbackBehavior?: 'nearest' | 'default'
  }
  payments?: {
    stripePublishableKey?: string
    stripeSecretKey?: string
    webhookSigningSecret?: string
  }
}

// Component Styles Types (for global component appearance settings)
export interface ComponentStyle {
  backgroundColor: string
  textColor: string
  borderRadius: number
  borderColor: string
  shadowLevel: 'none' | 'sm' | 'md' | 'lg'
}

export interface ComponentConfig {
  id: string
  name: string
  styles: ComponentStyle
}

export interface CategoryConfig {
  id: string
  name: string
  icon: string
  components: ComponentConfig[]
}

export interface GlobalComponentStyles {
  categories: CategoryConfig[]
}

const STORAGE_KEY = 'appkit.integrations.settings.v1'
const API_BASE = typeof window !== 'undefined' ? '/api/v1' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1')

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem('admin_token')
  } catch {
    return null
  }
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const settingsService = {
  async getIntegrations(): Promise<IntegrationsSettings | null> {
    // Try backend first
    try {
      const token = getAuthToken()
      if (token) {
        const res = await fetch(`${API_BASE}/settings/integrations`, {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          const settings = (data?.integrations || null) as IntegrationsSettings | null
          if (settings) {
            const storage = getStorage()
            storage?.setItem(STORAGE_KEY, JSON.stringify(settings))
            return settings
          }
        }
      }
    } catch {}

    // Fallback to local
    const storage = getStorage()
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return null
    try { return JSON.parse(raw) as IntegrationsSettings } catch { return null }
  },

  async saveIntegrations(settings: IntegrationsSettings): Promise<void> {
    // Try backend first
    try {
      const token = getAuthToken()
      if (token) {
        const res = await fetch(`${API_BASE}/settings/integrations`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(settings)
        })
        if (res.ok) {
          const storage = getStorage()
          storage?.setItem(STORAGE_KEY, JSON.stringify(settings))
          return
        }
      }
    } catch {}

    // Fallback to local
    const storage = getStorage()
    storage?.setItem(STORAGE_KEY, JSON.stringify(settings))
  }
  ,

  async getBranding(apiBase?: string): Promise<BrandingSettings | null> {
    const STORAGE_KEY_BRANDING = 'appkit.branding.settings.v1'
    try {
      const base = apiBase || (typeof window !== 'undefined' ? '/api/v1' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'))
      
      // Get authentication token
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
      
      const res = await fetch(`${base}/admin/config/branding`, { 
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      })
      if (!res.ok) throw new Error('API failed')
      const data = await res.json()
      // Cache to local
      const storage = getStorage()
      storage?.setItem(STORAGE_KEY_BRANDING, JSON.stringify(data?.branding))
      return (data?.branding as BrandingSettings) || null
    } catch {
       // Fallback to local
      const storage = getStorage()
      const raw = storage?.getItem(STORAGE_KEY_BRANDING)
      if (raw) {
          try { return JSON.parse(raw) as BrandingSettings } catch { return null }
      }
      return null
    }
  },

  async saveBranding(branding: BrandingSettings, apiBase?: string): Promise<BrandingSettings | null> {
    const STORAGE_KEY_BRANDING = 'appkit.branding.settings.v1'
     // Always save local first for immediate feedback
    const storage = getStorage()
    storage?.setItem(STORAGE_KEY_BRANDING, JSON.stringify(branding))

    try {
       const base = apiBase || (typeof window !== 'undefined' ? '/api/v1' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'))
       
       // Get authentication token
       const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
       
      const res = await fetch(`${base}/admin/config/branding`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify(branding)
      })
      if (!res.ok) return branding // Return branding processing local success if api fails
      const data = await res.json()
      return (data?.branding as BrandingSettings) || null
    } catch {
      return branding // Return local version if API fails
    }
  },

  async getTheme(apiBase?: string): Promise<MobileThemeConfig | null> {
    const STORAGE_KEY_THEME = 'appkit.theme.settings.v1'
    try {
      const base = apiBase || (typeof window !== 'undefined' ? '/api/v1' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'))
      const res = await fetch(`${base}/admin/config/themes`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })
      if (!res.ok) throw new Error('API failed')
      const data = await res.json()
      // Get default theme
      const defaultTheme = data?.themes?.find((t: any) => t.is_default) || data?.themes?.[0]
      if (defaultTheme?.theme_config) {
        const storage = getStorage()
        storage?.setItem(STORAGE_KEY_THEME, JSON.stringify(defaultTheme.theme_config))
        return defaultTheme.theme_config as MobileThemeConfig
      }
      return null
    } catch {
      // Fallback to local
      const storage = getStorage()
      const raw = storage?.getItem(STORAGE_KEY_THEME)
      if (raw) {
        try { return JSON.parse(raw) as MobileThemeConfig } catch { return null }
      }
      return null
    }
  },

  async saveTheme(themeConfig: MobileThemeConfig, apiBase?: string): Promise<MobileThemeConfig | null> {
    const STORAGE_KEY_THEME = 'appkit.theme.settings.v1'
    // Save local first
    const storage = getStorage()
    storage?.setItem(STORAGE_KEY_THEME, JSON.stringify(themeConfig))

    try {
      const base = apiBase || (typeof window !== 'undefined' ? '/api/v1' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'))
      const res = await fetch(`${base}/admin/config/themes/default`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ theme_config: themeConfig })
      })
      if (!res.ok) return themeConfig
      const data = await res.json()
      return (data?.theme?.theme_config as MobileThemeConfig) || themeConfig
    } catch {
      return themeConfig
    }
  },

  async getComponentStyles(): Promise<GlobalComponentStyles | null> {
    const COMPONENT_STYLES_KEY = 'appkit.component.styles.v1'
    // Try backend first
    try {
      const token = getAuthToken()
      if (token) {
        const res = await fetch(`${API_BASE}/settings/component-styles`, {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.componentStyles) {
            const storage = getStorage()
            storage?.setItem(COMPONENT_STYLES_KEY, JSON.stringify(data.componentStyles))
            return data.componentStyles as GlobalComponentStyles
          }
        }
      }
    } catch (e) {
      console.log('[settingsService] Backend component styles not available, using local')
    }
    // Fall back to localStorage
    const storage = getStorage()
    const raw = storage?.getItem(COMPONENT_STYLES_KEY)
    if (raw) {
      try { return JSON.parse(raw) as GlobalComponentStyles } catch { return null }
    }
    return null
  },

  async saveComponentStyles(styles: GlobalComponentStyles): Promise<boolean> {
    const COMPONENT_STYLES_KEY = 'appkit.component.styles.v1'
    try {
      const token = getAuthToken()
      if (!token) throw new Error('Not authenticated')

      const res = await fetch(`${API_BASE}/settings/component-styles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ componentStyles: styles })
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || `Failed to save: ${res.statusText}`)
      }

      const storage = getStorage()
      storage?.setItem(COMPONENT_STYLES_KEY, JSON.stringify(styles))
      return true
    } catch (e) {
      console.error('[settingsService] Backend save failed:', e)
      throw e
    }
  }
}


export interface DesignToken<T> {
  value: T
  label?: string
  description?: string
}

export interface MobileThemeConfig {
  id?: string
  name?: string
  isDefault?: boolean
  foundation: {
    colors: {
      primary: DesignToken<string>
      secondary: DesignToken<string>
      accent: DesignToken<string>
      background: DesignToken<string>
      surface: DesignToken<string>
      error: DesignToken<string>
      success: DesignToken<string>
      text: {
        primary: DesignToken<string>
        secondary: DesignToken<string>
        inverse: DesignToken<string>
        muted: DesignToken<string>
      }
    }
    radius: {
      none: DesignToken<number>
      xs: DesignToken<number>
      sm: DesignToken<number>
      md: DesignToken<number>
      lg: DesignToken<number>
      xl: DesignToken<number>
      full: DesignToken<number>
    }
    spacing: {
      xs: DesignToken<number>
      sm: DesignToken<number>
      md: DesignToken<number>
      lg: DesignToken<number>
      xl: DesignToken<number>
    }
  }
  components: {
    button: {
      borderRadius: string // Reference to foundation.radius
      paddingVertical: string
      paddingHorizontal: string
      primaryBackground: string
      primaryText: string
    }
    card: {
      borderRadius: string
      padding: string
      backgroundColor: string
      elevation: DesignToken<number>
    }
    input: {
      borderRadius: string
      backgroundColor: string
      borderWidth: DesignToken<number>
      paddingHorizontal: string
    }
  }
  // Legacy support
  colors?: {
    pink: {
      primary: string
      secondary: string
      light?: string
      dark?: string
    }
    text: {
      white: string
      primary?: string
      secondary?: string
    }
    background?: string
  }
  radius?: {
    button: number
    card: number
    input?: number
  }
}

export type { IntegrationsSettings as IntegrationsSettingsType }
