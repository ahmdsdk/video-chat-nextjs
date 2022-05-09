import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    IconButton,
    TextField,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Drawer,
    Box
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import MenuIcon from '@mui/icons-material/Menu';

export default function NavBar({ showMenu, setShowMenu, allUsers, setNameToCall, callUser, userId }) {
    return (
        <>
            <AppBar style={{height: '80px', justifyContent: 'center', alignItems: 'flex-start',}} position="absolute" top="0" height={100}>
                <Toolbar variant="dense">
                    <IconButton onClick={() => setShowMenu(!showMenu)} edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" color="inherit" component="div">Video Chat App</Typography>
                </Toolbar>
            </AppBar>

            <Drawer
                anchor={"top"}
                open={showMenu}
                onClose={() => setShowMenu(!showMenu)}
                >
                <Box
                    sx={{ width: 'auto', minHeight: '200px'}}
                    role="presentation"
                    onClick={() => setShowMenu(!showMenu)}
                    onKeyDown={() => setShowMenu(!showMenu)}
                    >
                    <List>
                        <div style={{marginBottom: "30px"}}>{allUsers.length - 1} Online Users</div>
                        {allUsers.filter(u => u.id !== userId).map((user, index) => (
                        <ListItem
                            button
                            onClick={() => {
                                setNameToCall(user.name);
                                callUser(user.id);
                            }}
                            key={index}>
                            <ListItemIcon>
                                <PhoneIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={user.name} />
                        </ListItem>
                        ))}
                    </List>
                </Box>
            </Drawer>
        </>
    )
}