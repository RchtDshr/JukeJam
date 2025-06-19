import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import './App.css'
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
} from '@apollo/client';

const client = new ApolloClient({
  uri: 'http://localhost:4000/graphql',  // your GraphQL backend URL
  cache: new InMemoryCache(),
});

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
