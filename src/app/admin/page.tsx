'use client'

import { useState } from 'react'

export default function AdminPage() {
  const [status, setStatus] = useState('')

  async function clearSubscriptions() {
    if (!confirm('确定要清除所有订阅吗？')) {
      return
    }

    try {
      const response = await fetch('/api/clear', {
        method: 'POST',
      })
      const data = await response.json()

      if (data.success) {
        setStatus('清除成功')
      } else {
        setStatus('清除失败: ' + data.error)
      }
    } catch (error) {
      setStatus('操作出错: ' + error)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">推送通知管理</h1>

      <div className="space-y-4">
        <button
          onClick={clearSubscriptions}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          清除所有订阅
        </button>

        {status && (
          <p className="text-sm text-gray-600">
            {status}
          </p>
        )}
      </div>
    </div>
  )
} 