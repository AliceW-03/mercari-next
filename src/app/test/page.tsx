'use client'

import { useState } from 'react'
import { sendNotification } from '../actions'

export default function TestPage() {
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')

  async function handleSendTest() {
    try {
      setStatus('发送中...')
      const item = {
        id: "m53658219971",
        sellerId: "216656760",
        buyerId: "",
        status: "ITEM_STATUS_ON_SALE",
        name: "神様なんか信じない僕らのエデン　一ノ瀬ゆま　とらのあな　TSUTAYA　特典",
        price: "2199",
        created: "1722428919",
        updated: "1735389073",
        thumbnails: [
          "https://static.mercdn.net/c!/w=240,f=webp/thumb/photos/m53658219971_1.jpg?1722428919",
        ],
        itemType: "ITEM_TYPE_MERCARI",
        itemConditionId: "1",
        shippingPayerId: "2",
        itemSizes: [],
        itemBrand: null,
        itemPromotions: [],
        shopName: "",
        itemSize: null,
        shippingMethodId: "17",
        categoryId: "666",
        isNoPrice: false,
        title: "",
        isLiked: false,
        photos: [
          {
            uri: "https://static.mercdn.net/item/detail/webp/photos/m53658219971_1.jpg?1722428919",
          },
        ],
        auction: null,
      }
      const result = await sendNotification(message)
      if (result.success) {
        setStatus('发送成功')
        setMessage('')
      } else {
        setStatus(`发送失败: ${result.error}`)
      }
    } catch (error) {
      setStatus(`错误: ${error}`)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">推送测试</h1>

      <div className="space-y-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="输入推送消息"
          className="w-full p-2 border rounded"
          rows={4}
        />

        <button
          onClick={handleSendTest}
          disabled={!message}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          发送测试推送
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