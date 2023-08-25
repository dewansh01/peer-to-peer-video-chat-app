//find error in code
// let APP_Id = "b25e710c983642b2bc10cad111d753f6";
// let token = null;
// let uid = String(Math.floor(Math.random()*10000))


let APP_Id = "b25e710c983642b2bc10cad111d753f6";
let token = null;
let uid = String(Math.floor(Math.random()*10000))

let localStream ;
let remoteStream ;
let peerConnection ;



let client;
let channel;

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302']
        }
    ]
}


let init = async () =>{
    // get local stream, show it in self-view and add it to be sent
    client = await AgoraRTM.createInstance(APP_Id);
    await client.login({uid,token});

    channel = client.createChannel('main');

    await channel.join();


    channel.on('MemberJoined',handleUserJoined);

    client.on('MessageFromPeer',handleMessageFromPeer);

    localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
    document.getElementById('user-1').srcObject = localStream;
    createOffer();
}

let handleMessageFromPeer = async (message, memberId) => {
    message = JSON.parse(message.text);
    if (message.type === 'offer') {
        createAnswer(memberId, message.offer);
    }
    if (message.type === 'answer') {
        addAnswer(message.answer);
    }
    if (message.type === 'candidate') {
        if (peerConnection) {
            peerConnection.addIceCandidate(message.candidate);
        }
    }
}


let handleUserJoined = async (memberId) =>{
    console.log(memberId + ' : A new user has joined');
    createOffer(memberId);
}

let createPeerConnection = async (memberId) =>{
    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();
    document.getElementById('user-2').srcObject = remoteStream;

    if(!localStream){
        localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
        document.getElementById('user-1').srcObject=localStream;
    }
    // adding local stream to peer connection
    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
    
    //listening for remote stream
    peerConnection.ontrack = (event) =>{
        event.streams[0].getTracks().forEach((track)=>{
            remoteStream.addTrack(track);
        })
    }

    peerConnection.onicecandidate = async (event) =>{
        if(event.candidate){
            client.sendMessageToPeer({text:JSON.stringify({'type':'candidate','candidate':event.candidate})},memberId);
        }
    }
}


//connecting two peers together
let createOffer = async (memberId) =>{
    
    await createPeerConnection(memberId);
    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer)
    client.sendMessageToPeer({text:JSON.stringify(
        {'type':'offer','offer':offer}
    )},memberId);
}

let createAnswer = async(memberId,offer)=>{
    await createPeerConnection(memberId);
    await peerConnection.setRemoteDescription(offer);

    let answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    client.sendMessageToPeer({text:JSON.stringify(
        {'type':'answer','answer':answer}
    )},memberId);
}

let addAnswer = async (answer) => {
    if (peerConnection && !peerConnection.currentRemoteDescription) {
        await peerConnection.setRemoteDescription(answer);
    }
}


init();