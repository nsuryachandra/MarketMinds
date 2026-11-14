import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { MarketProvider } from './context/MarketContext'
import { AIAssistant } from './pages/AIAssistant'
import { CompetitorIntelligence } from './pages/CompetitorIntelligence'
import { Dashboard } from './pages/Dashboard'
import { FinancialFeasibility } from './pages/FinancialFeasibility'
import { Landing } from './pages/Landing'
import { LocationComparison } from './pages/LocationComparison'
import { MarketExplorer } from './pages/MarketExplorer'
import { MarketTrends } from './pages/MarketTrends'
import { RiskAnalysis } from './pages/RiskAnalysis'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <MarketProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/market-explorer" element={<MarketExplorer />} />
            <Route path="/competitor-intelligence" element={<CompetitorIntelligence />} />
            <Route path="/market-trends" element={<MarketTrends />} />
            <Route path="/risk-analysis" element={<RiskAnalysis />} />
            <Route path="/location-comparison" element={<LocationComparison />} />
            <Route path="/financial-feasibility" element={<FinancialFeasibility />} />
            <Route path="/market-assistant" element={<AIAssistant />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MarketProvider>
    </BrowserRouter>
  )
}
