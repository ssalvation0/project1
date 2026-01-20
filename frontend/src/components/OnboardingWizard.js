import React, { useState } from 'react';
import './OnboardingWizard.css';

const STEPS = [
    { id: 1, title: 'Choose Class' },
    { id: 2, title: 'Armor Type' },
    { id: 3, title: 'Palette/Source' },
    { id: 4, title: 'Save/Share' }
];

const MOCK_CLASSES = ['Warrior', 'Mage', 'Rogue', 'Priest', 'Hunter', 'Paladin'];
const MOCK_ARMOR = ['Plate', 'Mail', 'Leather', 'Cloth'];
const MOCK_PALETTES = ['Dark', 'Light', 'Red', 'Blue', 'Gold', 'Green'];

function OnboardingWizard({ isOpen, onClose }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [selections, setSelections] = useState({
        class: '',
        armor: '',
        palette: ''
    });

    if (!isOpen) return null;

    const handleNext = () => {
        if (currentStep < 4) setCurrentStep(prev => prev + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(prev => prev - 1);
    };

    const handleSelect = (key, value) => {
        setSelections(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        // Save to LocalStorage
        try {
            const savedBuilds = JSON.parse(localStorage.getItem('guestBuilds') || '[]');
            const newBuild = { ...selections, id: Date.now(), createdAt: new Date().toISOString() };
            localStorage.setItem('guestBuilds', JSON.stringify([...savedBuilds, newBuild]));
        } catch (e) {
            console.error("Failed to save build", e);
        }

        // Close and reset
        onClose();
        setCurrentStep(1);
        setSelections({ class: '', armor: '', palette: '' });
    };

    return (
        <div className="wizard-overlay">
            <div className="wizard-modal">
                <button className="wizard-close" onClick={onClose} aria-label="Close">×</button>

                <div className="wizard-header">
                    <h2>Start Transmog Build</h2>
                    <div className="wizard-progress">
                        {STEPS.map(step => (
                            <div
                                key={step.id}
                                className={`step-indicator ${step.id === currentStep ? 'active' : ''} ${step.id < currentStep ? 'completed' : ''}`}
                            >
                                <div className="step-circle">{step.id}</div>
                                <span>{step.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="wizard-content">
                    {currentStep === 1 && (
                        <div className="step-view">
                            <h3>1. Choose Class</h3>
                            <div className="options-grid">
                                {MOCK_CLASSES.map(cls => (
                                    <button
                                        key={cls}
                                        className={`option-btn ${selections.class === cls ? 'selected' : ''}`}
                                        onClick={() => handleSelect('class', cls)}
                                    >
                                        {cls}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="step-view">
                            <h3>2. Armor Type</h3>
                            <div className="options-grid">
                                {MOCK_ARMOR.map(type => (
                                    <button
                                        key={type}
                                        className={`option-btn ${selections.armor === type ? 'selected' : ''}`}
                                        onClick={() => handleSelect('armor', type)}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="step-view">
                            <h3>3. Palette/Source</h3>
                            <div className="options-grid">
                                {MOCK_PALETTES.map(color => (
                                    <button
                                        key={color}
                                        className={`option-btn ${selections.palette === color ? 'selected' : ''}`}
                                        onClick={() => handleSelect('palette', color)}
                                    >
                                        {color}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="step-view">
                            <h3>4. Save or Share</h3>
                            <div className="summary-view">
                                <p><strong>Class:</strong> {selections.class || 'Not selected'}</p>
                                <p><strong>Armor:</strong> {selections.armor || 'Not selected'}</p>
                                <p><strong>Palette:</strong> {selections.palette || 'Not selected'}</p>
                            </div>
                            <p className="guest-note">Saved locally. Create an account to sync and share.</p>
                        </div>
                    )}
                </div>

                <div className="wizard-footer">
                    <button className="nav-btn back" onClick={handleBack} disabled={currentStep === 1}>Back</button>

                    {currentStep < 4 ? (
                        <button className="nav-btn next" onClick={handleNext}>Next</button>
                    ) : (
                        <button className="nav-btn finish" onClick={handleSave}>Save Build</button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default OnboardingWizard;
