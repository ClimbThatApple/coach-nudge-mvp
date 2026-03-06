import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './contexts/AppContext'
import { TeamsTab } from './teamsTab'
import { isInTeams } from './services/teams'
import './index.css'

const isTeams = isInTeams()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        {isTeams ? (
          <TeamsTab>
            <App />
          </TeamsTab>
        ) : (
          <App />
        )}
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
)
