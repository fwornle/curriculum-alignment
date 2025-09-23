import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../store'
import { updateConfiguration, testLLMConnection } from '../../store/slices/llmConfigSlice'
import { closeModal } from '../../store/slices/uiSlice'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
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
  DollarSign, 
  Activity, 
  CheckCircle,
  AlertCircle,
  Plus
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
  const [customEndpoint, setCustomEndpoint] = useState('')
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
            <Zap className="h-5 w-5 text-primary-600" />
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
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProviderData && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Select value={modelName} onValueChange={setModelName}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus'].map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endpoint">Custom Endpoint (Optional)</Label>
                      <Input
                        id="endpoint"
                        value={customEndpoint}
                        onChange={(e) => setCustomEndpoint(e.target.value)}
                        placeholder="https://api.openai.com/v1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxTokens">Max Tokens</Label>
                        <Input
                          id="maxTokens"
                          type="number"
                          value={maxTokens}
                          onChange={(e) => setMaxTokens(e.target.value)}
                          min="1"
                          max="32000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="temperature">Temperature</Label>
                        <Input
                          id="temperature"
                          type="number"
                          step="0.1"
                          value={temperature}
                          onChange={(e) => setTemperature(e.target.value)}
                          min="0"
                          max="2"
                        />
                      </div>
                    </div>

                    {/* Test Connection */}
                    <div className="flex items-center gap-2 pt-4">
                      <Button 
                        onClick={handleTestConnection}
                        disabled={!selectedProvider || !apiKey}
                        variant="outline"
                      >
                        Test Connection
                      </Button>
                      
                      {testResult && (
                        <div className={cn(
                          "flex items-center gap-1 text-sm",
                          testResult.success ? "text-green-600" : "text-red-600"
                        )}>
                          {testResult.success ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          {testResult.success ? 'Connection successful' : 'Connection failed'}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            {/* Usage Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Usage Statistics
                </CardTitle>
                <CardDescription>
                  Monitor your LLM usage and costs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary-600">
                      0
                    </div>
                    <div className="text-sm text-muted-foreground">Total Requests</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary-600">
                      0
                    </div>
                    <div className="text-sm text-muted-foreground">Total Tokens</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      $0.00
                    </div>
                    <div className="text-sm text-muted-foreground">Total Cost</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      $100.00
                    </div>
                    <div className="text-sm text-muted-foreground">Monthly Budget</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Cost Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyBudget">Monthly Budget ($)</Label>
                  <Input
                    id="monthlyBudget"
                    type="number"
                    defaultValue="100"
                    placeholder="Set monthly budget"
                  />
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: '0%' }}
                  />
                </div>
                
                <div className="text-sm text-muted-foreground">
                  $0.00 of $100.00 used this month
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            {/* Advanced Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Advanced Configuration</CardTitle>
                <CardDescription>
                  Advanced settings for power users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="systemPrompt">System Prompt</Label>
                  <Textarea
                    id="systemPrompt"
                    placeholder="Enter custom system prompt for curriculum analysis..."
                    rows={4}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="retryAttempts">Retry Attempts</Label>
                  <Input
                    id="retryAttempts"
                    type="number"
                    defaultValue="3"
                    min="1"
                    max="10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timeout">Request Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    defaultValue="30"
                    min="10"
                    max="300"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Custom Providers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Custom Providers
                  <Button size="sm" variant="outline">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Provider
                  </Button>
                </CardTitle>
                <CardDescription>
                  Add custom or self-hosted LLM providers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* This would show a list of custom providers */}
                <div className="text-center py-8 text-muted-foreground">
                  No custom providers configured
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-6 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveConfiguration}
            disabled={!selectedProvider}
          >
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}