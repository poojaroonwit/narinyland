'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authService } from '../../services/authService'
import { settingsService } from '../../services/settingsService'
import { identityService } from '../../services/identityService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Separator } from '@/components/ui/Separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { Eye, EyeOff, Mail, Lock, AlertCircle, Layers, Chrome, Github, Twitter } from 'lucide-react'

import { Suspense } from 'react'

// Provider icons mapping
const providerIcons: Record<string, any> = {
  google: Chrome,
  github: Github,
  twitter: Twitter,
  facebook: Layers, // Placeholder
  microsoft: Layers, // Placeholder
  apple: Layers, // Placeholder
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [appName, setAppName] = useState('AppKit Admin')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loginBgStyle, setLoginBgStyle] = useState<React.CSSProperties>({})
  const [loginBgVideo, setLoginBgVideo] = useState<string | undefined>(undefined)
  const [ssoProviders, setSsoProviders] = useState<any[]>([])
  const [ssoLoading, setSsoLoading] = useState<string | null>(null)

  // Check if already authenticated and load settings
  useEffect(() => {
    if (authService.isAuthenticated()) {
        const redirect = searchParams?.get('redirect') || '/dashboard'
        router.push(redirect)
        return
    }
    
    // Load background settings and SSO providers
    const loadSettings = async () => {
      try {
        const settings = await settingsService.getBranding()
        if (settings?.adminAppName) {
          setAppName(settings.adminAppName)
        }
        if (settings?.logoUrl) {
          setLogoUrl(settings.logoUrl)
        }

        if (settings?.loginBackground) {
          const bg = settings.loginBackground
          const style: React.CSSProperties = {}
          let videoUrl: string | undefined
  
          if (bg.type === 'solid' && bg.value) {
            style.backgroundColor = bg.value
          } else if (bg.type === 'gradient' && bg.value) {
            style.background = bg.value
          } else if (bg.type === 'gradient' && bg.gradientStops) {
            style.background = `linear-gradient(${bg.gradientDirection?.replace('to-', 'to ') || 'to right'}, ${bg.gradientStops?.map(s => `${s.color} ${s.position}%`).join(', ')})`
          } else if (bg.type === 'image' && bg.value) {
            style.backgroundImage = `url(${bg.value})`
            style.backgroundSize = 'cover'
            style.backgroundPosition = 'center'
          } else if (bg.type === 'video' && bg.value) {
            videoUrl = bg.value
          }
  
          setLoginBgStyle(style)
          setLoginBgVideo(videoUrl)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }

      // Load SSO providers
      loadSSOProviders()
    }

    loadSettings()
  }, [router, searchParams])

  // Load SSO providers from identity service
  const loadSSOProviders = async () => {
    try {
      const { providers } = await identityService.getOAuthProviders()
      setSsoProviders((providers || []).filter((p: any) => p.isEnabled))
    } catch (error) {
      console.error('Failed to load SSO providers:', error)
    }
  }

  // Handle SSO login
  const handleSSOLogin = async (provider: string) => {
    setSsoLoading(provider)
    setError('')
    
    try {
      // For now, redirect to SSO flow (this would typically open a popup or redirect)
      const redirectUrl = searchParams?.get('redirect') || '/dashboard'
      window.location.href = `/api/v1/admin/auth/sso/${provider}?redirect=${encodeURIComponent(redirectUrl)}`
    } catch (error: any) {
      setError(error.message || `Failed to login with ${provider}`)
      setSsoLoading(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
        await authService.login({ email, password })
        const redirect = searchParams?.get('redirect') || '/dashboard'
        router.push(redirect)
    } catch (err: any) {
        setError(err.message || 'Login failed - please check your credentials')
    } finally {
        setIsLoading(false)
    }
  }

  return (
    <div className="h-screen w-full flex flex-col md:flex-row relative overflow-hidden text-gray-900" style={loginBgStyle}>

      {/* Helper for video background */}
      {loginBgVideo && (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <video
            src={loginBgVideo}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            style={{ filter: 'brightness(0.6)' }}
          />
        </div>
      )}

      {/* Default background if none set */}
      {Object.keys(loginBgStyle).length === 0 && !loginBgVideo && (
         <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-200" />
      )}

      {/* Left Column - App Name & Description */}
      <div className="flex-1 flex flex-col justify-center p-8 md:p-12 lg:p-20 relative z-10 pointer-events-none">
        <div className="max-w-3xl space-y-6 pointer-events-auto">
          <div className="flex items-center space-x-4 mb-2">
            <div className="p-3 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain" />
              ) : (
                <Layers className="h-10 w-10 text-blue-600 fill-blue-600/10" />
              )}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 drop-shadow-sm">
              {appName}
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-gray-600 font-light max-w-lg leading-relaxed ml-1">
            Access your administration console to manage content, users, and settings.
          </p>
        </div>
      </div>

      {/* Right Column - Login Panel (40% width on Desktop) */}
      <div className="w-full md:w-[40%] min-w-[320px] p-4 md:p-6 flex flex-col justify-center relative z-10 h-full">
        <Card
          className="w-full h-full relative border border-gray-200 shadow-2xl backdrop-blur-xl flex flex-col justify-center rounded-2xl"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderColor: 'rgba(229, 231, 235, 0.5)',
          }}
        >
          <CardHeader className="space-y-1 pb-2 flex flex-col items-center">
            <CardTitle className="text-3xl font-bold tracking-tight text-center">
              Sign in
            </CardTitle>
            <CardDescription className="text-center text-gray-500 text-lg">
              Welcome back
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-8 md:px-12">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-medium">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-600" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/50 border-white/30 focus:bg-white/90 transition-all hover:bg-white/70"
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-600" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 bg-white/50 border-white/30 focus:bg-white/90 transition-all hover:bg-white/70"
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="border-red-500 animate-in fade-in zoom-in-95 duration-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            {/* SSO Login Section */}
            {ssoProviders.length > 0 && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full bg-gray-200/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white/80 px-2 text-gray-500 backdrop-blur-sm rounded-full">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-600 text-center">
                    Sign in with your social account
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {ssoProviders.map((provider: any) => {
                      const IconComponent = providerIcons[provider.providerName] || Layers
                      return (
                        <Button
                          key={provider.providerName}
                          type="button"
                          variant="outline"
                          className="flex items-center gap-2 h-11 bg-white/60 border-white/40 hover:bg-white/80 transition-all"
                          onClick={() => handleSSOLogin(provider.providerName)}
                          disabled={ssoLoading === provider.providerName}
                        >
                          <IconComponent className="h-4 w-4" />
                          <span className="text-sm">
                            {ssoLoading === provider.providerName 
                              ? 'Connecting...' 
                              : provider.displayName || provider.providerName
                            }
                          </span>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

             <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full bg-gray-200/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-transparent px-2 text-gray-500 backdrop-blur-sm rounded-full">
                       Secure Login
                    </span>
                  </div>
              </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-gray-50">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}
