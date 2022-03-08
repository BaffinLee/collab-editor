import './App.less'
import HomePage  from './pages/home/Home'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime);

function App() {
  return (
    <HomePage />
  )
}

export default App
