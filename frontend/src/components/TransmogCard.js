import React from 'react';
import './TransmogCard.css';

const TransmogCard = ({ item, onDelete }) => {
    return (
        <div className="transmog-card">
            <img src={item.imageURL} alt={item.name} className="transmog-image" />
            <div className="transmog-info">
                <h3>{item.name}</h3>
                <p><strong>Type:</strong> {item.type}</p>
                <p><strong>Source:</strong> {item.source}</p>
            </div>
            <button onClick={() => onDelete(item._id)} className="delete-button">Delete</button>
        </div>
    );
};

export default TransmogCard;