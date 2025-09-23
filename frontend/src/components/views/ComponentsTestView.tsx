import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Alert, AlertDescription } from '../ui/alert'
import { LoginForm } from '../auth/LoginForm'
import { FileUpload } from '../upload/FileUpload'
import { useErrorHandler } from '../error/ErrorBoundary'
import { 
  Settings, 
  Upload, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Wifi,
  WifiOff
} from 'lucide-react'

export const ComponentsTestView: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const { throwError } = useErrorHandler()

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const testErrorBoundary = () => {
    throwError(new Error('Test error boundary functionality'))
  }

  const testPWAFeatures = () => {
    // Test service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        command: 'SKIP_WAITING'
      })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold academic-header">
            Infrastructure Components Test
          </h1>
          <p className="text-muted-foreground mt-1">
            Testing all Track 4 infrastructure features
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Alert className={isOnline ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm ${isOnline ? 'text-green-800' : 'text-red-800'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </Alert>
        </div>
      </div>

      <Tabs defaultValue="auth" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="upload">File Upload</TabsTrigger>
          <TabsTrigger value="error">Error Handling</TabsTrigger>
          <TabsTrigger value="pwa">PWA Features</TabsTrigger>
        </TabsList>

        <TabsContent value="auth" className="space-y-4">
          <Card className="academic-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Authentication System
              </CardTitle>
              <CardDescription>
                Test the login form with validation and social authentication options
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isAuthenticated ? (
                <div className="max-w-md mx-auto">
                  <LoginForm 
                    onSuccess={() => setIsAuthenticated(true)}
                    onSignupClick={() => console.log('Signup clicked')}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">Authentication Successful!</h3>
                  <p className="text-muted-foreground mt-2">
                    Login form is working correctly
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsAuthenticated(false)}
                  >
                    Test Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card className="academic-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                File Upload System
              </CardTitle>
              <CardDescription>
                Test drag-and-drop file upload with progress tracking and validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload 
                acceptedFormats={['.pdf', '.doc', '.docx', '.txt', '.xlsx']}
                maxFileSize={10}
                multiple={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="error" className="space-y-4">
          <Card className="academic-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Error Boundary System
              </CardTitle>
              <CardDescription>
                Test error handling and recovery mechanisms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  The error boundary will catch and display errors gracefully, providing recovery options.
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-4">
                <Button 
                  variant="destructive"
                  onClick={testErrorBoundary}
                  className="flex-1"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Trigger Test Error
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Test Page Reload
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>• Error boundary catches JavaScript errors</p>
                <p>• Provides user-friendly error messages</p>
                <p>• Offers recovery options (retry, home, report bug)</p>
                <p>• Logs errors to service in production</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pwa" className="space-y-4">
          <Card className="academic-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                PWA Features
              </CardTitle>
              <CardDescription>
                Test Progressive Web App functionality and offline capabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Service Worker</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {navigator.serviceWorker?.controller ? 
                        '✅ Service worker active' : 
                        '❌ Service worker not registered'
                      }
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={testPWAFeatures}
                    >
                      Test SW
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">App Install</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {window.matchMedia('(display-mode: standalone)').matches ?
                        '✅ Installed as PWA' :
                        '📱 Can be installed'
                      }
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        if ('beforeinstallprompt' in window) {
                          console.log('Install prompt available')
                        }
                      }}
                    >
                      Check Install
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Offline Support</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {isOnline ? 
                        '🌐 Currently online' : 
                        '📴 Offline mode active'
                      }
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        navigator.serviceWorker?.ready.then(reg => {
                          // Test background sync if available
                          if ('sync' in reg) {
                            (reg as any).sync.register('background-sync')
                          } else {
                            console.log('Background sync not supported')
                          }
                        }).catch(console.error)
                      }}
                    >
                      Test Offline
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Notifications</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {Notification.permission === 'granted' ?
                        '🔔 Notifications enabled' :
                        '🔕 Permission needed'
                      }
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        Notification.requestPermission().then(permission => {
                          if (permission === 'granted') {
                            new Notification('CEU Curriculum System', {
                              body: 'PWA notifications are working!',
                              icon: '/icon-192x192.png'
                            })
                          }
                        })
                      }}
                    >
                      Test Notification
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Alert className="border-blue-200 bg-blue-50">
                <Settings className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>PWA Features Active:</strong>
                  <ul className="mt-1 text-sm">
                    <li>• Offline caching with service worker</li>
                    <li>• App installation capability</li>
                    <li>• Background sync for uploads</li>
                    <li>• Push notification support</li>
                    <li>• Responsive design for mobile</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}