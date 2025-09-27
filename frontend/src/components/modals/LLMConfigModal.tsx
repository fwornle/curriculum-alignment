import React, { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../store'
import { closeModal } from '../../store/slices/uiSlice'
import { useLLM, useLLMCostTracking } from '../../hooks/useLLM'
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
import { cn } from "@/lib/utils.ts"

export const LLMConfigModal: React.FC = () => {
  const dispatch = useAppDispatch()
  const { modals } = useAppSelector(state => state.ui)
  const isOpen = modals?.llmConfig || false
  
  // Use LLM hooks for better integration
  const llm = useLLM()
  const costTracking = useLLMCostTracking()

  const [selectedProvider, setSelectedProvider] = useState(llm.currentConfiguration?.provider || '')
  const [apiKey, setApiKey] = useState('')
  const [modelName, setModelName] = useState(llm.currentConfiguration?.model || '')
  const [maxTokens, setMaxTokens] = useState(llm.currentConfiguration?.maxTokens?.toString() || '4000')
  const [temperature, setTemperature] = useState(llm.currentConfiguration?.temperature?.toString() || '0.7')
  const [topP, setTopP] = useState(llm.currentConfiguration?.topP?.toString() || '1.0')
  const [systemPrompt, setSystemPrompt] = useState(llm.currentConfiguration?.systemPrompt || '')

  // Update form when current configuration changes
  useEffect(() => {
    if (llm.currentConfiguration) {
      setSelectedProvider(llm.currentConfiguration.provider)
      setModelName(llm.currentConfiguration.model)
      setMaxTokens(llm.currentConfiguration.maxTokens?.toString() || '4000')
      setTemperature(llm.currentConfiguration.temperature?.toString() || '0.7')
      setTopP(llm.currentConfiguration.topP?.toString() || '1.0')
      setSystemPrompt(llm.currentConfiguration.systemPrompt || '')
    }
  }, [llm.currentConfiguration])

  const handleSaveConfiguration = () => {
    const provider = llm.providers.find(p => p.id === selectedProvider)
    if (!provider) return

    if (llm.currentConfiguration) {
      // Update existing configuration
      llm.editConfiguration(llm.currentConfiguration.id, {
        provider: selectedProvider,
        model: modelName,
        temperature: parseFloat(temperature),
        maxTokens: parseInt(maxTokens),
        topP: parseFloat(topP),
        systemPrompt: systemPrompt.trim() || undefined,
        presencePenalty: llm.currentConfiguration.presencePenalty,
        frequencyPenalty: llm.currentConfiguration.frequencyPenalty
      })
    } else {
      // Create new configuration
      const newConfig = {
        id: `config-${Date.now()}`,
        name: `${provider.name} - ${modelName}`,
        provider: selectedProvider,
        model: modelName,
        temperature: parseFloat(temperature),
        maxTokens: parseInt(maxTokens),
        topP: parseFloat(topP),
        presencePenalty: 0,
        frequencyPenalty: 0,
        systemPrompt: systemPrompt.trim() || undefined,
        isDefault: !llm.hasConfigurations,
        usageStats: {
          totalRequests: 0,
          totalTokens: 0,
          totalCost: 0
        }
      }
      llm.createConfiguration(newConfig)
    }

    dispatch(closeModal('llmConfig'))
  }

  const handleTestConnection = () => {
    if (llm.currentConfiguration && selectedProvider) {
      llm.testConnection(llm.currentConfiguration.id)
    }
  }

  const handleClose = () => {
    dispatch(closeModal('llmConfig'))
  }

  const selectedProviderData = llm.providers.find(p => p.id === selectedProvider)
  const testResult = llm.testResults[selectedProvider]

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
                      {llm.providers.map((provider) => (
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
                    <div className="text-2xl font-bold text-primary">
                      {llm.configurations.reduce((sum, config) => sum + config.usageStats.totalRequests, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Requests</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className={cn(
                      "text-2xl font-bold",
                      costTracking.isNearMonthlyLimit ? "text-ceu-error" : "text-ceu-warning"
                    )}>
                      ${costTracking.totalMonthlyCost.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">This Month</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-ceu-info">
                      {(llm.configurations.reduce((sum, config) => sum + config.usageStats.totalTokens, 0) / 1000).toFixed(1)}K
                    </div>
                    <div className="text-sm text-muted-foreground">Tokens Used</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-ceu-success">
                      {costTracking.monthlyBudgetPercentage.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Budget Used</div>
                  </div>
                </div>

                {/* Budget alerts */}
                {(costTracking.isNearMonthlyLimit || costTracking.isMonthlyBudgetExceeded) && (
                  <div className={cn(
                    "mt-4 p-4 rounded-lg",
                    costTracking.isMonthlyBudgetExceeded 
                      ? "bg-ceu-error/10 text-ceu-error" 
                      : "bg-ceu-warning/10 text-ceu-warning"
                  )}>
                    <div className="font-semibold">
                      {costTracking.isMonthlyBudgetExceeded ? '⚠️ Budget Exceeded' : '⚠️ Approaching Budget Limit'}
                    </div>
                    <div className="text-sm mt-1">
                      You've used ${costTracking.totalMonthlyCost.toFixed(2)} of your ${costTracking.monthlyBudget} monthly budget.
                    </div>
                  </div>
                )}
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
                      min="1"
                      max="200000"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(e.target.value)}
                    />
                    <div className="text-xs text-muted-foreground">
                      Maximum number of tokens to generate
                    </div>
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
                    <div className="text-xs text-muted-foreground">
                      Controls randomness (0 = focused, 2 = creative)
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="topP">Top P</Label>
                    <Input
                      id="topP"
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={topP}
                      onChange={(e) => setTopP(e.target.value)}
                    />
                    <div className="text-xs text-muted-foreground">
                      Nucleus sampling parameter
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="systemPrompt">System Prompt</Label>
                    <Input
                      id="systemPrompt"
                      placeholder="Custom system prompt for this configuration"
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                    />
                    <div className="text-xs text-muted-foreground">
                      Custom instructions for the model
                    </div>
                  </div>
                </div>

                {selectedProviderData && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Available Models</h4>
                    <div className="grid gap-2">
                      {selectedProviderData.models.map((model) => (
                        <div key={model.id} className="flex justify-between items-center text-sm">
                          <div>
                            <span className="font-medium">{model.name}</span>
                            <span className="text-muted-foreground ml-2">{model.description}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${model.costPer1kTokens.input}/${model.costPer1kTokens.output} per 1K tokens
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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