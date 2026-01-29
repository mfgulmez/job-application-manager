import { useState } from 'react';
import axios from 'axios';
import { TextField, Button, Box, MenuItem } from '@mui/material';

const STATUSES = ['DRAFT', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED'];

function AddJobForm({ onJobAdded }) {
    const [form, setForm] = useState({
        companyName: '', jobTitle: '', jobUrl: '', status: 'APPLIED', platformName: 'Manual'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        axios.post('/api/applications', form)
            .then(() => {
                setForm({ companyName: '', jobTitle: '', jobUrl: '', status: 'APPLIED', platformName: 'Manual' });
                onJobAdded(); // Close modal and refresh
            })
            .catch(err => alert("Error adding job"));
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField 
                label="Company Name" 
                fullWidth required
                value={form.companyName}
                onChange={(e) => setForm({...form, companyName: e.target.value})}
            />
            <TextField 
                label="Job Title" 
                fullWidth required
                value={form.jobTitle}
                onChange={(e) => setForm({...form, jobTitle: e.target.value})}
            />
            <TextField 
                label="Job URL (Optional)" 
                fullWidth
                value={form.jobUrl}
                onChange={(e) => setForm({...form, jobUrl: e.target.value})}
            />
            <TextField
                select
                label="Status"
                value={form.status}
                onChange={(e) => setForm({...form, status: e.target.value})}
            >
                {STATUSES.map((option) => (
                    <MenuItem key={option} value={option}>
                        {option}
                    </MenuItem>
                ))}
            </TextField>
            <Button type="submit" variant="contained" size="large">
                Save Application
            </Button>
        </Box>
    );
}

export default AddJobForm;