import { useState, useRef, useEffect } from 'react'
import { Input, Button, Spin, message } from 'antd'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import './App.css'

// 配置axios请求拦截器，添加重试机制
axios.interceptors.response.use(null, async error => {
  const config = error.config
  if (!config || !config.retry) return Promise.reject(error)

  config.retryCount = config.retryCount || 0
  if (config.retryCount >= config.retry) return Promise.reject(error)

  config.retryCount += 1
  await new Promise(resolve => setTimeout(resolve, config.retryDelay))
  return axios(config)
})

function App() {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uid, setUid] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    // 从localStorage获取uid，如果不存在则生成新的
    let storedUid = localStorage.getItem('chat_uid')
    if (!storedUid) {
      storedUid = uuidv4()
      localStorage.setItem('chat_uid', storedUid)
    }
    setUid(storedUid)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!inputValue.trim()) {
      message.warning('请输入内容')
      return
    }

    const userMessage = {
      type: 'user',
      content: inputValue
    }

    setMessages([...messages, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // 确保输入值为字符串类型
      const query= String(inputValue).trim()
      const userId = String(uid).trim()

      console.log('发送请求数据:', {
        query: query,
        uid: userId
      })
      const params = new URLSearchParams({
        query: query,
        uid: userId
      })
      const axiosConfig = {
        timeout: 60000, // 10秒超时
        retry: 2, // 最大重试次数
        retryDelay: 30000, // 重试间隔时间
      }
      
      try {
        const response = await axios.post(`http://47.120.4.177:5001/chat?${params.toString()}`, null, axiosConfig)
        const aiMessage = {
          type: 'ai',
          content: response.data.msg.output
        }
        console.log("ai返回的内容2",response.data.msg.output) //response.data
        console.log("response",response)
        setMessages(messages => [...messages, aiMessage])
      } catch (error) {
        if (error.code === 'ECONNABORTED') {
          message.error('请求超时，请稍后重试')
        } else if (error.code === 'ERR_NETWORK') {
          message.error('网络连接失败，请检查网络设置')
        } else {
          message.error(`请求失败: ${error.message}`)
        }
        console.log('错误信息:', error)
        console.error('API请求错误:', error)
      }
      //const response = await axios.get(`http://47.120.4.177:5001`)
      //可以正常返回结果
      
     
      //console.log("content1 ",aiMessage.content.data)
      //console.log("content2 ",aiMessage.content)
      //setMessages(messages => [...messages, aiMessage])
    } catch (error) {
      message.error('发送消息失败，请重试')
      console.log('发送消息失败，请重试:')
      console.log('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()  // 阻止默认的换行行为
      handleSend() //发送消息
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>育儿助手</h1>
      </div>
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.type === 'user' ? 'user-message' : 'ai-message'}`}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="thinking-message">
            <Spin size="small" />
            <span>正在思考中...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="input-container">
        <Input.TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="请输入您的问题..."
          autoSize={{ minRows: 1, maxRows: 4 }}
        />
        <Button
          type="primary"
          onClick={handleSend}
          disabled={isLoading}
        >
          发送
        </Button>
      </div>
    </div>
  )
}

export default App
