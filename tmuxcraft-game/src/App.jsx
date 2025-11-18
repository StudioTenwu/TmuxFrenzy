import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Game from './Game'
import MultiplexGame from './MultiplexGame'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Game />} />
        <Route path="/multiplex" element={<MultiplexGame />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
