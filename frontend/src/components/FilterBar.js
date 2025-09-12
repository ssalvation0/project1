import React from 'react';
import './FilterBar.css';

const FilterBar = ({ activeFilter, setActiveFilter, searchQuery, setSearchQuery }) => {
  const itemTypes = ['All', 'Cloth', 'Leather', 'Mail', 'Plate', 'Weapon', 'Shield'];

  return (
    <div className="filter-and-search-container">
      <div className="search-bar">
        <input 
          type="text" 
          placeholder="Search by name..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="filter-buttons">
        {itemTypes.map(type => (
          <button
            key={type}
            className={activeFilter === type ? 'active' : ''}
            onClick={() => setActiveFilter(type)}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FilterBar;