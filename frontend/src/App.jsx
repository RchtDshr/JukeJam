import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import './App.css'
import {
  ApolloProvider,
} from '@apollo/client';
import client from './graphql/client';

function App() {

  return (
     <ApolloProvider client={client}>
      <Router>
        <AppRoutes />
      </Router>
    </ApolloProvider>
  )
}

export default App
