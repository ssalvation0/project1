import React from 'react';
import { useNavigate } from 'react-router-dom';
import './OnboardingWizard.css';

const CLASS_ICON_BASE = 'https://wow.zamimg.com/images/wow/icons/medium';

const WOW_CLASSES = [
    { name: 'Warrior', slug: 'warrior', color: '#C79C6E' },
    { name: 'Paladin', slug: 'paladin', color: '#F58CBA' },
    { name: 'Hunter', slug: 'hunter', color: '#ABD473' },
    { name: 'Rogue', slug: 'rogue', color: '#FFF569' },
    { name: 'Priest', slug: 'priest', color: '#FFFFFF' },
    { name: 'Death Knight', slug: 'deathknight', color: '#C41E3A' },
    { name: 'Shaman', slug: 'shaman', color: '#0070DE' },
    { name: 'Mage', slug: 'mage', color: '#69CCF0' },
    { name: 'Warlock', slug: 'warlock', color: '#9482C9' },
    { name: 'Monk', slug: 'monk', color: '#00FF96' },
    { name: 'Druid', slug: 'druid', color: '#FF7D0A' },
    { name: 'Demon Hunter', slug: 'demonhunter', color: '#A330C9' },
    { name: 'Evoker', slug: 'evoker', color: '#33937F' },
];

function OnboardingWizard({ isOpen, onClose }) {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleClassClick = (className) => {
        const slug = className.toLowerCase().replace(/ /g, '');
        onClose();
        navigate(`/catalog?class=${slug}`);
    };

    return (
        <div className="wizard-overlay" onClick={onClose}>
            <div className="wizard-modal" onClick={(e) => e.stopPropagation()}>
                <button className="wizard-close" onClick={onClose} aria-label="Close">×</button>

                <div className="wizard-header">
                    <h2>Choose Your Class</h2>
                    <p className="wizard-subtitle">Select a class to browse its transmog sets</p>
                </div>

                <div className="wizard-content">
                    <div className="class-picker-grid">
                        {WOW_CLASSES.map(cls => (
                            <button
                                key={cls.name}
                                className="class-pick-btn"
                                onClick={() => handleClassClick(cls.name)}
                                style={{ '--class-color': cls.color }}
                            >
                                <img
                                    src={`${CLASS_ICON_BASE}/classicon_${cls.slug}.jpg`}
                                    alt={cls.name}
                                    className="class-pick-icon"
                                    loading="lazy"
                                />
                                <span className="class-pick-name">{cls.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OnboardingWizard;
