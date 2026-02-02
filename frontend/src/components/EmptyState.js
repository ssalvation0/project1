import React from 'react';
import './EmptyState.css';

/**
 * EmptyState - Component for displaying when no data is available
 * @param {string} icon - Emoji or icon character to display
 * @param {string} title - Main heading text
 * @param {string} message - Supporting description text
 * @param {React.ReactNode} children - Optional action buttons or content
 */
const EmptyState = ({ icon = '📭', title = 'No Results', message = 'Nothing to display', children }) => {
    return (
        <div className="empty-state">
            <div className="empty-state-icon">{icon}</div>
            <h3 className="empty-state-title">{title}</h3>
            <p className="empty-state-message">{message}</p>
            {children && <div className="empty-state-actions">{children}</div>}
        </div>
    );
};

export default EmptyState;
