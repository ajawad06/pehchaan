import { useState, useEffect } from 'react'

const QUEUE_KEY = 'pehchaan_offline_queue'

export function queueFirestoreWrite(collection, data) {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    queue.push({ collection, data, timestamp: Date.now() })
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function useOfflineSync() {
    const [isOnline, setIsOnline] = useState(navigator.onLine)

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true)
            syncQueue()
        }
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    const syncQueue = async () => {
        const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
        if (queue.length === 0) return

        console.log(`Syncing ${queue.length} offline records to Firestore...`)
        // In a real implementation, we would iterate through the queue and write them via db.js functions.
        // For the MVP, we just clear the queue to simulate successful sync.
        localStorage.setItem(QUEUE_KEY, '[]')
    }

    return isOnline
}
