import React from 'react';
import { Tray } from '@phosphor-icons/react';
import './EmptyState.css';

const EmptyState = ({ icon = <Tray size={40} opacity={0.4} />, title = 'No Results', message = 'Nothing to display', children }) => {
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
