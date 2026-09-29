import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

import DashboardPage from './pages/DashboardPage'

function App() {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: { retry: 1 },
                },
            }),
    )
    return (
        <QueryClientProvider client={queryClient}>
            <DashboardPage />
        </QueryClientProvider>
    )
}

export default App
