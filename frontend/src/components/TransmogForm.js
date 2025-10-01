import React, { useState } from 'react';
import './TransmogForm.css';

const TransmogForm = ({ onAdd }) => {
    const [formData, setFormData] = useState({
        name: '',
        itemID: '',
        type: 'Plate',
        source: 'Raid',
        imageURL: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onAdd(formData);
        setFormData({ name: '', itemID: '', type: 'Plate', source: 'Raid', imageURL: '' });
    };

    return (
        <form onSubmit={handleSubmit} className="transmog-form">
            <h2>Add New Transmog</h2>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Item Name" required />

            {}
            <select name="type" value={formData.type} onChange={handleChange} required>
                <option value="Plate">Plate</option>
                <option value="Mail">Mail</option>
                <option value="Leather">Leather</option>
                <option value="Cloth">Cloth</option>
                <option value="Weapon">Weapon</option>
                <option value="Shield">Shield</option>
            </select>

            {}
            <select name="source" value={formData.source} onChange={handleChange} required>
                <option value="Raid">Raid</option>
                <option value="Dungeon">Dungeon</option>
                <option value="Quest">Quest</option>
                <option value="PvP">PvP</option>
                <option value="Vendor">Vendor</option>
            </select>

            <input type="text" name="imageURL" value={formData.imageURL} onChange={handleChange} placeholder="Image URL" required />
            <button type="submit">Add Item</button>
        </form>
    );
};

export default TransmogForm;