import React, { useState, useRef, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../store'
import { 
  sendMessage, 
  createChatSession, 
  setCurrentSession
} from '../../store/slices/chatSlice'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { 
  Send, 
  Mic, 
  MicOff, 
  Plus, 
  MessageSquare, 
  Bot, 
  User, 
  Paperclip,
  RotateCcw
} from 'lucide-react'
import { cn } from "@/lib/utils.js"


export const ChatInterface: React.FC = () => {
  const dispatch = useAppDispatch()
  const { 
    currentSession, 
    messages, 
    isConnected
  } = useAppSelector(state => state.chat)

  const [messageText, setMessageText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (!messageText.trim()) return

    dispatch(sendMessage({
      sessionId: currentSession?.id || '',
      content: messageText
    }))

    setMessageText('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleNewSession = () => {
    dispatch(createChatSession('New Analysis Chat'))
  }

  const handleClearSession = () => {
    if (currentSession) {
      dispatch(setCurrentSession(null))
    }
  }

  const handleVoiceToggle = () => {
    setIsRecording(!isRecording)
  }

  const handleFileAttach = () => {
    fileInputRef.current?.click()
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-primary-600" />
          <div>
            <h2 className="font-semibold">
              {currentSession?.title || 'AI Assistant'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'} • 
              {Array.isArray(messages) ? messages.length : 0} messages
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleVoiceToggle}
          >
            <Mic className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearSession}
            disabled={!currentSession || !Array.isArray(messages) || messages.length === 0}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleNewSession}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!Array.isArray(messages) || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Welcome to Curriculum Analysis AI</h3>
            <p className="text-muted-foreground max-w-md">
              I can help you analyze curricula, compare programs, generate reports, 
              and answer questions about educational content. How can I assist you today?
            </p>
            
            {/* Quick Suggestions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6 w-full max-w-2xl">
              <Button 
                variant="outline" 
                className="h-auto p-3 text-left"
                onClick={() => setMessageText("Compare two computer science programs")}
              >
                <div>
                  <div className="font-medium">Compare Programs</div>
                  <div className="text-sm text-muted-foreground">
                    Analyze similarities and differences
                  </div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto p-3 text-left"
                onClick={() => setMessageText("Check ABET accreditation compliance")}
              >
                <div>
                  <div className="font-medium">Check Compliance</div>
                  <div className="text-sm text-muted-foreground">
                    Verify accreditation standards
                  </div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto p-3 text-left"
                onClick={() => setMessageText("Generate curriculum gap analysis")}
              >
                <div>
                  <div className="font-medium">Gap Analysis</div>
                  <div className="text-sm text-muted-foreground">
                    Identify missing components
                  </div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto p-3 text-left"
                onClick={() => setMessageText("Help me understand this curriculum structure")}
              >
                <div>
                  <div className="font-medium">Explain Structure</div>
                  <div className="text-sm text-muted-foreground">
                    Break down curriculum components
                  </div>
                </div>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {Array.isArray(messages) && messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "flex gap-3 max-w-[80%]",
                    message.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                    message.role === 'user' 
                      ? "bg-primary-600 text-white" 
                      : "bg-muted"
                  )}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={cn(
                    "rounded-lg p-3 space-y-2",
                    message.role === 'user'
                      ? "bg-primary-600 text-white"
                      : "bg-muted"
                  )}>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </div>
                    
                    {/* Attachments */}
                    {message.metadata?.attachments && message.metadata.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {message.metadata.attachments.map((attachment: string, index: number) => (
                          <div 
                            key={index}
                            className="text-xs bg-white/20 rounded px-2 py-1 flex items-center gap-1"
                          >
                            <Paperclip className="h-3 w-3" />
                            {attachment}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className={cn(
                      "text-xs opacity-70",
                      message.role === 'user' ? "text-right" : "text-left"
                    )}>
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {false && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="animate-pulse">Thinking...</div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-card p-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message about curriculum analysis..."
              className="min-h-[60px] max-h-[120px] resize-none pr-20"
              disabled={!isConnected}
            />
            
            {/* Voice Recording Indicator */}
            {isRecording && (
              <div className="absolute top-2 right-12 flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-red-500">Recording</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleFileAttach}
              disabled={!isConnected}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={handleVoiceToggle}
              disabled={!isConnected}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || !isConnected}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="mt-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
            Connection lost. Trying to reconnect...
          </div>
        )}

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.txt"
          onChange={(e) => {
            // Handle file upload
            console.log('Files selected:', e.target.files)
          }}
        />
      </div>
    </div>
  )
}