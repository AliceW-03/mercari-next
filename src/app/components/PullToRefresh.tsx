'use client'

import { useEffect, useState } from 'react'

export function PullToRefresh() {
  const [startY, setStartY] = useState(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const threshold = 100 // 触发刷新的阈值

  useEffect(() => {
    let touchStartY = 0

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        touchStartY = e.touches[0].clientY
        setStartY(touchStartY)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (startY > 0) {
        const currentY = e.touches[0].clientY
        const distance = Math.max(0, currentY - startY)
        // 添加阻尼效果
        const dampenedDistance = Math.min(distance * 0.5, threshold * 1.5)
        setPullDistance(dampenedDistance)

        if (dampenedDistance > threshold) {
          setIsRefreshing(true)
        } else {
          setIsRefreshing(false)
        }

        // 防止页面滚动
        if (window.scrollY === 0 && distance > 0) {
          e.preventDefault()
        }
      }
    }

    const handleTouchEnd = () => {
      if (isRefreshing) {
        // 显示加载动画
        setPullDistance(threshold)
        setTimeout(() => {
          window.location.reload()
        }, 500) // 给用户一个视觉反馈的时间
      } else {
        // 回弹动画
        setPullDistance(0)
      }
      setStartY(0)
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [startY, isRefreshing])

  return (
    <div
      className="fixed top-0 left-0 right-0 flex items-center justify-center overflow-hidden"
      style={{
        height: `${pullDistance}px`,
        transition: startY ? 'none' : 'height 0.2s ease-out'
      }}
    >
      <div
        className={`flex items-center space-x-2 text-blue-500 transform ${isRefreshing ? 'scale-110' : ''
          }`}
        style={{
          opacity: Math.min(pullDistance / threshold, 1),
          transform: `rotate(${(pullDistance / threshold) * 360}deg)`
        }}
      >
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm font-medium">
          {isRefreshing ? '释放以刷新' : '下拉刷新'}
        </span>
      </div>
    </div>
  )
} 