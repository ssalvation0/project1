import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Catalog from './pages/Catalog';


function App() {
  return (
    <Router>
      <Header />
      <Routes>
         <Route path="/" element={<Home />} />
         <Route path="/catalog" element={<Catalog />} />
      </Routes>
    </Router>
  );
}

export default App;