import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PatchNotes.css';

const MOCK_PATCHES = [
    {
        id: '10.2',
        title: 'Guardians of the Dream',
        date: 'Nov 7, 2023',
        desc: 'New Emerald Dream outdoor zone, Amirdrassil raid sets.',
        link: '/catalog?expansion=Dragonflight&patch=10.2'
    },
    {
        id: '10.1.7',
        title: 'Fury Incarnate',
        date: 'Sep 5, 2023',
        desc: 'Heritage Armor for Night Elf & Forsaken.',
        link: '/catalog?expansion=Dragonflight&patch=10.1.7'
    },
    {
        id: '10.1.5',
        title: 'Fractures in Time',
        date: 'Jul 11, 2023',
        desc: 'Dawn of the Infinite mega-dungeon sets.',
        link: '/catalog?expansion=Dragonflight&patch=10.1.5'
    }
];

const PatchNotes = () => {
    const navigate = useNavigate();

    return (
        <section className="patch-notes-section">
            <div className="patch-header">
                <h2>Latest Updates</h2>
                <span className="live-indicator">● LIVE</span>
            </div>

            <div className="patch-grid">
                {MOCK_PATCHES.map(patch => (
                    <div key={patch.id} className="patch-card">
                        <div className="patch-meta">
                            <span className="patch-version">Patch {patch.id}</span>
                            <span className="patch-date">Updated {patch.date}</span>
                        </div>
                        <h3>{patch.title}</h3>
                        <p>{patch.desc}</p>
                        <button
                            className="patch-link-btn"
                            onClick={() => navigate(patch.link)}
                        >
                            View New Sets
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default PatchNotes;
