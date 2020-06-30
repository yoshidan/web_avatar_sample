import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'

import { Chat } from './components/chat'
import { Operation } from './components/operation'

export const Routes = () => (
  <Router>
    <Route component={Operation} path="/" exact />
    <Route component={Chat} path="/chat" />
  </Router>
)
