import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../store'
import { updateConfiguration, testLLMConnection } from '../../store/slices/llmConfigSlice'
import { closeModal } from '../../store/slices/uiSlice'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '../ui/tabs'
import { 
  Zap, 
  Settings, 
  Activity, 
  CheckCircle,
  XCircle
} from 'lucide-react'
import { cn } from '../../lib/utils'

export const LLMConfigModal: React.FC = () => {
  const dispatch = useAppDispatch()
  const { modals } = useAppSelector(state => state.ui)
  const isOpen = modals?.llmConfig || false
  const { 
    providers, 
    currentConfiguration, 
    testResults
  } = useAppSelector(state => state.llmConfig)

  const [selectedProvider, setSelectedProvider] = useState(currentConfiguration?.provider || '')
  const [apiKey, setApiKey] = useState('')
  const [modelName, setModelName] = useState(currentConfiguration?.model || '')
  const [maxTokens, setMaxTokens] = useState('4000')
  const [temperature, setTemperature] = useState('0.7')

  const handleSaveConfiguration = () => {
    const provider = providers.find(p => p.id === selectedProvider)
    if (!provider) return

    dispatch(updateConfiguration({
      id: 'default',
      updates: {
        provider: selectedProvider,
        model: modelName
      }
    }))
  }

  const handleTestConnection = () => {
    if (selectedProvider && apiKey) {
      dispatch(testLLMConnection(selectedProvider))
    }
  }

  const handleClose = () => {
    dispatch(closeModal('llmConfig'))
  }

  const selectedProviderData = providers.find(p => p.id === selectedProvider)
  const testResult = testResults[selectedProvider]

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            LLM Configuration
          </DialogTitle>
          <DialogDescription>
            Configure language models for curriculum analysis and AI-powered features
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="providers" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="usage">Usage & Costs</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-6">
            {/* Provider Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Provider Configuration
                </CardTitle>
                <CardDescription>
                  Select and configure your preferred LLM provider
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <div className="flex items-center gap-2">
                            <span>{provider.name}</span>
                            {provider.isActive && (
                              <CheckCircle className="h-3 w-3 text-ceu-success" />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProviderData && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="Enter your API key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        placeholder="e.g., gpt-4, claude-3-opus"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connection Test */}
            {selectedProvider && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Connection Test
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={handleTestConnection}
                      disabled={!apiKey}
                      size="sm"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Test Connection
                    </Button>
                    
                    {testResult && (
                      <div className={cn(
                        "flex items-center gap-2 text-sm",
                        testResult.success ? "text-ceu-success" : "text-ceu-error"
                      )}>
                        {testResult.success ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {testResult.error || 'Connection successful'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
                <CardDescription>
                  Monitor your LLM usage and associated costs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">1,234</div>
                    <div className="text-sm text-muted-foreground">Total Requests</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-ceu-warning">$45.67</div>
                    <div className="text-sm text-muted-foreground">This Month</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-ceu-info">2.3M</div>
                    <div className="text-sm text-muted-foreground">Tokens Used</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-ceu-success">98.5%</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>
                  Fine-tune model parameters for optimal performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxTokens">Max Tokens</Label>
                    <Input
                      id="maxTokens"
                      type="number"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature</Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSaveConfiguration}>
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}