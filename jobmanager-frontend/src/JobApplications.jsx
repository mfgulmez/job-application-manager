import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    Container, Box, Typography, TextField, Dialog, DialogTitle, DialogContent, 
    MenuItem, Select, InputLabel, FormControl 
} from '@mui/material';

// ✅ FIXED IMPORTS: Points to .components/ instead of .//
import Navbar from './components/Navbar';
import AddJobForm from './components/AddJobForm';
import Dashboard from './components/Dashboard';
import ApplicationTable from './components/ApplicationTable';

function JobApplications() {
    const [applications, setApplications] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [groupBy, setGroupBy] = useState("status");
    const [isAddModalOpen, setAddModalOpen] = useState(false);

    const fetchApplications = () => {
        axios.get('/api/applications')
            .then(res => setApplications(res.data))
            .catch(err => console.error(err));
    };

    useEffect(() => { fetchApplications(); }, []);

    const handleDelete = (id) => {
        if(window.confirm("Delete this application?")) {
            axios.delete(`/api/applications/${id}`).then(fetchApplications);
        }
    };

    // --- ✨ The Grouping Logic ---
    const groupedApplications = useMemo(() => {
        // 1. Filter first (WITH SAFETY CHECKS)
        const filtered = applications.filter(app => {
            // ✅ CRASH FIX: Handle null/undefined values safely
            const companyName = (app.company?.name || "").toLowerCase();
            const jobTitle = (app.jobTitle || "").toLowerCase();
            const search = searchTerm.toLowerCase();
            
            return companyName.includes(search) || jobTitle.includes(search);
        });

        // 2. Group items
        const groups = {};
        filtered.forEach(app => {
            let key = 'Unknown';
            // Determine the key based on user selection
            if (groupBy === 'status') {
                key = app.status || 'Unknown';
            } else if (groupBy === 'company') {
                key = app.company?.name || 'No Company';
            } else if (groupBy === 'platform') {
                key = app.platform?.name || 'No Platform';
            }

            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(app);
        });

        // 3. Sort inside groups (Newest first)
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => {
                const dateA = new Date(a.appliedAt || a.createdAt);
                const dateB = new Date(b.appliedAt || b.createdAt);
                return dateB - dateA;
            });
        });

        return groups;
    }, [applications, searchTerm, groupBy]);

    // Helper to sort the Group Headers (e.g. Put 'OFFER' at top)
    const getSortedKeys = () => {
        const keys = Object.keys(groupedApplications);
        if (groupBy === 'status') {
            const order = ['OFFER', 'INTERVIEWING', 'APPLIED', 'DRAFT', 'REJECTED', 'WITHDRAWN'];
            return keys.sort((a, b) => {
                const idxA = order.indexOf(a);
                const idxB = order.indexOf(b);
                const valA = idxA === -1 ? 99 : idxA;
                const valB = idxB === -1 ? 99 : idxB;
                return valA - valB;
            });
        }
        return keys.sort(); // Alphabetical order for Companies/Platforms
    };

    return (
        <Box sx={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
            <Navbar onAddClick={() => setAddModalOpen(true)} />

            <Container maxWidth="xl" sx={{ mt: 4, pb: 4, mx: 'auto' }}>
                <Dashboard refreshTrigger={applications} />

                {/* --- Toolbar: Search & Group By --- */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, mt: 4, gap: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: '600', color: '#34495e' }}>
                        My Applications
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {/* Group By Dropdown */}
                        <FormControl size="small" sx={{ minWidth: 150, bgcolor: 'white' }}>
                            <InputLabel>Group By</InputLabel>
                            <Select
                                value={groupBy}
                                label="Group By"
                                onChange={(e) => setGroupBy(e.target.value)}
                            >
                                <MenuItem value="status">📌 Status</MenuItem>
                                <MenuItem value="company">🏢 Company</MenuItem>
                                <MenuItem value="platform">🌐 Platform</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Search Bar */}
                        <TextField 
                            size="small" 
                            label="Search jobs..." 
                            variant="outlined" 
                            sx={{ bgcolor: 'white' }}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </Box>
                </Box>

                {/* --- Render Groups --- */}
                {getSortedKeys().map(groupKey => (
                    <Box key={groupKey} sx={{ mb: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h6" color="primary" sx={{ mr: 1, fontWeight: 'bold' }}>
                                {groupKey}
                            </Typography>
                            <Typography variant="caption" sx={{ bgcolor: '#e0e0e0', px: 1, borderRadius: 1 }}>
                                {groupedApplications[groupKey].length}
                            </Typography>
                        </Box>
                        
                        <ApplicationTable 
                            applications={groupedApplications[groupKey]} 
                            onDelete={handleDelete}
                        />
                    </Box>
                ))}

                {getSortedKeys().length === 0 && (
                    <Typography textAlign="center" color="text.secondary" sx={{ mt: 5 }}>
                        No applications found.
                    </Typography>
                )}

            </Container>

            <Dialog open={isAddModalOpen} onClose={() => setAddModalOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Add New Job Manually</DialogTitle>
                <DialogContent>
                    <AddJobForm 
                        onJobAdded={() => {
                            fetchApplications();
                            setAddModalOpen(false);
                        }} 
                    />
                </DialogContent>
            </Dialog>
        </Box>
    );
}

export default JobApplications;