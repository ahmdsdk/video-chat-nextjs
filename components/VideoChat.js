import React, { useEffect, useRef, useState } from "react";
import { Button } from "@mui/material";
import Peer from "simple-peer";
import NavBar from "./NavBar";
import styles from '/styles/Videochat.module.css';

export default function VideoChat({ userName, userId, setUserId, socket }) {
	const [stream, setStream] = useState();
	const [receivingCall, setReceivingCall] = useState(false);
	const [caller, setCaller] = useState("");
    const [callerName, setCallerName] = useState("");
    const [nameToCall, setNameToCall] = useState("");
	const [callerSignal, setCallerSignal] = useState();
	const [callAccepted, setCallAccepted] = useState(false);
	const [idToCall, setIdToCall] = useState("");
	const [callEnded, setCallEnded] = useState(true);
    const [allUsers, setAllUsers] = useState([]);
    const [getInitialUsers, setGetInitialUsers] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [usersInCall, setUsersInCall] = useState([]);
    const [peers, setPeers] = useState([]);
    const [streams, setStreams] = useState([]);

	const myVideo = useRef();
	const peersRef = useRef([]);
	const connectionRef = useRef();

	useEffect(() => {
        // request video and audio and get user stream
		navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
			setStream(stream);
            if (myVideo.current) myVideo.current.srcObject = stream;
		});

        // request all users from socket
        socket.emit("getUsers");

        socket.on("allUsers", (users) => {
            console.log("got users", users);
            setAllUsers(users);
            setGetInitialUsers(true);
        });

        // listen to when user got disconnected and connected again with a new socket id
        socket.on("userId", (id) => {
            if (id !== userId) {
                console.log("updating user id");
                setUserId(id);
                socket.emit("updateUserId", { name: userName, id: userId });
            }
        });

        // listen to calls received
        socket.on("userCalling", (data) => {
            setReceivingCall(true);
            setCallEnded(false);
            setCaller(data.from);
            setCallerSignal(data.signal);
            setCallerName(data.name);
        });

        socket.on("callEnded", (id) => {
            console.log("call ended with", id);
        });

        return () => {
            console.log("offloading");
            socket.off("allUsers");
            socket.off("userId");
            socket.off("userCalling");
            socket.off("callEnded");
        }
    }, []);

    const createPeer = (initiator) => {
        const peer = new Peer({
            initiator,
            trickle: false,
            stream,
        });

        return peer;
    }

    const callUser = (id) => {
        setCallAccepted(true);
        setCallEnded(false);
        setIdToCall(id);

        // create new peer with initiator true
        const peer = createPeer(true);

        // remove all listeners when peer is closed
        peer.on('close', () => {
            peer.removeAllListeners("signal");
            peer.removeAllListeners("stream");
            socket.off("callAccepted");
            setStreams([]);
		});

        // listen to signal and emit call user to the socket
        peer.on("signal", (data) => {
            socket.emit("callUser", {
                userToCall: id,
                signalData: data,
                from: userId,
                name: userName
            });
        });

        // listen to when stream is received from other side and add it to the streams array
        peer.on("stream", (stream) => {
            setStreams(s => [...s, stream]);
        });

        // listen to when call is accepted and send signal
        socket.on("callAccepted", (signal) => {
            peer.signal(signal);
        });

        setPeers(p => [...p, peer]);
    
        connectionRef.current = peer;
    }

    const answerCall = () =>  {
        setCallAccepted(true);
        setCallEnded(false);
        setReceivingCall(false);

        setUsersInCall(s => [...s, {name: callerName, id: caller}]);

        // create a new peer with initiator false
        const peer = createPeer(false);

        // remove all listeners when peer is closed
        peer.on('close', () => {
            console.log('answer peer closed');
            peer.removeAllListeners("signal");
            peer.removeAllListeners("stream");
            setStreams([]);
        });

        // listen to when signal is received and emit answer call to socket
        peer.on("signal", (data) => {
            socket.emit("answerCall", { signal: data, to: caller });
        });

        // listen to when stream is received and add it to the streams array
        peer.on("stream", (stream) => {
            setStreams(s => [...s, stream]);
        });

        // send signal to caller
        peer.signal(callerSignal);

        setPeers(p => [...p, peer]);
        connectionRef.current = peer;
    }

    const leaveCall = () => {
        setCallEnded(true);
        setCallAccepted(false);
        setReceivingCall(false);
        connectionRef.current.destroy();
        socket.emit("endCall");
    }

    return (
        <div className={styles.container}>
            <NavBar
                showMenu={showMenu}
                setShowMenu={setShowMenu}
                allUsers={allUsers}
                setNameToCall={setNameToCall}
                callUser={callUser}
                userId={userId}
                />

            <div style={{marginTop: "100px"}}>
                {receivingCall && (
                <div className={styles.caller}>
                    <h1 >{callerName} is calling...</h1>
                    <Button variant="contained" color="primary" onClick={() => answerCall()}>Answer</Button>
                </div>
                )}
            </div>

            <div className={styles.videoContainer}>
                <div className={styles.video}>
                    <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px" }} />
                </div>
                <div className={styles.video}>
                    {streams.map((stream, index) => <video key={index} playsInline ref={r => r ? r.srcObject = stream : null} autoPlay style={{ width: "300px"}} />)}
                </div>
            </div>
            <div className={styles.myId}>
                <div style={{marginBottom: "10px"}}>Name: {userName}</div>
                
                <div style={{marginBottom: "10px"}}>ID: {userId}</div>
                <div className={styles.callButton}>
                    {callAccepted && !callEnded && (<Button variant="contained" color="secondary" onClick={() => leaveCall()}>End Call</Button>)}
                </div>
            </div>
        </div>
    )
}