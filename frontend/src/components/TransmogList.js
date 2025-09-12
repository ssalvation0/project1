import React, { useState, useEffect } from 'react';
import TransmogCard from './TransmogCard';
import TransmogForm from './TransmogForm';
import FilterBar from './FilterBar'; // Імпорт нового компонента
import './TransmogList.css';

const TransmogList = () => {
    const [transmogs, setTransmogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeFilter, setActiveFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

   const handleAdd = async (newItem) => {
        try {
            const response = await fetch('http://localhost:5001/api/transmogs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newItem),
            });
            const data = await response.json();
            if (response.ok) {
                setTransmogs([...transmogs, data]);
            } else {
                throw new Error(data.message || 'Failed to add item');
            }
        } catch (err) {
            console.error('Error adding item:', err);
        }
    };
    

    const fetchTransmogs = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/transmogs');
            if (!response.ok) {
                throw new Error('Failed to fetch transmogs.');
            }
            const data = await response.json();
            setTransmogs(data);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransmogs();
    }, []);

    const handleDelete = async (id) => {
        try {
            const response = await fetch(`http://localhost:5001/api/transmogs/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setTransmogs(transmogs.filter(item => item._id !== id));
            } else {
                throw new Error('Failed to delete item.');
            }
        } catch (err) {
            console.error('Error deleting item:', err);
        }
    };

    const filteredTransmogs = transmogs.filter(item => {
        const matchesFilter = activeFilter === 'All' || item.type === activeFilter;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    if (loading) {
        return <p>Loading transmogs...</p>;
    }

    if (error) {
        return <p>Error: {error}</p>;
    }

    return (
        <div className="transmog-list">
            <h1>WoW Transmog Guide</h1>
            <TransmogForm onAdd={handleAdd} />
            <FilterBar 
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />
            <div className="transmog-grid">
                {filteredTransmogs.length > 0 ? (
                    filteredTransmogs.map(item => (
                        <TransmogCard key={item._id} item={item} onDelete={handleDelete} />
                    ))
                ) : (
                    <p>No transmogs found matching your criteria. Try adjusting your filters!</p>
                )}
            </div>
        </div>
    );
};

export default TransmogList;